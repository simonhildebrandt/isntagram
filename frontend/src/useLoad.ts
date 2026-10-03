import { useCallback, useEffect, useState, type DependencyList } from 'react'
import { errorMessage } from './api/client'

// Loads data for a page, reloading when `deps` change or `reload` is called.
export function useLoad<T>(load: () => Promise<T>, deps: DependencyList) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let cancelled = false
    setError(null)
    load().then(
      d => { if (!cancelled) setData(d) },
      e => { if (!cancelled) setError(errorMessage(e)) },
    )
    return () => { cancelled = true }
  }, [...deps, version])

  const reload = useCallback(() => setVersion(v => v + 1), [])
  return { data, error, reload }
}
