import { Hono } from 'hono'
import { and, eq } from 'drizzle-orm'
import { getDb } from '../db/client'
import { folders, images, type User } from '../db/schema'
import { getUsage } from '../quota'
import { storeImage, UploadError } from '../storage'
import { imageJson } from '../serialize'
import { ownedFolder } from './folders'
import type { AppEnv } from '../types'

type Db = ReturnType<typeof getDb>

export const imageRoutes = new Hono<AppEnv>()

const now = () => new Date().toISOString()

function ownedImage(db: Db, user: User, id: number) {
  return db.query.images.findFirst({ where: and(eq(images.id, id), eq(images.user_id, user.id)) })
}

imageRoutes.get('/:id', async (c) => {
  const db = getDb(c.env)
  const image = await ownedImage(db, c.get('user'), Number(c.req.param('id')))
  if (!image) return c.json({ error: 'Image not found.' }, 404)

  const folder = await db.query.folders.findFirst({ where: eq(folders.id, image.folder_id) })
  return c.json({
    ...imageJson(image, c.env.APP_HOST, new URL(c.req.url).protocol),
    folder: { id: folder!.id, name: folder!.name },
  })
})

// Moving keeps the image's URL: paths are fixed at upload.
imageRoutes.patch('/:id', async (c) => {
  const user = c.get('user')
  const db = getDb(c.env)
  const image = await ownedImage(db, user, Number(c.req.param('id')))
  if (!image) return c.json({ error: 'Image not found.' }, 404)

  const { folderId } = await c.req.json<{ folderId?: unknown }>()
  const target = typeof folderId === 'number' ? await ownedFolder(db, user, folderId) : undefined
  if (!target) return c.json({ error: 'Folder not found.' }, 404)

  await db.batch([
    db.update(images).set({ folder_id: target.id, updated_at: now() }).where(eq(images.id, image.id)),
    db.update(folders).set({ updated_at: now() }).where(eq(folders.id, target.id)),
  ])
  return c.json({ id: image.id, folderId: target.id })
})

// Replacing swaps the stored file but keeps the URL (including its extension).
imageRoutes.put('/:id/file', async (c) => {
  const user = c.get('user')
  const db = getDb(c.env)
  const image = await ownedImage(db, user, Number(c.req.param('id')))
  if (!image) return c.json({ error: 'Image not found.' }, 404)

  const width = Number(c.req.query('width'))
  const height = Number(c.req.query('height'))
  if (!(Number.isInteger(width) && width > 0 && Number.isInteger(height) && height > 0)) {
    return c.json({ error: 'Missing image dimensions.' }, 400)
  }

  const length = Number(c.req.header('content-length'))
  const usage = await getUsage(db, user)
  if (length > usage.availableBytes + image.size_bytes) return c.json({ error: 'Not enough storage space left.' }, 413)

  const key = `originals/${crypto.randomUUID()}`
  let contentType: string
  try {
    contentType = await storeImage(c.env.BUCKET, key, c.req.raw.body, length)
  } catch (e) {
    if (e instanceof UploadError) return c.json({ error: e.message }, e.status)
    throw e
  }

  const [updated] = await db.update(images).set({
    r2_key: key, content_type: contentType, size_bytes: length, width, height, updated_at: now(),
  }).where(eq(images.id, image.id)).returning()
  await c.env.BUCKET.delete(image.r2_key)
  return c.json(imageJson(updated, c.env.APP_HOST, new URL(c.req.url).protocol))
})

imageRoutes.delete('/:id', async (c) => {
  const db = getDb(c.env)
  const image = await ownedImage(db, c.get('user'), Number(c.req.param('id')))
  if (!image) return c.json({ error: 'Image not found.' }, 404)

  await db.batch([
    db.delete(images).where(eq(images.id, image.id)),
    db.update(folders).set({ updated_at: now() }).where(eq(folders.id, image.folder_id)),
  ])
  await c.env.BUCKET.delete(image.r2_key)
  return c.body(null, 204)
})
