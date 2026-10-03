import { api } from './client'

export interface Me {
  sponsorEmail: string | null
  email: string
  handle: string | null
  quotaBytes: number
  usedBytes: number
  allocatedBytes: number
  availableBytes: number
  linkHost: string | null
}

export const getMe = () => api.get<Me>('/me').then(r => r.data)

export const checkHandle = (handle: string) =>
  api.get<{ available: boolean; problem?: string }>('/me/handle-check', { params: { handle } }).then(r => r.data)

export const setHandle = (handle: string) =>
  api.put<{ handle: string; linkHost: string }>('/me/handle', { handle }).then(r => r.data)
