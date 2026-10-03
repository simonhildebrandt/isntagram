import { api } from './client'

export type Fit = 'inside' | 'crop'
export type Format = 'keep' | 'webp' | 'jpeg'

export interface Preset {
  id: number
  name: string
  width: number
  height: number | null
  fit: Fit
  format: Format
  isDefault: boolean
  updatedAt: string
  folderCount?: number
  imageCount?: number
}

export type PresetInput = Pick<Preset, 'name' | 'width' | 'height' | 'fit' | 'format' | 'isDefault'>

export const listPresets = () => api.get<Preset[]>('/presets').then(r => r.data)
export const createPreset = (p: PresetInput) => api.post<Preset>('/presets', p).then(r => r.data)
export const updatePreset = (id: number, p: Omit<PresetInput, 'name' | 'format'>) => api.patch<Preset>(`/presets/${id}`, p).then(r => r.data)
export const deletePreset = (id: number) => api.delete(`/presets/${id}`)

export const setFolderPresets = (folderId: number, presetIds: number[]) => api.put(`/folders/${folderId}/presets`, { presetIds })
export const setImagePresets = (imageId: number, presetIds: number[]) => api.put(`/images/${imageId}/presets`, { presetIds })

export const describeDims = (p: Pick<Preset, 'width' | 'height'>) => p.height ? `${p.width} × ${p.height}` : `${p.width} wide`
export const describeFit = (p: Pick<Preset, 'height' | 'fit'>) => !p.height ? 'Keep proportions' : p.fit === 'crop' ? 'Crop to fill' : 'Fit inside'
export const describeFormat = (p: Pick<Preset, 'format'>) => ({ keep: 'Keep format', webp: 'WebP', jpeg: 'JPEG' })[p.format]
