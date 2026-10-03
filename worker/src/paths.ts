import { and, eq, or, sql } from 'drizzle-orm'
import type { getDb } from './db/client'
import { folders, images } from './db/schema'

type Db = ReturnType<typeof getDb>

// URL-safe version of a folder or file name: lowercase letters, numbers, ".", "_" and "-".
// "@" is never produced, since it separates the preset name in scaled links.
export function slugify(name: string): string {
  return name
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 80) || 'untitled'
}

// The first of `base`, `base-2`, `base-3`… not in `taken`.
function firstFree(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base
  for (let n = 2; ; n++) if (!taken.has(`${base}-${n}`)) return `${base}-${n}`
}

// Slugs only contain [a-z0-9._-], so they're safe inside a GLOB pattern.
export async function freeFolderSlug(db: Db, userId: number, name: string, exceptFolderId?: number): Promise<string> {
  const base = slugify(name)
  const rows = await db.select({ id: folders.id, slug: folders.slug }).from(folders).where(and(
    eq(folders.user_id, userId),
    or(eq(folders.slug, base), sql`${folders.slug} GLOB ${base + '-[0-9]*'}`),
  ))
  return firstFree(base, new Set(rows.filter(r => r.id !== exceptFolderId).map(r => r.slug)))
}

export async function freeImageStem(db: Db, handle: string, folderSlug: string, fileName: string): Promise<string> {
  const base = `${folderSlug}/${slugify(fileName.replace(/\.[^.]*$/, ''))}`
  const rows = await db.select({ stem: images.path_stem }).from(images).where(and(
    eq(images.link_handle, handle),
    or(eq(images.path_stem, base), sql`${images.path_stem} GLOB ${base + '-[0-9]*'}`),
  ))
  return firstFree(base, new Set(rows.map(r => r.stem)))
}
