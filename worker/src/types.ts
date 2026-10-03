import type { User } from './db/schema'

export interface Env {
  DB: D1Database
  ASSETS: Fetcher
  APP_HOST: string
  SEED_USER_EMAIL: string
  SEED_QUOTA_BYTES: string
  LOGIN_WITH_LINK_SECRET: string
}

export type AppEnv = {
  Bindings: Env
  Variables: { user: User }
}
