import { Hono } from 'hono'
import { and, eq, isNull, sql } from 'drizzle-orm'
import { getDb } from '../db/client'
import { images, users } from '../db/schema'
import { getUsage } from '../quota'
import { committedBytes, deleteObjects, removeSponsee, sponsee } from '../sponsorship'
import type { AppEnv } from '../types'

export const peopleRoutes = new Hono<AppEnv>()

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const isBytes = (v: unknown): v is number => Number.isInteger(v) && (v as number) > 0

// People this user sponsors directly, with how much of their allowance they've committed.
peopleRoutes.get('/', async (c) => {
  const db = getDb(c.env)
  const rows = await db.select({
    id: users.id,
    email: users.email,
    handle: users.handle,
    quotaBytes: users.quota_bytes,
    createdAt: users.created_at,
    activatedAt: users.activated_at,
    usedBytes: sql<number>`(select coalesce(sum(size_bytes), 0) from images where images.user_id = users.id)`,
    imageCount: sql<number>`(select count(*) from images where images.user_id = users.id)`,
    allocatedBytes: sql<number>`(select coalesce(sum(quota_bytes), 0) from users as s where s.sponsor_id = users.id)`,
    sponsoredCount: sql<number>`(select count(*) from users as s where s.sponsor_id = users.id and s.removed_at is null)`,
  }).from(users)
    .where(and(eq(users.sponsor_id, c.get('user').id), isNull(users.removed_at)))
    .orderBy(users.created_at)
  return c.json(rows)
})

peopleRoutes.post('/', async (c) => {
  const user = c.get('user')
  const db = getDb(c.env)
  const body = await c.req.json<{ email?: unknown; allowanceBytes?: unknown }>()
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (!EMAIL_PATTERN.test(email)) return c.json({ error: 'Enter a valid email address.' }, 400)
  if (!isBytes(body.allowanceBytes)) return c.json({ error: 'Choose an allowance.' }, 400)
  if (email === c.env.SEED_USER_EMAIL.toLowerCase()) return c.json({ error: 'That person already uses Isntagram.' }, 409)

  const { availableBytes } = await getUsage(db, user)
  if (body.allowanceBytes > availableBytes) return c.json({ error: "You don't have that much free space to give." }, 400)

  const existing = await db.query.users.findFirst({ where: eq(users.email, email) })
  if (existing && !existing.removed_at) return c.json({ error: 'That person already uses Isntagram.' }, 409)

  const now = new Date().toISOString()
  if (existing) {
    // Someone removed earlier can be invited again; they keep their handle.
    await db.update(users).set({ sponsor_id: user.id, quota_bytes: body.allowanceBytes, removed_at: null, activated_at: null, created_at: now })
      .where(eq(users.id, existing.id))
  } else {
    await db.insert(users).values({ email, sponsor_id: user.id, quota_bytes: body.allowanceBytes, created_at: now })
  }
  return c.json({ email, signInUrl: `${new URL(c.req.url).origin}/login` }, 201)
})

peopleRoutes.patch('/:id', async (c) => {
  const user = c.get('user')
  const db = getDb(c.env)
  const person = await sponsee(db, user, Number(c.req.param('id')))
  if (!person) return c.json({ error: 'Not someone you sponsor.' }, 404)

  const { allowanceBytes } = await c.req.json<{ allowanceBytes?: unknown }>()
  if (!isBytes(allowanceBytes)) return c.json({ error: 'Choose an allowance.' }, 400)

  const committed = await committedBytes(db, person.id)
  if (allowanceBytes < committed) return c.json({ error: 'They are already using more than that.', committedBytes: committed }, 400)
  const { availableBytes } = await getUsage(db, user)
  if (allowanceBytes - person.quota_bytes > availableBytes) return c.json({ error: "You don't have that much free space to give." }, 400)

  await db.update(users).set({ quota_bytes: allowanceBytes }).where(eq(users.id, person.id))
  return c.json({ id: person.id, quotaBytes: allowanceBytes })
})

peopleRoutes.delete('/:id', async (c) => {
  const user = c.get('user')
  const db = getDb(c.env)
  const person = await sponsee(db, user, Number(c.req.param('id')))
  if (!person) return c.json({ error: 'Not someone you sponsor.' }, 404)

  const mode = c.req.query('images')
  if (mode !== 'move' && mode !== 'delete') return c.json({ error: 'Choose what happens to their images.' }, 400)

  const keys = await removeSponsee(db, user, person, mode)
  await deleteObjects(c.env.BUCKET, keys)
  return c.body(null, 204)
})

// Summary used by the remove dialog.
peopleRoutes.get('/:id', async (c) => {
  const db = getDb(c.env)
  const person = await sponsee(db, c.get('user'), Number(c.req.param('id')))
  if (!person) return c.json({ error: 'Not someone you sponsor.' }, 404)
  const [{ count, bytes }] = await db.select({
    count: sql<number>`count(*)`, bytes: sql<number>`coalesce(sum(${images.size_bytes}), 0)`,
  }).from(images).where(eq(images.user_id, person.id))
  return c.json({ id: person.id, email: person.email, quotaBytes: person.quota_bytes, imageCount: count, usedBytes: bytes })
})
