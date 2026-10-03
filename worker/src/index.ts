import { Hono } from 'hono'
import { authMiddleware } from './middleware/auth'
import { requireHandle } from './middleware/handle'
import { meRoutes } from './routes/me'
import { folderRoutes } from './routes/folders'
import { imageRoutes } from './routes/images'
import { searchRoutes } from './routes/search'
import { handleFromHost } from './handles'
import { serveImage } from './serve'
import type { AppEnv, Env } from './types'

const api = new Hono<AppEnv>().basePath('/api')
api.use('*', authMiddleware)
api.route('/me', meRoutes)
for (const path of ['/folders/*', '/images/*', '/search/*']) api.use(path, requireHandle)
api.route('/folders', folderRoutes)
api.route('/images', imageRoutes)
api.route('/search', searchRoutes)

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)

    if (url.host === env.APP_HOST) {
      if (url.pathname.startsWith('/api/')) return api.fetch(request, env, ctx)
      return env.ASSETS.fetch(request)
    }

    const handle = handleFromHost(url.host, env.APP_HOST)
    if (handle === 'www') return Response.redirect(`${url.protocol}//${env.APP_HOST}${url.pathname}${url.search}`, 301)
    if (handle) return serveImage(request, env, handle)
    return new Response('Not found', { status: 404 })
  },
}
