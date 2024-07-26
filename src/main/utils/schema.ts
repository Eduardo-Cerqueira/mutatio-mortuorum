import { unique } from 'drizzle-orm/sqlite-core'
import { text, integer, sqliteTable } from 'drizzle-orm/sqlite-core'

export const profile = sqliteTable('profile', {
  id: integer('id').primaryKey(),
  name: text('name').unique()
})

export const mods = sqliteTable('mods', {
  id: integer('id').primaryKey(),
  title: text('name'),
  description: text('description'),
  tags: text('tags'),
  previewUrl: text('previewUrl'),
  url: text('url'),
  updatedAt: integer('updatedAt')
})

export const profileMods = sqliteTable(
  'profileMods',
  {
    id: integer('id').primaryKey(),
    profile_id: integer('profile_id'),
    mod_id: integer('mod_id')
  },
  (t) => ({
    unq: unique().on(t.mod_id, t.profile_id)
  })
)
