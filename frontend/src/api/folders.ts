import { api } from './client'
import type { ImageSummary } from './images'

export interface FolderSummary {
  id: number
  name: string
  slug: string
  imageCount: number
  sizeBytes: number
  createdAt: string
  updatedAt: string
  coverUrls: string[]
}

export interface FolderDetail extends FolderSummary {
  images: ImageSummary[]
}

export const listFolders = () => api.get<FolderSummary[]>('/folders').then(r => r.data)
export const getFolder = (id: number) => api.get<FolderDetail>(`/folders/${id}`).then(r => r.data)
export const createFolder = (name: string) => api.post<FolderSummary>('/folders', { name }).then(r => r.data)
export const renameFolder = (id: number, name: string) => api.patch(`/folders/${id}`, { name })
export const deleteFolder = (id: number) => api.delete(`/folders/${id}`)
