import type { Folder, Image } from './db/schema'
import { GRID_PRESET, outputExt, type PresetShape } from './presets'

type LinkFields = Pick<Image, 'link_handle' | 'path_stem' | 'ext'>

// Public link for an image (or one of its sizes), on its owner's subdomain at the time it was uploaded.
export function imageUrl(image: LinkFields, appHost: string, protocol: string, preset?: Pick<PresetShape, 'name' | 'format'>): string {
  const base = `${protocol}//${image.link_handle}.${appHost}/${image.path_stem}`
  return preset ? `${base}@${preset.name}.${outputExt(preset, image)}` : `${base}.${image.ext}`
}

export const thumbUrl = (image: LinkFields, appHost: string, protocol: string) => imageUrl(image, appHost, protocol, GRID_PRESET)

export function imageJson(image: Image, appHost: string, protocol: string) {
  return {
    id: image.id,
    folderId: image.folder_id,
    name: image.name,
    url: imageUrl(image, appHost, protocol),
    thumbUrl: thumbUrl(image, appHost, protocol),
    contentType: image.content_type,
    sizeBytes: image.size_bytes,
    width: image.width,
    height: image.height,
    createdAt: image.created_at,
    updatedAt: image.updated_at,
  }
}

export function folderJson(folder: Folder, stats: { imageCount: number; sizeBytes: number }, coverUrls: string[], presetNames: string[]) {
  return {
    id: folder.id,
    name: folder.name,
    slug: folder.slug,
    imageCount: stats.imageCount,
    sizeBytes: stats.sizeBytes,
    createdAt: folder.created_at,
    updatedAt: folder.updated_at,
    coverUrls,
    presetNames,
  }
}
