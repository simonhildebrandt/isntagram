import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { getDb } from '../db/client'
import { isUniqueViolation } from '../db/errors'
import { users } from '../db/schema'
import { handleProblem } from '../handles'
import { getUsage } from '../quota'
import { createStarterPresets } from '../presets'
import type { AppEnv } from '../types'

export const meRoutes = new Hono<AppEnv>()

meRoutes.get('/', async (c) => {
  const user = c.get('user')
  const sponsor = user.sponsor_id ? await getDb(c.env).query.users.findFirst({ where: eq(users.id, user.sponsor_id) }) : undefined
  return c.json({
    sponsorEmail: sponsor?.email ?? null,
    email: user.email,
    handle: user.handle,
    ...await getUsage(getDb(c.env), user),
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
    await createStarterPresets(getDb(c.env), user.id)
  } catch (e) {
    if (isUniqueViolation(e)) return c.json({ error: 'That handle is taken.' }, 409)
    throw e
  }
  return c.json({ handle, linkHost: `${handle}.${c.env.APP_HOST}` })
})
