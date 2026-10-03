import { Hono } from 'hono'
import { authMiddleware } from './middleware/auth'
import { meRoutes } from './routes/me'
import { handleFromHost } from './handles'
import type { AppEnv, Env } from './types'

const api = new Hono<AppEnv>().basePath('/api')
api.use('*', authMiddleware)
api.route('/me', meRoutes)

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)

    if (url.host === env.APP_HOST) {
      if (url.pathname.startsWith('/api/')) return api.fetch(request, env, ctx)
      return env.ASSETS.fetch(request)
    }

    const handle = handleFromHost(url.host, env.APP_HOST)
    if (handle === 'www') return Response.redirect(`${url.protocol}//${env.APP_HOST}${url.pathname}${url.search}`, 301)

    // Image serving on {handle}.APP_HOST arrives in slice 2.
    return new Response('Not found', { status: 404 })
  },
}
