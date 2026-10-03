import { and, eq, inArray, sql } from 'drizzle-orm'
import type { getDb } from './db/client'
import { folderPresets, imagePresets, presets, type Image, type Preset } from './db/schema'

type Db = ReturnType<typeof getDb>
export type PresetShape = Pick<Preset, 'name' | 'width' | 'height' | 'fit' | 'format'>

export const STARTER_PRESETS: (PresetShape & { is_default: boolean })[] = [
  { name: 'thumb', width: 150, height: 150, fit: 'crop', format: 'webp', is_default: true },
  { name: 'medium', width: 800, height: null, fit: 'inside', format: 'keep', is_default: true },
]

// Used by the app for grids and folder covers. It's served for every image without being applied;
// user preset names can't start with "_", so it never clashes.
export const GRID_PRESET: PresetShape & { updated_at: string } = {
  name: '_grid', width: 480, height: null, fit: 'inside', format: 'webp', updated_at: '1',
}

const NAME_PATTERN = /^[a-z0-9][a-z0-9-]{0,31}$/

export function presetNameProblem(name: string): string | null {
  if (!NAME_PATTERN.test(name)) return 'Use up to 32 lowercase letters, numbers or hyphens, starting with a letter or number.'
  if (name === 'original') return '"original" is reserved.'
  return null
}

const FORMAT_EXT = { webp: 'webp', jpeg: 'jpg' } as const
const EXT_TYPE: Record<string, 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' | 'image/avif'> = {
  jpg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', avif: 'image/avif',
}

export function outputExt(preset: Pick<Preset, 'format'>, image: Pick<Image, 'ext'>): string {
  return preset.format === 'keep' ? image.ext : FORMAT_EXT[preset.format]
}

export const outputType = (ext: string) => EXT_TYPE[ext]

// Cloudflare's "scale-down" and "crop" fits never enlarge the original.
export function transformFor(preset: PresetShape): ImageTransform {
  if (preset.height === null) return { width: preset.width, fit: 'scale-down' }
  return { width: preset.width, height: preset.height, fit: preset.fit === 'crop' ? 'crop' : 'scale-down' }
}

// The size a preset produces from a given original, for display.
export function outputSize(preset: PresetShape, image: Pick<Image, 'width' | 'height'>) {
  if (preset.height !== null && preset.fit === 'crop') {
    return { width: Math.min(preset.width, image.width), height: Math.min(preset.height, image.height) }
  }
  const scale = Math.min(1, preset.width / image.width, preset.height === null ? 1 : preset.height / image.height)
  return { width: Math.round(image.width * scale), height: Math.round(image.height * scale) }
}

export async function createStarterPresets(db: Db, userId: number) {
  const now = new Date().toISOString()
  await db.insert(presets)
    .values(STARTER_PRESETS.map(p => ({ ...p, user_id: userId, created_at: now, updated_at: now })))
    .onConflictDoNothing()
}

// The presets that apply to an image, through its folder or set on the image itself.
export async function presetsForImage(db: Db, image: Pick<Image, 'id' | 'folder_id' | 'user_id'>) {
  const rows = await db.select({
    preset: presets,
    fromFolder: sql<number>`exists (select 1 from folder_presets where folder_presets.folder_id = ${image.folder_id} and folder_presets.preset_id = presets.id)`,
    fromImage: sql<number>`exists (select 1 from image_presets where image_presets.image_id = ${image.id} and image_presets.preset_id = presets.id)`,
  }).from(presets).where(eq(presets.user_id, image.user_id)).orderBy(presets.width)
  return rows
    .filter(r => r.fromFolder || r.fromImage)
    .map(r => ({ ...r.preset, source: r.fromFolder ? 'folder' as const : 'image' as const }))
}

// Replaces the set of presets applied to a folder or an image, ignoring ids the user doesn't own.
export async function setAppliedPresets(db: Db, userId: number, target: { folderId: number } | { imageId: number }, presetIds: number[]) {
  const owned = presetIds.length
    ? (await db.select({ id: presets.id }).from(presets).where(and(eq(presets.user_id, userId), inArray(presets.id, presetIds)))).map(r => r.id)
    : []
  if ('folderId' in target) {
    await db.batch([
      db.delete(folderPresets).where(eq(folderPresets.folder_id, target.folderId)),
      ...owned.map(id => db.insert(folderPresets).values({ folder_id: target.folderId, preset_id: id })),
    ])
  } else {
    await db.batch([
      db.delete(imagePresets).where(eq(imagePresets.image_id, target.imageId)),
      ...owned.map(id => db.insert(imagePresets).values({ image_id: target.imageId, preset_id: id })),
    ])
  }
  return owned
}
