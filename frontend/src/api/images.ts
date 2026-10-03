import { api } from './client'

export interface ImageSummary {
  id: number
  folderId: number
  name: string
  url: string
  // Small WebP for grids and covers in the app.
  thumbUrl: string
  contentType: string
  sizeBytes: number
  width: number
  height: number
  createdAt: string
  updatedAt: string
}

export interface ImageSize {
  presetId: number
  name: string
  source: 'folder' | 'image'
  url: string
  width: number
  height: number
}

export interface ImageDetail extends ImageSummary {
  folder: { id: number; name: string }
  sizes: ImageSize[]
}

export interface ImageUpload {
  blob: Blob
  name: string
  width: number
  height: number
}

type Progress = (fraction: number) => void

export const getImage = (id: number) => api.get<ImageDetail>(`/images/${id}`).then(r => r.data)
export const moveImage = (id: number, folderId: number) => api.patch(`/images/${id}`, { folderId })
export const deleteImage = (id: number) => api.delete(`/images/${id}`)

// Files go up as the raw request body, so the Worker can stream them straight into R2.
export const uploadImage = (folderId: number, file: ImageUpload, onProgress?: Progress) =>
  api.post<ImageSummary>(`/folders/${folderId}/images`, file.blob, {
    params: { name: file.name, width: file.width, height: file.height },
    headers: { 'Content-Type': file.blob.type || 'application/octet-stream' },
    onUploadProgress: e => onProgress?.(e.total ? e.loaded / e.total : 0),
  }).then(r => r.data)

export const replaceImageFile = (id: number, file: ImageUpload, onProgress?: Progress) =>
  api.put<ImageSummary>(`/images/${id}/file`, file.blob, {
    params: { width: file.width, height: file.height },
    headers: { 'Content-Type': file.blob.type || 'application/octet-stream' },
    onUploadProgress: e => onProgress?.(e.total ? e.loaded / e.total : 0),
  }).then(r => r.data)

export const search = (q: string) =>
  api.get<{ folders: { id: number; name: string }[]; images: ImageSummary[] }>('/search', { params: { q } }).then(r => r.data)

// For showing an image in the app: the version parameter skips a stale browser copy after the file
// is replaced. Shared links never include it; the Worker ignores query strings.
export const previewUrl = (image: Pick<ImageSummary, 'url' | 'updatedAt'>, url = image.url) => `${url}?v=${Date.parse(image.updatedAt)}`
