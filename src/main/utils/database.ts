import * as schema from './schema.js'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'

const databasePath = path.join(app.getPath('userData'), 'database.db')

const sqlite = new Database(databasePath)

export const db = drizzle(sqlite, { schema })
