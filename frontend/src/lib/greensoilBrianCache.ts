/** Small local replay cache for non-personal, pre-approved JARVIS phrases only.
 * No API keys, gateway tokens or user conversation content is stored.
 * Audio blobs are already-generated ElevenLabs responses, not voice models.
 */
const NAME='gs-brian-phrases-v1', STORE='clips'
const ALLOWED = new Set([
  'Hello Boss. Brian speaking.',
  'Good morning, Boss. Welcome back to GreenSoil JARVIS.',
  'Good afternoon, Boss. Welcome back to GreenSoil JARVIS.',
  'Good evening, Boss. Welcome back to GreenSoil JARVIS.',
  'Hey Boss, welcome back. GreenSoil JARVIS is ready.',
  'JARVIS core mode activated.',
  'Verified live news feed not connected. Current headlines cannot be confirmed.',
  'Verified live NSE and options data unavailable. No target or entry confirmation. NO TRADE.',
])
const TTL=30*24*60*60*1000
type Clip={audio:Blob; created:number}
export function isCacheableBrianPhrase(text:string):boolean {
  return ALLOWED.has(text)
}
async function dbOpen():Promise<IDBDatabase> {
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(NAME,1)
    req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE)}
    req.onsuccess=()=>resolve(req.result)
    req.onerror=()=>reject(req.error)
  })
}
async function transaction<T>(mode:IDBTransactionMode,work:(store:IDBObjectStore,done:(value:T)=>void)=>void):Promise<T>{
  const db=await dbOpen()
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,mode)
    let value:T
    tx.oncomplete=()=>{db.close();resolve(value)}
    tx.onerror=()=>{db.close();reject(tx.error)}
    tx.onabort=()=>{db.close();reject(tx.error)}
    work(tx.objectStore(STORE),v=>{value=v})
  })
}
export async function cachedBrianClip(text:string):Promise<Blob|null>{
  if(!isCacheableBrianPhrase(text))return null
  const entry=await transaction<Clip|undefined>('readonly',(store,done)=>{
    const r=store.get(text)
    r.onsuccess=()=>done(r.result as Clip|undefined)
  })
  if(!entry || Date.now()-entry.created>TTL || entry.created>Date.now()+60000 ||
     !(entry.audio instanceof Blob) || entry.audio.size<1 || entry.audio.size>384000 ||
     !entry.audio.type.startsWith('audio/'))return null
  return entry.audio
}
export async function saveBrianClip(text:string,audio:Blob):Promise<void>{
  if(!isCacheableBrianPhrase(text)||!audio.type.startsWith('audio/')||audio.size<1||audio.size>384000)return
  await transaction<void>('readwrite',(store,done)=>{
    const r=store.put({audio,created:Date.now()} satisfies Clip,text)
    r.onsuccess=()=>done()
  })
}
