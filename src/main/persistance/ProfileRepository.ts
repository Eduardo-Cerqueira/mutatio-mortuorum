import { eq } from 'drizzle-orm'
import { db } from '../persistance/database.js'
import { profile } from './schema.js'

type Profile = {
  id: number
  name: string | null
}

const fetchAllProfiles = async (): Promise<Profile[]> => await db.select().from(profile)

const addProfile = async (name: string): Promise<Profile[]> =>
  await db.insert(profile).values({ name }).returning()

const renameProfile = async (id: number, name: string): Promise<Profile[]> =>
  await db.update(profile).set({ name }).where(eq(profile.id, id)).returning()

const deleteProfile = async (id: number): Promise<Profile[]> =>
  await db.delete(profile).where(eq(profile.id, id)).returning()

export { fetchAllProfiles, addProfile, renameProfile, deleteProfile }
