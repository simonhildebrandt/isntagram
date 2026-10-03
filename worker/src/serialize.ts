import type { Folder, Image } from './db/schema'

// Public link for an image, on its owner's subdomain at the time it was uploaded.
export function imageUrl(image: Pick<Image, 'link_handle' | 'path_stem' | 'ext'>, appHost: string, protocol: string): string {
  return `${protocol}//${image.link_handle}.${appHost}/${image.path_stem}.${image.ext}`
}

export function imageJson(image: Image, appHost: string, protocol: string) {
  return {
    id: image.id,
    folderId: image.folder_id,
    name: image.name,
    url: imageUrl(image, appHost, protocol),
    contentType: image.content_type,
    sizeBytes: image.size_bytes,
    width: image.width,
    height: image.height,
    createdAt: image.created_at,
    updatedAt: image.updated_at,
  }
}

export function folderJson(folder: Folder, stats: { imageCount: number; sizeBytes: number }, coverUrls: string[]) {
  return {
    id: folder.id,
    name: folder.name,
    slug: folder.slug,
    imageCount: stats.imageCount,
    sizeBytes: stats.sizeBytes,
    createdAt: folder.created_at,
    updatedAt: folder.updated_at,
    coverUrls,
  }
}
