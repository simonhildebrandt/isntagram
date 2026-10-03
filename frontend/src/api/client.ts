import axios from 'axios'

export const TOKEN_KEY = 'isntagram_token'

export const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY)
      window.location.href = '/login?error=auth'
    }
    return Promise.reject(err)
  }
)

// Pulls the server's error message out of a failed request.
export function errorMessage(err: unknown, fallback = 'Something went wrong.'): string {
  return axios.isAxiosError(err) && typeof err.response?.data?.error === 'string'
    ? err.response.data.error
    : fallback
}
