import { and, eq } from 'drizzle-orm'
import { db } from '../persistance/database.js'
import { profileMods } from './schema.js'

type ProfileMods = {
  id: number
  profile_id: number | null
  mod_id: number | null
}

const fetchProfileMods = async (profile_id: number): Promise<ProfileMods[]> =>
  await db.select().from(profileMods).where(eq(profileMods.profile_id, profile_id))

const addModToProfile = async (profile_id: number, mod_id: number): Promise<ProfileMods[]> =>
  await db.insert(profileMods).values({ profile_id, mod_id }).onConflictDoNothing().returning()

const removeModFromProfile = async (profile_id: number, mod_id: number): Promise<ProfileMods[]> =>
  await db
    .delete(profileMods)
    .where(and(eq(profileMods.profile_id, profile_id), eq(profileMods.mod_id, mod_id)))
    .returning()

const deleteProfileMods = async (id: number): Promise<ProfileMods[]> =>
  await db.delete(profileMods).where(eq(profileMods.profile_id, id)).returning()

export { addModToProfile, deleteProfileMods, removeModFromProfile, fetchProfileMods }
