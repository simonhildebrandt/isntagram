export const MAX_IMAGE_BYTES = 50 * 1000 * 1000

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif',
}

export const extensionFor = (contentType: string) => EXTENSIONS[contentType]

// Identifies the image type from its first bytes, so nothing but real images is ever stored
// and served, whatever the uploader claims.
function sniff(b: Uint8Array): string | null {
  const ascii = (from: number, to: number) => String.fromCharCode(...b.slice(from, to))
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg'
  if (b[0] === 0x89 && ascii(1, 4) === 'PNG') return 'image/png'
  if (ascii(0, 4) === 'GIF8') return 'image/gif'
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp'
  if (ascii(4, 8) === 'ftyp' && ['avif', 'avis'].includes(ascii(8, 12))) return 'image/avif'
  return null
}

export class UploadError extends Error {
  constructor(message: string, public status: 400 | 413 = 400) { super(message) }
}

// Checks the upload's type from its first bytes, then streams it into R2 without buffering it.
export async function storeImage(bucket: R2Bucket, key: string, body: ReadableStream<Uint8Array> | null, length: number): Promise<string> {
  if (!body || !length) throw new UploadError('The file is empty.')
  if (length > MAX_IMAGE_BYTES) throw new UploadError('Images can be up to 50 MB.', 413)

  const reader = body.getReader()
  let head = new Uint8Array(0)
  while (head.length < 12) {
    const { done, value } = await reader.read()
    if (done) break
    const joined = new Uint8Array(head.length + value.length)
    joined.set(head)
    joined.set(value, head.length)
    head = joined
  }
  const contentType = sniff(head)
  if (!contentType) {
    reader.cancel()
    throw new UploadError('Only JPG, PNG, WebP, GIF and AVIF images can be uploaded.')
  }

  const { readable, writable } = new FixedLengthStream(length)
  const pump = (async () => {
    const writer = writable.getWriter()
    await writer.write(head)
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      await writer.write(value)
    }
    await writer.close()
  })()
  await Promise.all([bucket.put(key, readable, { httpMetadata: { contentType } }), pump])
  return contentType
}
