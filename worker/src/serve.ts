import { and, eq, sql } from 'drizzle-orm'
import { getDb } from './db/client'
import { images, presets, type Image } from './db/schema'
import { GRID_PRESET, outputExt, outputType, transformFor, type PresetShape } from './presets'
import type { Env } from './types'

const notFound = () => new Response('Not found', { status: 404 })

const BROWSER_CACHE = 'public, max-age=3600'
const EDGE_CACHE = 'public, max-age=31536000, immutable'

function baseHeaders(contentType: string): Headers {
  return new Headers({
    'Content-Type': contentType,
    'Cache-Control': BROWSER_CACHE,
    'Access-Control-Allow-Origin': '*',
    // Uploads are checked to be images, but never let a browser treat one as anything else.
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'",
  })
}

// Public image links on {handle}.APP_HOST:
//   /{path_stem}.{ext}           the original
//   /{path_stem}@{preset}.{ext}  a size, if that preset is applied to the image
export async function serveImage(request: Request, env: Env, ctx: ExecutionContext, handle: string): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', { status: 405 })

  let path: string
  try {
    path = decodeURIComponent(new URL(request.url).pathname.slice(1))
  } catch {
    return notFound()
  }
  const match = path.match(/^([^@]+?)(?:@([a-z0-9_-]+))?\.([a-z0-9]+)$/)
  if (!match) return notFound()
  const [, stem, presetName, ext] = match

  const db = getDb(env)
  const image = await db.query.images.findFirst({
    where: and(eq(images.link_handle, handle), eq(images.path_stem, stem)),
  })
  if (!image) return notFound()

  if (!presetName) {
    if (ext !== image.ext) return notFound()
    return serveOriginal(request, env, image)
  }

  const preset = presetName === GRID_PRESET.name ? GRID_PRESET : await appliedPreset(db, image, presetName)
  if (!preset || ext !== outputExt(preset, image)) return notFound()
  return serveSize(request, env, ctx, image, preset, ext)
}

async function serveOriginal(request: Request, env: Env, image: Image): Promise<Response> {
  const object = await env.BUCKET.get(image.r2_key, { onlyIf: request.headers })
  if (!object) return notFound()

  const headers = baseHeaders(image.content_type)
  headers.set('ETag', object.httpEtag)
  // R2 returns the object without a body when the request's If-None-Match matched.
  if (!('body' in object)) return new Response(null, { status: 304, headers })
  return new Response(request.method === 'HEAD' ? null : object.body, { headers })
}

function appliedPreset(db: ReturnType<typeof getDb>, image: Image, name: string) {
  return db.query.presets.findFirst({
    where: and(
      eq(presets.user_id, image.user_id),
      eq(presets.name, name),
      sql`(exists (select 1 from folder_presets where folder_id = ${image.folder_id} and preset_id = ${presets.id})
        or exists (select 1 from image_presets where image_id = ${image.id} and preset_id = ${presets.id}))`,
    ),
  })
}

// Sizes are generated on demand and kept in the edge cache. The cache key includes when the image
// and preset last changed, so replacing a file or editing a preset never serves a stale copy.
async function serveSize(
  request: Request, env: Env, ctx: ExecutionContext, image: Image, preset: PresetShape & { updated_at: string }, ext: string,
): Promise<Response> {
  const version = `${image.updated_at}|${preset.updated_at}`
  const etag = `"${btoa(version).replace(/=+$/, '')}"`
  const headers = baseHeaders(outputType(ext))
  headers.set('ETag', etag)
  if (request.headers.get('If-None-Match') === etag) return new Response(null, { status: 304, headers })

  const url = new URL(request.url)
  const cacheKey = new Request(`${url.origin}${url.pathname}?v=${encodeURIComponent(version)}`)
  const cache = caches.default
  let body: ReadableStream | null

  const cached = await cache.match(cacheKey)
  if (cached) {
    body = cached.body
  } else {
    const original = await env.BUCKET.get(image.r2_key)
    if (!original) return notFound()
    const result = await env.IMAGES.input(original.body)
      .transform(transformFor(preset))
      .output({ format: outputType(ext), quality: 85 })
    const [forClient, forCache] = result.image().tee()
    body = forClient
    const stored = new Headers(headers)
    stored.set('Cache-Control', EDGE_CACHE)
    ctx.waitUntil(cache.put(cacheKey, new Response(forCache, { headers: stored })))
  }
  return new Response(request.method === 'HEAD' ? null : body, { headers })
}
