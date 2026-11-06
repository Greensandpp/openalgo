/** Opt-in device persistence of the separate gateway bearer token only.
 * AES-GCM key is non-exportable and stored in browser IndexedDB; ciphertext is
 * stored next to it. No Gemini or ElevenLabs provider API keys are handled here.
 * This defends against plain storage inspection, NOT malicious same-origin JS
 * or someone using an already-unlocked phone/browser profile.
 */
const DB = 'gs-jarvis-pairing-v1'
const STORE = 'pairing'
const KEY = 'device-key'
const DATA = 'credential'
type Sealed = {version:1; iv:number[]; bytes:number[]}

function openDb():Promise<IDBDatabase> {
  return new Promise((resolve,reject)=>{
    const request = indexedDB.open(DB,1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? Error('IndexedDB unavailable'))
  })
}
async function transact<T>(operation:(store:IDBObjectStore,ok:(value:T)=>void,fail:(reason?:unknown)=>void)=>void,mode:IDBTransactionMode):Promise<T> {
  const db = await openDb()
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,mode)
    let value:T
    let settled=false
    const ok=(next:T)=>{value=next}
    const fail=(reason?:unknown)=>{settled=true;reject(reason)}
    tx.oncomplete=()=>{db.close();if(!settled)resolve(value)}
    tx.onerror=()=>{db.close();if(!settled)reject(tx.error)}
    tx.onabort=()=>{db.close();if(!settled)reject(tx.error)}
    operation(tx.objectStore(STORE),ok,fail)
  })
}
async function readRecord<T>(name:string):Promise<T|undefined> {
  return transact<T|undefined>((store,ok,fail)=>{
    const r=store.get(name)
    r.onsuccess=()=>ok(r.result as T|undefined)
    r.onerror=()=>fail(r.error)
  },'readonly')
}
async function putRecord(name:string,value:unknown):Promise<void> {
  return transact<void>((store,ok,fail)=>{
    const r=store.put(value,name)
    r.onsuccess=()=>ok()
    r.onerror=()=>fail(r.error)
  },'readwrite')
}
export async function forgetDevicePairing():Promise<void> {
  return transact<void>((store,ok,fail)=>{
    const r=store.clear()
    r.onsuccess=()=>ok()
    r.onerror=()=>fail(r.error)
  },'readwrite')
}
export async function saveDevicePairing(token:string):Promise<void> {
  if (!crypto.subtle || token.length<32 || token.length>200) throw Error('Pairing not eligible for device storage')
  let key=await readRecord<CryptoKey>(KEY)
  if (!key) {
    key=await crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt'])
    await putRecord(KEY,key)
  }
  const iv=crypto.getRandomValues(new Uint8Array(12))
  const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(token))
  const sealed:Sealed={version:1,iv:Array.from(iv),bytes:Array.from(new Uint8Array(encrypted))}
  await putRecord(DATA,sealed)
}
export async function restoreDevicePairing():Promise<string|null> {
  if (!crypto.subtle) return null
  const key=await readRecord<CryptoKey>(KEY)
  const sealed=await readRecord<Sealed>(DATA)
  if (!key || sealed?.version!==1 || !Array.isArray(sealed.iv) || !Array.isArray(sealed.bytes) ||
      sealed.iv.length!==12 || sealed.bytes.length>256) return null
  const decrypted=await crypto.subtle.decrypt({name:'AES-GCM',iv:new Uint8Array(sealed.iv)},key,new Uint8Array(sealed.bytes))
  const token=new TextDecoder().decode(decrypted)
  return token.length>=32 && token.length<=200 ? token : null
}
