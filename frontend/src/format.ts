export function formatBytes(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(2)} GB`
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(bytes >= 1e8 ? 0 : 1)} MB`
  if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(0)} KB`
  return `${bytes} B`
}

export function timeAgo(iso: string): string {
  const seconds = (Date.now() - new Date(iso).getTime()) / 1000
  if (seconds < 60) return 'just now'
  const [n, unit] =
    seconds < 3600 ? [seconds / 60, 'min'] :
    seconds < 86400 ? [seconds / 3600, 'h'] :
    seconds < 86400 * 7 ? [seconds / 86400, 'd'] :
    seconds < 86400 * 30 ? [seconds / (86400 * 7), 'w'] :
    seconds < 86400 * 365 ? [seconds / (86400 * 30), 'mo'] : [seconds / (86400 * 365), 'y']
  return `${Math.floor(n)}${unit} ago`
}

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

export const plural = (n: number, word: string) => `${n.toLocaleString()} ${word}${n === 1 ? '' : 's'}`

export const peopleCount = (n: number) => (n === 1 ? '1 person' : `${n.toLocaleString()} people`)
