/** Device-local greeting. Never accesses gateway, costs no voice credits. */
export function jarvisGreeting(hour:number):string {
  if (hour>=5 && hour<12) return 'Good morning, Boss. Welcome back to GreenSoil JARVIS.'
  if (hour>=12 && hour<17) return 'Good afternoon, Boss. Welcome back to GreenSoil JARVIS.'
  if (hour>=17 && hour<22) return 'Good evening, Boss. Welcome back to GreenSoil JARVIS.'
  return 'Hey Boss, welcome back. GreenSoil JARVIS is ready.'
}
