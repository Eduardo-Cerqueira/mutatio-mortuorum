import steamworks, { Client } from 'steamworks.js'
import path from 'node:path'
import { createWriteStream, readdirSync } from 'node:fs'
import { readdir, readFile } from 'fs/promises'
import { workshop } from 'steamworks.js/client.js'
import { fetchProfileMods } from './persistance/ProfileModsRepository.js'
import { Vpk } from './utils/node-vvpk.js'

export type SteamClient = Omit<Client, 'init' | 'runCallbacks'>

export const initializeClient = (): SteamClient => steamworks.init(550)

const addonFolder = (client: SteamClient): string =>
  path.join(client.apps.appInstallDir(550), 'left4dead2')

const addonFile = (client: SteamClient): string => path.join(addonFolder(client), 'addonlist.txt')

const workshopFolder = (client: SteamClient): string =>
  path.join(addonFolder(client), 'addons', 'workshop')

export const getUsername = (client: SteamClient): string => {
  return client.localplayer.getName()
}

const installedMods = async (modsFolder): Promise<string[]> => {
  const directoryFiles = await readdir(modsFolder, { withFileTypes: true })
  return directoryFiles
    .filter((directoryFile) => directoryFile.name.includes('vpk'))
    .map((file) => file.name)
}

const listActivatedMods = async (
  client: SteamClient
): Promise<{ workshopId: string; activated: number }[]> => {
  const addons: { workshopId: string; activated: number }[] = []
  const data = await readFile(addonFile(client), 'utf8')

  // Split file into lines
  const lines = data.split(/\r?\n/)

  // Match mods lines
  lines.forEach((line) => {
    const workshopItem: { workshopId: string; activated: number } = { workshopId: '', activated: 0 }
    const workshopId = line.match(/(?<=\\)(.*?)(?=\.)/)

    if (workshopId) {
      workshopItem.activated = Number(line[line.search(/("0"|"1")+/g) + 1]) // activated
      workshopItem.workshopId = workshopId[0] // workshopId

      addons.push(workshopItem) // Push to array of detected mods
    }
  })

  return addons
}

const fetchWorkshopItem = (
  client: SteamClient,
  id: bigint
): Promise<workshop.WorkshopItem | null> => client.workshop.getItem(id)

const fetchSubscriberWorkshopItems = async (
  client: SteamClient
): Promise<(workshop.WorkshopItem | null)[]> => {
  const subscribedItems = client.workshop.getSubscribedItems()

  return Promise.all(
    subscribedItems.map(async (itemId) => fetchWorkshopItem(client, itemId).catch(() => null))
  )
}

const generateAddonsFile = async (profileId: number, client: SteamClient): Promise<void> => {
  const fetchedSubscriberWorkshopItems = await fetchSubscriberWorkshopItems(client)
  const subscribedItems = fetchedSubscriberWorkshopItems.filter(
    (element) => element !== null
  ) as workshop.WorkshopItem[]

  const profileMods = await fetchProfileMods(profileId)

  const subscribedModsId = subscribedItems.map((mod) => Number(mod.publishedFileId))
  const activatedModsId = profileMods.map((mod) => Number(mod.mod_id))
  const desactivedModsId = subscribedModsId.filter((mod) => !activatedModsId.includes(mod))

  const stream = createWriteStream(path.join(addonFolder(client), 'addonlist.txt'))
  stream.once('open', function () {
    stream.write(`"AddonList"\n{\n`)
    activatedModsId.map((modId) => stream.write(`\t"workshop\\${modId}.vpk"\t\t"1"\n`))
    desactivedModsId.map((modId) => stream.write(`\t"workshop\\${modId}.vpk"\t\t"0"\n`))
    stream.write('}\n')
    stream.end()
  })
  return
}

const subscribeWorkshopModById = async (client: SteamClient, id: number): Promise<void> =>
  await client.workshop.subscribe(BigInt(id))

const folders = ['missions/', 'scripts/', 'particles/', 'models/', 'sound/', 'materials/']

const getModsConflicts = (
  client: SteamClient
): {
  id: string
  conflicts: string[]
}[] => {
  const workshopDir = workshopFolder(client)

  const vpkFiles = readdirSync(workshopDir).filter(
    (filePath) => path.parse(filePath).ext === '.vpk'
  )

  const modFiles = vpkFiles
    .map((file) =>
      Vpk.indexFromFile(path.join(workshopDir, file))
        .filter((modFile) => folders.some((el) => modFile.relPath.includes(el)))
        .map((modFile) => {
          return { id: path.parse(file).name, file: modFile.relPath }
        })
    )
    .flat()

  const modsConflicts: {
    id: string
    conflicts: string[]
  }[] = vpkFiles.map((file) => {
    return { id: path.parse(file).name, conflicts: [] }
  })

  modFiles.forEach((modFile) => {
    const conflictingMods = modFiles
      .filter((mod) => mod.file === modFile.file && mod.id !== modFile.id)
      .map((mod) => mod.id)
    const modIndex = modsConflicts.findIndex((element) => element.id === modFile.id)
    modsConflicts[modIndex].conflicts = Array.from(
      new Set(modsConflicts[modIndex].conflicts.concat(conflictingMods))
    )
  })

  return modsConflicts
}

export {
  installedMods,
  listActivatedMods,
  fetchWorkshopItem,
  fetchSubscriberWorkshopItems,
  generateAddonsFile,
  subscribeWorkshopModById,
  getModsConflicts
}
