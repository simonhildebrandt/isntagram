import { api } from './client'

export interface Person {
  id: number
  email: string
  handle: string | null
  quotaBytes: number
  createdAt: string
  activatedAt: string | null
  usedBytes: number
  imageCount: number
  allocatedBytes: number
  sponsoredCount: number
}

export const listPeople = () => api.get<Person[]>('/people').then(r => r.data)
export const invitePerson = (email: string, allowanceBytes: number) =>
  api.post<{ email: string; signInUrl: string }>('/people', { email, allowanceBytes }).then(r => r.data)
export const changeAllowance = (id: number, allowanceBytes: number) => api.patch(`/people/${id}`, { allowanceBytes })
export const removePerson = (id: number, images: 'move' | 'delete') => api.delete(`/people/${id}`, { params: { images } })
