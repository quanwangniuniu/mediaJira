const STORAGE_KEY = 'agent-debug-mode'

export function getDebugMode(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(STORAGE_KEY) === 'true' // default off
}

export function setDebugMode(enabled: boolean): void {
  localStorage.setItem(STORAGE_KEY, String(enabled))
}

export function debugLog(label: string, ...args: unknown[]): void {
  if (!getDebugMode()) return
  console.log(`[Agent Debug] ${label}`, ...args)
}
