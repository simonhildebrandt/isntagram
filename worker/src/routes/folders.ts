import { Hono } from 'hono'
import { and, desc, eq, sql } from 'drizzle-orm'
import { getDb } from '../db/client'
import { folders, images, type Folder, type User } from '../db/schema'
import { freeFolderSlug, freeImageStem } from '../paths'
import { getUsage } from '../quota'
import { extensionFor, storeImage, UploadError } from '../storage'
import { folderJson, imageJson, imageUrl } from '../serialize'
import type { AppEnv } from '../types'

type Db = ReturnType<typeof getDb>

export const folderRoutes = new Hono<AppEnv>()

export async function ownedFolder(db: Db, user: User, id: number): Promise<Folder | undefined> {
  return db.query.folders.findFirst({ where: and(eq(folders.id, id), eq(folders.user_id, user.id)) })
}

const now = () => new Date().toISOString()

folderRoutes.get('/', async (c) => {
  const user = c.get('user')
  const db = getDb(c.env)
  const protocol = new URL(c.req.url).protocol

  const [rows, stats, covers] = await Promise.all([
    db.select().from(folders).where(eq(folders.user_id, user.id)).orderBy(desc(folders.updated_at)),
    db.select({
      folderId: images.folder_id,
      imageCount: sql<number>`count(*)`,
      sizeBytes: sql<number>`sum(${images.size_bytes})`,
    }).from(images).where(eq(images.user_id, user.id)).groupBy(images.folder_id),
    // The three newest images in each folder, for the folder card.
    c.env.DB.prepare(`
      select folder_id, link_handle, path_stem, ext from (
        select *, row_number() over (partition by folder_id order by created_at desc) as n
        from images where user_id = ?
      ) where n <= 3 order by folder_id, n
    `).bind(user.id).all<{ folder_id: number; link_handle: string; path_stem: string; ext: string }>(),
  ])

  const statsById = new Map(stats.map(s => [s.folderId, s]))
  const coversById = new Map<number, string[]>()
  for (const row of covers.results) {
    const list = coversById.get(row.folder_id) ?? []
    list.push(imageUrl(row, c.env.APP_HOST, protocol))
    coversById.set(row.folder_id, list)
  }

  return c.json(rows.map(f => folderJson(f, statsById.get(f.id) ?? { imageCount: 0, sizeBytes: 0 }, coversById.get(f.id) ?? [])))
})

folderRoutes.post('/', async (c) => {
  const user = c.get('user')
  const db = getDb(c.env)
  const { name } = await c.req.json<{ name?: unknown }>()
  if (typeof name !== 'string' || !name.trim()) return c.json({ error: 'Give the folder a name.' }, 400)

  const slug = await freeFolderSlug(db, user.id, name.trim())
  const [folder] = await db.insert(folders).values({
    user_id: user.id, name: name.trim(), slug, created_at: now(), updated_at: now(),
  }).returning()
  return c.json(folderJson(folder, { imageCount: 0, sizeBytes: 0 }, []), 201)
})

folderRoutes.get('/:id', async (c) => {
  const db = getDb(c.env)
  const folder = await ownedFolder(db, c.get('user'), Number(c.req.param('id')))
  if (!folder) return c.json({ error: 'Folder not found.' }, 404)

  const protocol = new URL(c.req.url).protocol
  const rows = await db.select().from(images).where(eq(images.folder_id, folder.id)).orderBy(desc(images.created_at))
  const sizeBytes = rows.reduce((sum, i) => sum + i.size_bytes, 0)
  return c.json({
    ...folderJson(folder, { imageCount: rows.length, sizeBytes }, []),
    images: rows.map(i => imageJson(i, c.env.APP_HOST, protocol)),
  })
})

// Renaming changes the path used for future uploads only; existing links keep their old path.
folderRoutes.patch('/:id', async (c) => {
  const user = c.get('user')
  const db = getDb(c.env)
  const folder = await ownedFolder(db, user, Number(c.req.param('id')))
  if (!folder) return c.json({ error: 'Folder not found.' }, 404)

  const { name } = await c.req.json<{ name?: unknown }>()
  if (typeof name !== 'string' || !name.trim()) return c.json({ error: 'Give the folder a name.' }, 400)

  const slug = await freeFolderSlug(db, user.id, name.trim(), folder.id)
  await db.update(folders).set({ name: name.trim(), slug, updated_at: now() }).where(eq(folders.id, folder.id))
  return c.json({ id: folder.id, name: name.trim(), slug })
})

folderRoutes.delete('/:id', async (c) => {
  const db = getDb(c.env)
  const folder = await ownedFolder(db, c.get('user'), Number(c.req.param('id')))
  if (!folder) return c.json({ error: 'Folder not found.' }, 404)

  const keys = (await db.select({ key: images.r2_key }).from(images).where(eq(images.folder_id, folder.id))).map(r => r.key)
  // Rows go first: a stray R2 object is harmless, a row pointing at nothing isn't.
  await db.batch([
    db.delete(images).where(eq(images.folder_id, folder.id)),
    db.delete(folders).where(eq(folders.id, folder.id)),
  ])
  for (let i = 0; i < keys.length; i += 1000) await c.env.BUCKET.delete(keys.slice(i, i + 1000))
  return c.body(null, 204)
})

folderRoutes.post('/:id/images', async (c) => {
  const user = c.get('user')
  const db = getDb(c.env)
  const folder = await ownedFolder(db, user, Number(c.req.param('id')))
  if (!folder) return c.json({ error: 'Folder not found.' }, 404)

  const name = c.req.query('name')?.trim()
  const width = Number(c.req.query('width'))
  const height = Number(c.req.query('height'))
  if (!name) return c.json({ error: 'Missing file name.' }, 400)
  if (!(Number.isInteger(width) && width > 0 && Number.isInteger(height) && height > 0)) {
    return c.json({ error: 'Missing image dimensions.' }, 400)
  }

  const length = Number(c.req.header('content-length'))
  const usage = await getUsage(db, user)
  if (length > usage.availableBytes) return c.json({ error: 'Not enough storage space left.' }, 413)

  const key = `originals/${crypto.randomUUID()}`
  let contentType: string
  try {
    contentType = await storeImage(c.env.BUCKET, key, c.req.raw.body, length)
  } catch (e) {
    if (e instanceof UploadError) return c.json({ error: e.message }, e.status)
    throw e
  }

  try {
    const image = await insertImage(db, {
      user_id: user.id, folder_id: folder.id, link_handle: user.handle!, ext: extensionFor(contentType),
      name, r2_key: key, content_type: contentType, size_bytes: length, width, height,
      created_at: now(), updated_at: now(),
    }, folder.slug)
    await db.update(folders).set({ updated_at: now() }).where(eq(folders.id, folder.id))
    return c.json(imageJson(image, c.env.APP_HOST, new URL(c.req.url).protocol), 201)
  } catch (e) {
    await c.env.BUCKET.delete(key)
    throw e
  }
})

// Picks a free path for the image; retries if a simultaneous upload claims the same one.
async function insertImage(db: Db, values: Omit<typeof images.$inferInsert, 'path_stem'>, folderSlug: string) {
  for (let attempt = 0; ; attempt++) {
    const path_stem = await freeImageStem(db, values.link_handle, folderSlug, values.name)
    try {
      const [image] = await db.insert(images).values({ ...values, path_stem }).returning()
      return image
    } catch (e) {
      if (attempt < 3 && String(e).includes('UNIQUE')) continue
      throw e
    }
  }
}
