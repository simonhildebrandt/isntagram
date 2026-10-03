import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { getDb } from '../db/client'
import { users } from '../db/schema'
import { handleProblem } from '../handles'
import type { AppEnv } from '../types'

export const meRoutes = new Hono<AppEnv>()

meRoutes.get('/', (c) => {
  const user = c.get('user')
  return c.json({
    email: user.email,
    handle: user.handle,
    quotaBytes: user.quota_bytes,
    linkHost: user.handle ? `${user.handle}.${c.env.APP_HOST}` : null,
  })
})

meRoutes.get('/handle-check', async (c) => {
  const handle = c.req.query('handle') ?? ''
  const problem = handleProblem(handle)
  if (problem) return c.json({ available: false, problem })

  const taken = await getDb(c.env).query.users.findFirst({ where: eq(users.handle, handle) })
  return c.json(taken ? { available: false, problem: 'That handle is taken.' } : { available: true })
})

meRoutes.put('/handle', async (c) => {
  const user = c.get('user')
  if (user.handle) return c.json({ error: 'Your handle is already set.' }, 409)

  const { handle } = await c.req.json<{ handle?: unknown }>()
  if (typeof handle !== 'string') return c.json({ error: 'Choose a handle.' }, 400)
  const problem = handleProblem(handle)
  if (problem) return c.json({ error: problem }, 400)

  try {
    await getDb(c.env).update(users).set({ handle }).where(eq(users.id, user.id))
  } catch (e) {
    if (String(e).includes('UNIQUE')) return c.json({ error: 'That handle is taken.' }, 409)
    throw e
  }
  return c.json({ handle, linkHost: `${handle}.${c.env.APP_HOST}` })
})
