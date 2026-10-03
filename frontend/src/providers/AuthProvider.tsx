import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import axios from 'axios'
import { TOKEN_KEY } from '../api/client'
import { getMe, type Me } from '../api/me'

type Status = 'signed-out' | 'loading' | 'not-invited' | 'removed' | 'error' | 'ready'

interface AuthContextValue {
  status: Status
  me: Me | null
  login: (token: string) => void
  logout: () => void
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
  const [me, setMe] = useState<Me | null>(null)
  const [status, setStatus] = useState<Status>(token ? 'loading' : 'signed-out')

  const refresh = useCallback(async () => {
    try {
      setMe(await getMe())
      setStatus('ready')
    } catch (err) {
      setMe(null)
      const code = axios.isAxiosError(err) ? err.response?.data?.error : null
      setStatus(code === 'not_invited' ? 'not-invited' : code === 'removed' ? 'removed' : 'error')
    }
  }, [])

  useEffect(() => {
    if (token) refresh()
  }, [token, refresh])

  const login = (t: string) => {
    localStorage.setItem(TOKEN_KEY, t)
    setStatus('loading')
    setToken(t)
  }

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setMe(null)
    setStatus('signed-out')
  }

  return (
    <AuthContext.Provider value={{ status, me, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

// For pages behind RequireUser, where `me` is always loaded.
export function useMe(): Me {
  const { me } = useAuth()
  if (!me) throw new Error('useMe must be used behind RequireUser')
  return me
}
