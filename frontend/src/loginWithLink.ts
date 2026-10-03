export function loginUrl(returnTo: string = window.location.pathname): string {
  const key = import.meta.env.LWL_KEY as string
  return `https://login-with.link/login/${key}?state=${encodeURIComponent(returnTo)}`
}
