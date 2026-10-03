import { unzip } from 'fflate'
import type { ImageUpload } from './api/images'

export const MAX_IMAGE_BYTES = 50 * 1000 * 1000

const TYPES: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', avif: 'image/avif',
}

export const IMAGE_ACCEPT = '.jpg,.jpeg,.png,.webp,.gif,.avif'
export const ACCEPT = `${IMAGE_ACCEPT},.zip`

const extension = (name: string) => name.split('.').pop()?.toLowerCase() ?? ''
export const isZip = (file: File) => extension(file.name) === 'zip'
export const imageType = (name: string): string | undefined => TYPES[extension(name)]

export async function readDimensions(blob: Blob): Promise<{ width: number; height: number }> {
  const bitmap = await createImageBitmap(blob)
  const size = { width: bitmap.width, height: bitmap.height }
  bitmap.close()
  return size
}

export async function prepareImage(blob: Blob, name: string): Promise<ImageUpload> {
  if (blob.size > MAX_IMAGE_BYTES) throw new Error('Larger than 50 MB')
  try {
    return { blob, name, ...await readDimensions(blob) }
  } catch {
    throw new Error('Not a readable image')
  }
}

// Unpacks a zip in the browser, keeping only images and flattening any directories.
export async function extractImages(zip: File): Promise<{ images: { blob: Blob; name: string }[]; skipped: number }> {
  const data = new Uint8Array(await zip.arrayBuffer())
  const entries = await new Promise<Record<string, Uint8Array>>((resolve, reject) =>
    unzip(data, (err, files) => (err ? reject(err) : resolve(files))))

  const images: { blob: Blob; name: string }[] = []
  let skipped = 0
  for (const [path, bytes] of Object.entries(entries)) {
    if (path.endsWith('/')) continue
    const name = path.split('/').pop()!
    const type = imageType(name)
    if (!type || path.startsWith('__MACOSX/') || name.startsWith('.')) {
      skipped++
      continue
    }
    images.push({ blob: new Blob([bytes as Uint8Array<ArrayBuffer>], { type }), name })
  }
  images.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
  return { images, skipped }
}
