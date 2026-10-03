// Handles become subdomains of APP_HOST, so they must be valid DNS labels.
const HANDLE_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/

const RESERVED = new Set([
  'www', 'app', 'api', 'admin', 'mail', 'static', 'assets', 'cdn', 'img', 'images', 'media',
  'files', 'auth', 'login', 'account', 'help', 'support', 'status', 'blog', 'docs', 'dev',
  'staging', 'test', 'smtp', 'imap', 'pop', 'ftp', 'ns1', 'ns2', 'root', 'isntagram',
])

export function handleProblem(handle: string): string | null {
  if (!HANDLE_PATTERN.test(handle)) {
    return 'Use 1–63 lowercase letters, numbers or hyphens, not starting or ending with a hyphen.'
  }
  // "xx--" prefixes are reserved for internationalised domain names.
  if (handle.slice(2, 4) === '--') return 'Handles can\'t have hyphens in the third and fourth characters.'
  if (RESERVED.has(handle)) return 'That handle is reserved.'
  return null
}

export function handleFromHost(host: string, appHost: string): string | null {
  const suffix = '.' + appHost
  if (!host.endsWith(suffix)) return null
  const label = host.slice(0, -suffix.length)
  return label.includes('.') ? null : label
}
