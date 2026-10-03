import { sqliteTable, text, integer, type AnySQLiteColumn } from 'drizzle-orm/sqlite-core'

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

export type User = typeof users.$inferSelect
