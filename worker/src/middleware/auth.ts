import { createMiddleware } from 'hono/factory'
import { jwtVerify } from 'jose'
import { eq } from 'drizzle-orm'
import { getDb } from '../db/client'
import { users } from '../db/schema'
import type { AppEnv } from '../types'

export const authMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const auth = c.req.header('Authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return c.json({ error: 'unauthorized' }, 401)

  let email: string
  try {
    const secret = new TextEncoder().encode(c.env.LOGIN_WITH_LINK_SECRET)
    const { payload } = await jwtVerify(token, secret)
    if (typeof payload.email !== 'string') throw new Error('Token has no email')
    email = payload.email.toLowerCase()
  } catch (e) {
    console.warn('Rejected sign-in token:', e instanceof Error ? e.message : e)
    return c.json({ error: 'invalid_token' }, 401)
  }

  const db = getDb(c.env)
  if (email === c.env.SEED_USER_EMAIL.toLowerCase()) {
    await db.insert(users).values({
      email,
      quota_bytes: Number(c.env.SEED_QUOTA_BYTES),
      created_at: new Date().toISOString(),
    }).onConflictDoNothing()
  }

  // Sign-in is invite-only: anyone without a user row is turned away.
  const user = await db.query.users.findFirst({ where: eq(users.email, email) })
  if (!user) return c.json({ error: 'not_invited' }, 403)

  c.set('user', user)
  await next()
})
