import { eq, sql } from 'drizzle-orm'
import type { getDb } from './db/client'
import { images, users, type User } from './db/schema'

type Db = ReturnType<typeof getDb>

export interface Usage {
  quotaBytes: number
  usedBytes: number
  // Space given to sponsored users comes out of the sponsor's quota.
  allocatedBytes: number
  availableBytes: number
}

export async function getUsage(db: Db, user: User): Promise<Usage> {
  const [[{ used }], [{ allocated }]] = await Promise.all([
    db.select({ used: sql<number>`coalesce(sum(${images.size_bytes}), 0)` }).from(images).where(eq(images.user_id, user.id)),
    db.select({ allocated: sql<number>`coalesce(sum(${users.quota_bytes}), 0)` }).from(users).where(eq(users.sponsor_id, user.id)),
  ])
  return {
    quotaBytes: user.quota_bytes,
    usedBytes: used,
    allocatedBytes: allocated,
    availableBytes: user.quota_bytes - used - allocated,
  }
}
