import { and, eq } from 'drizzle-orm'
import { getDb } from './db/client'
import { images } from './db/schema'
import type { Env } from './types'

const notFound = () => new Response('Not found', { status: 404 })

// Public image links: {handle}.APP_HOST/{path_stem}.{ext}
export async function serveImage(request: Request, env: Env, handle: string): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', { status: 405 })

  let path: string
  try {
    path = decodeURIComponent(new URL(request.url).pathname.slice(1))
  } catch {
    return notFound()
  }
  const match = path.match(/^(.+)\.([a-z0-9]+)$/)
  if (!match) return notFound()
  const [, stem, ext] = match
  // Scaled sizes ({stem}@{preset}.{ext}) arrive in slice 3.
  if (stem.includes('@')) return notFound()

  const image = await getDb(env).query.images.findFirst({
    where: and(eq(images.link_handle, handle), eq(images.path_stem, stem)),
  })
  if (!image || image.ext !== ext) return notFound()

  const object = await env.BUCKET.get(image.r2_key, { onlyIf: request.headers })
  if (!object) return notFound()

  const headers = new Headers({
    'Content-Type': image.content_type,
    'ETag': object.httpEtag,
    'Cache-Control': 'public, max-age=3600',
    'Access-Control-Allow-Origin': '*',
    // Uploads are checked to be images, but never let a browser treat one as anything else.
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'",
  })
  // R2 returns the object without a body when the request's If-None-Match matched.
  if (!('body' in object)) return new Response(null, { status: 304, headers })
  return new Response(request.method === 'HEAD' ? null : object.body, { headers })
}
