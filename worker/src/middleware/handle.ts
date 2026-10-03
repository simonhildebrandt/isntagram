import { createMiddleware } from 'hono/factory'
import type { AppEnv } from '../types'

// Image links include the owner's handle, so nothing can be uploaded or managed without one.
export const requireHandle = createMiddleware<AppEnv>(async (c, next) => {
  if (!c.get('user').handle) return c.json({ error: 'Choose a handle first.' }, 409)
  await next()
})
