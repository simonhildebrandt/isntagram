import { Hono } from 'hono'
import { and, eq, sql } from 'drizzle-orm'
import { getDb } from '../db/client'
import { isUniqueViolation } from '../db/errors'
import { presets, type Preset } from '../db/schema'
import { presetNameProblem } from '../presets'
import type { AppEnv } from '../types'

export const presetRoutes = new Hono<AppEnv>()

const MAX_DIMENSION = 8192
const now = () => new Date().toISOString()

export function presetJson(p: Preset, usage?: { folders: number; images: number }) {
  return {
    id: p.id, name: p.name, width: p.width, height: p.height, fit: p.fit, format: p.format,
    isDefault: p.is_default, updatedAt: p.updated_at,
    ...(usage && { folderCount: usage.folders, imageCount: usage.images }),
  }
}

type Body = { name?: unknown; width?: unknown; height?: unknown; fit?: unknown; format?: unknown; isDefault?: unknown }

// Checks the editable parts of a preset: everything except name and format.
function parseShape(body: Body): { error: string } | { width: number; height: number | null; fit: Preset['fit']; is_default: boolean } {
  const { width, height, fit, isDefault } = body
  const dimension = (v: unknown) => Number.isInteger(v) && (v as number) > 0 && (v as number) <= MAX_DIMENSION
  if (!dimension(width)) return { error: `Width must be a whole number from 1 to ${MAX_DIMENSION}.` }
  if (height !== null && height !== undefined && !dimension(height)) return { error: `Height must be a whole number from 1 to ${MAX_DIMENSION}, or empty.` }
  if (fit !== 'inside' && fit !== 'crop') return { error: 'Choose how the image fits.' }
  return { width: width as number, height: (height as number | undefined) ?? null, fit, is_default: isDefault === true }
}

presetRoutes.get('/', async (c) => {
  const db = getDb(c.env)
  const rows = await db.select({
    preset: presets,
    folders: sql<number>`(select count(*) from folder_presets where preset_id = ${presets.id})`,
    images: sql<number>`(select count(*) from image_presets where preset_id = ${presets.id})`,
  }).from(presets).where(eq(presets.user_id, c.get('user').id)).orderBy(presets.width, presets.name)
  return c.json(rows.map(r => presetJson(r.preset, { folders: r.folders, images: r.images })))
})

presetRoutes.post('/', async (c) => {
  const body = await c.req.json<Body>()
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const problem = presetNameProblem(name)
  if (problem) return c.json({ error: problem }, 400)
  if (body.format !== 'keep' && body.format !== 'webp' && body.format !== 'jpeg') return c.json({ error: 'Choose an output format.' }, 400)
  const shape = parseShape(body)
  if ('error' in shape) return c.json(shape, 400)

  try {
    const [preset] = await getDb(c.env).insert(presets).values({
      ...shape, name, format: body.format, user_id: c.get('user').id, created_at: now(), updated_at: now(),
    }).returning()
    return c.json(presetJson(preset, { folders: 0, images: 0 }), 201)
  } catch (e) {
    if (isUniqueViolation(e)) return c.json({ error: 'You already have a size with that name.' }, 409)
    throw e
  }
})

// Name and format can't change: both are part of every link to this size.
presetRoutes.patch('/:id', async (c) => {
  const shape = parseShape(await c.req.json<Body>())
  if ('error' in shape) return c.json(shape, 400)

  const [preset] = await getDb(c.env).update(presets).set({ ...shape, updated_at: now() })
    .where(and(eq(presets.id, Number(c.req.param('id'))), eq(presets.user_id, c.get('user').id)))
    .returning()
  if (!preset) return c.json({ error: 'Size not found.' }, 404)
  return c.json(presetJson(preset))
})

presetRoutes.delete('/:id', async (c) => {
  const [preset] = await getDb(c.env).delete(presets)
    .where(and(eq(presets.id, Number(c.req.param('id'))), eq(presets.user_id, c.get('user').id)))
    .returning()
  if (!preset) return c.json({ error: 'Size not found.' }, 404)
  return c.body(null, 204)
})
