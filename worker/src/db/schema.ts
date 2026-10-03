import { sqliteTable, text, integer, index, uniqueIndex, type AnySQLiteColumn } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id:          integer('id').primaryKey({ autoIncrement: true }),
  email:       text('email').notNull().unique(),
  // Chosen on first sign-in, then fixed: it names the user's image subdomain.
  handle:      text('handle').unique(),
  // Null only for the seed user.
  sponsor_id:  integer('sponsor_id').references((): AnySQLiteColumn => users.id),
  quota_bytes: integer('quota_bytes').notNull(),
  created_at:  text('created_at').notNull(),
})

export const folders = sqliteTable('folders', {
  id:         integer('id').primaryKey({ autoIncrement: true }),
  user_id:    integer('user_id').notNull().references(() => users.id),
  name:       text('name').notNull(),
  // Used in the paths of images uploaded from now on; existing image paths never change.
  slug:       text('slug').notNull(),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
}, (t) => [
  uniqueIndex('folders_user_slug').on(t.user_id, t.slug),
])

export const images = sqliteTable('images', {
  id:           integer('id').primaryKey({ autoIncrement: true }),
  user_id:      integer('user_id').notNull().references(() => users.id),
  folder_id:    integer('folder_id').notNull().references(() => folders.id),
  // The public URL is {link_handle}.APP_HOST/{path_stem}.{ext}, fixed at upload.
  link_handle:  text('link_handle').notNull(),
  path_stem:    text('path_stem').notNull(),
  ext:          text('ext').notNull(),
  name:         text('name').notNull(),
  r2_key:       text('r2_key').notNull().unique(),
  content_type: text('content_type').notNull(),
  size_bytes:   integer('size_bytes').notNull(),
  width:        integer('width').notNull(),
  height:       integer('height').notNull(),
  created_at:   text('created_at').notNull(),
  updated_at:   text('updated_at').notNull(),
}, (t) => [
  uniqueIndex('images_link').on(t.link_handle, t.path_stem),
  index('images_folder').on(t.folder_id),
  index('images_user').on(t.user_id),
])

export type User = typeof users.$inferSelect
export type Folder = typeof folders.$inferSelect
export type Image = typeof images.$inferSelect
