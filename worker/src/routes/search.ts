import { Hono } from 'hono'
import { and, desc, eq, sql } from 'drizzle-orm'
import { getDb } from '../db/client'
import { folders, images } from '../db/schema'
import { imageJson } from '../serialize'
import type { AppEnv } from '../types'

export const searchRoutes = new Hono<AppEnv>()

// Matches folder and image names only.
searchRoutes.get('/', async (c) => {
  const user = c.get('user')
  const db = getDb(c.env)
  const q = (c.req.query('q') ?? '').trim()
  if (!q) return c.json({ folders: [], images: [] })

  const pattern = '%' + q.replace(/[\\%_]/g, m => '\\' + m) + '%'
  const [folderRows, imageRows] = await Promise.all([
    db.select({ id: folders.id, name: folders.name }).from(folders)
      .where(and(eq(folders.user_id, user.id), sql`${folders.name} like ${pattern} escape '\\'`))
      .orderBy(folders.name).limit(20),
    db.select().from(images)
      .where(and(eq(images.user_id, user.id), sql`${images.name} like ${pattern} escape '\\'`))
      .orderBy(desc(images.created_at)).limit(60),
  ])

  const protocol = new URL(c.req.url).protocol
  return c.json({ folders: folderRows, images: imageRows.map(i => imageJson(i, c.env.APP_HOST, protocol)) })
})
