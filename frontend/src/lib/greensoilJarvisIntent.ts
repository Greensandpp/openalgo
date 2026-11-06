/** Local, offline-safe multilingual command routing for the read-only PAPER dashboard.
 * This is not an AI model. Unrecognized conversational requests go to the
 * authenticated Gemini gateway only when paired. Never place orders.
 */
export type JarvisIntent =
  | {kind:'open_chart'; symbol:'NIFTY'|'SENSEX'}
  | {kind:'close_chart'}
  | {kind:'unavailable_news'}
  | {kind:'unavailable_market'}
  | {kind:'conversation'}

export function parseJarvisIntent(utterance: string, currentSymbol:'NIFTY'|'SENSEX'='NIFTY'):JarvisIntent {
  const x = utterance.normalize('NFKC').toLocaleLowerCase().replace(/[.,!?]/g,' ').replace(/\s+/g,' ').trim()
  if (!x) return {kind:'conversation'}

  // Guard live advice BEFORE navigating: "NIFTY next target" is NOT a chart request.
  const marketQuestion = /(target|targ[ea]t|entry|enter|buy|sell|stop\s?loss|\bsl\b|\btp\d?\b|premium|option\s?chain|expiry|reversal|trade\s+signal|trade\s+idea|next\s+level|current\s+price|live\s+price|\bprice\b|டார்கெட்|என்ட்ரி|விலை|லாபம்)/u.test(x)
  if (marketQuestion) return {kind:'unavailable_market'}
  if (/(latest\s+news|live\s+news|headlines|todays?\s+news|today.?s\s+news|news|செய்தி|நியூஸ்)/u.test(x))
    return {kind:'unavailable_news'}

  // Explicit exit wins over broad chart references; requires action verb + navigation target.
  const closeAction = /(back|home|exit|close|normal|return|go\s+back|thirumbi|thirumba|moodu|mudidu|poidu|வெளியே|மூடு|திரும்ப|ஹோம்)/u.test(x)
  const homeTarget = /(jarvis|greensoil|core|home|main\s+screen|trading\s+mode|trade\s+mode|chart|dashboard|ஜார்விஸ்|ஹோம்|சார்ட்)/u.test(x)
  if (closeAction && homeTarget && !/(open|show|activate|start)/u.test(x)) return {kind:'close_chart'}

  const sensex = /(sensex|சென்செக்ஸ்|சென்செக்சு|சென்சக்ஸ்|sensax|sensecks)/u.test(x)
  const nifty = /(nifty|நிஃப்டி|நிப்டி|நிப்டீ|nifti)/u.test(x)
  const target = sensex ? 'SENSEX' : nifty ? 'NIFTY' : currentSymbol
  const chartTerm = /(trading|trade|market|chart|dashboard|tradingview|trading\s+view|graph|trading\s+mode|trade\s+mode|சார்ட்|டிரேடிங்|சந்தை)/u.test(x)
  const openAction = /(open|show|activate|start|launch|display|switch|change|take\s+me|go\s+to|kattu|kaatu|kat[u]?|pannu|thira|thera|podu|venum|வேணும்|காட்டு|திற|போடு|தொடங்கு|ஓபன்)/u.test(x)
  // Bare symbol and "trading mode" are intentional navigation commands.
  if (openAction && (chartTerm || sensex || nifty)) return {kind:'open_chart',symbol:target}
  if (/^(?:jarvis\s+)?(?:nifty|sensex|நிஃப்டி|சென்செக்ஸ்|trading\s+mode|trade\s+mode)$/u.test(x))
    return {kind:'open_chart',symbol:target}
  return {kind:'conversation'}
}
