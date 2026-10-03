import { and, eq, isNull, sql } from 'drizzle-orm'
import type { BatchItem } from 'drizzle-orm/batch'
import type { getDb } from './db/client'
import { folders, folderPresets, imagePresets, images, presets, users, type User } from './db/schema'
import { firstFree } from './paths'

type Db = ReturnType<typeof getDb>

// Space a user has committed: their own images plus what they've given to people they sponsor.
// An allowance can never be reduced below this.
export async function committedBytes(db: Db, userId: number): Promise<number> {
  const [{ used }] = await db.select({ used: sql<number>`coalesce(sum(${images.size_bytes}), 0)` }).from(images).where(eq(images.user_id, userId))
  const [{ allocated }] = await db.select({ allocated: sql<number>`coalesce(sum(${users.quota_bytes}), 0)` }).from(users).where(eq(users.sponsor_id, userId))
  return used + allocated
}

export function sponsee(db: Db, sponsor: User, id: number) {
  return db.query.users.findFirst({ where: and(eq(users.id, id), eq(users.sponsor_id, sponsor.id), isNull(users.removed_at)) })
}

// Removes a sponsored user. Their allowance returns to the sponsor, anyone they sponsored is now
// sponsored by the sponsor, and their images are either moved to the sponsor's library (links keep
// working, since paths include the original handle and never change) or deleted.
// Returns the R2 keys to delete once the database changes have been applied.
export async function removeSponsee(db: Db, sponsor: User, removed: User, images_: 'move' | 'delete'): Promise<string[]> {
  const now = new Date().toISOString()
  const statements: BatchItem<'sqlite'>[] = []
  let r2Keys: string[] = []

  if (images_ === 'move') {
    // Folders join the sponsor's library; a clashing name gets the removed user's handle added.
    const [theirs, mine] = await Promise.all([
      db.select().from(folders).where(eq(folders.user_id, removed.id)),
      db.select({ name: folders.name, slug: folders.slug }).from(folders).where(eq(folders.user_id, sponsor.id)),
    ])
    const names = new Set(mine.map(f => f.name))
    const slugs = new Set(mine.map(f => f.slug))
    for (const folder of theirs) {
      const name = names.has(folder.name) ? `${folder.name} (${removed.handle ?? removed.email})` : folder.name
      const slug = firstFree(folder.slug, slugs)
      names.add(name)
      slugs.add(slug)
      statements.push(db.update(folders).set({ user_id: sponsor.id, name, slug, updated_at: now }).where(eq(folders.id, folder.id)))
    }
    statements.push(db.update(images).set({ user_id: sponsor.id }).where(eq(images.user_id, removed.id)))

    // Their sizes come too. Where the sponsor already has a size with the same name, theirs is merged
    // into it; those links keep working if the formats match (the format sets the extension).
    const [theirPresets, myPresets] = await Promise.all([
      db.select().from(presets).where(eq(presets.user_id, removed.id)),
      db.select().from(presets).where(eq(presets.user_id, sponsor.id)),
    ])
    const myByName = new Map(myPresets.map(p => [p.name, p]))
    for (const preset of theirPresets) {
      const match = myByName.get(preset.name)
      if (!match) {
        statements.push(db.update(presets).set({ user_id: sponsor.id, is_default: false, updated_at: now }).where(eq(presets.id, preset.id)))
        continue
      }
      statements.push(
        db.update(folderPresets).set({ preset_id: match.id }).where(eq(folderPresets.preset_id, preset.id)),
        db.update(imagePresets).set({ preset_id: match.id }).where(eq(imagePresets.preset_id, preset.id)),
        db.delete(presets).where(eq(presets.id, preset.id)),
      )
    }
  } else {
    r2Keys = (await db.select({ key: images.r2_key }).from(images).where(eq(images.user_id, removed.id))).map(r => r.key)
    statements.push(
      db.delete(images).where(eq(images.user_id, removed.id)),
      db.delete(folders).where(eq(folders.user_id, removed.id)),
      db.delete(presets).where(eq(presets.user_id, removed.id)),
    )
  }

  statements.push(
    db.update(users).set({ sponsor_id: sponsor.id }).where(eq(users.sponsor_id, removed.id)),
    db.update(users).set({ removed_at: now, quota_bytes: 0 }).where(eq(users.id, removed.id)),
  )
  await db.batch(statements as [BatchItem<'sqlite'>, ...BatchItem<'sqlite'>[]])
  return r2Keys
}

export async function deleteObjects(bucket: R2Bucket, keys: string[]) {
  for (let i = 0; i < keys.length; i += 1000) await bucket.delete(keys.slice(i, i + 1000))
}

