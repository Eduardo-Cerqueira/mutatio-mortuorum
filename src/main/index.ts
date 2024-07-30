import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join, resolve } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import {
  SteamClient,
  fetchSubscriberWorkshopItems,
  getModsConflicts,
  initializeClient,
  listActivatedMods,
  subscribeWorkshopModById
} from './mods.js'
import {
  addProfile,
  deleteProfile,
  fetchAllProfiles,
  renameProfile
} from './persistance/ProfileRepository.js'
import {
  addModToProfile,
  deleteProfileMods,
  fetchProfileMods,
  removeModFromProfile
} from './persistance/ProfileModsRepository.js'
import { workshop } from 'steamworks.js/client.js'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { db } from './utils/database.js'
import { generateAddonsFile } from './mods.js'
import { store } from './utils/store.js'

function createWindow(): BrowserWindow {
  const windowWidth = store.get('windowWidth')
  const windowHeight = store.get('windowHeight')
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: windowWidth ? windowWidth : 900,
    height: windowHeight ? windowHeight : 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      webSecurity: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('close', () => {
    store.set('windowHeight', mainWindow.getBounds().height)
    store.set('windowWidth', mainWindow.getBounds().width)
  })

  return mainWindow
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.mutatio.mortuorum')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  const mainWindow = createWindow()

  migrate(db, { migrationsFolder: resolve(__dirname, '../../resources/drizzle') })

  const client: SteamClient | false = initializeClient()

  if (client !== false) {
    ipcMain.once('steamInitialized', async () => {
      mainWindow.webContents.send('steamInitialized', true)
    })

    ipcMain.on('fetchSubscribedItems', async () => {
      const fetchedSubscriberWorkshopItems = (await fetchSubscriberWorkshopItems(
        client
      )) as workshop.WorkshopItem[]
      const conflicts = getModsConflicts(client)

      fetchedSubscriberWorkshopItems
        .filter((item) => !!item)
        .map((item) => {
          const modId = item.publishedFileId.toString()
          if (!conflicts[modId]) {
            conflicts.push({ id: modId, conflicts: [] })
          }
          const modConflictIndex = conflicts.findIndex((element) => element.id === modId)

          item['conflicts'] = conflicts[modConflictIndex].conflicts
          return item
        })
      mainWindow.webContents.send('fetchSubscribedItems', fetchedSubscriberWorkshopItems)
    })

    ipcMain.on('fetchProfiles', async () => {
      const fetchedProfiles = await fetchAllProfiles()
      if (fetchedProfiles.length < 1) {
        const result = await addProfile('default')
        const mods = await listActivatedMods(client)
        const activatedMods = mods.filter((mod) => mod.activated === 1)

        activatedMods.map(async (mod) => {
          await addModToProfile(result[0].id, Number(mod.workshopId))
        })

        store.set('currentProfile', 1)

        mainWindow.webContents.send('fetchProfiles', [{ id: 1, name: 'default' }])
      } else {
        mainWindow.webContents.send('fetchProfiles', fetchedProfiles)
      }
    })

    ipcMain.on('fetchProfileMods', async (_, data) => {
      const result = await fetchProfileMods(data.profile_id)
      mainWindow.webContents.send('fetchProfileMods', await result)
    })

    ipcMain.on('addProfile', async (_, data) => {
      const result = addProfile(data.name)
      mainWindow.webContents.send('addProfile', await result)
    })

    ipcMain.on('renameProfile', async (_, data) => {
      const status = renameProfile(data.id, data.name)
      mainWindow.webContents.send('renameProfile', await status)
    })

    ipcMain.on('deleteProfile', async (_, data) => {
      const status = deleteProfile(data.id)
      await deleteProfileMods(data.id)
      mainWindow.webContents.send('deleteProfile', await status)
    })

    ipcMain.on('saveProfile', async (_, data) => {
      const fetchedSubscriberWorkshopItems = await fetchSubscriberWorkshopItems(client)
      const subscribedItems = fetchedSubscriberWorkshopItems.filter(
        (element) => element !== null
      ) as workshop.WorkshopItem[]

      const activatedModsId = data.mods.map((mod) => Number(mod.publishedFileId))
      const subscribedModsId = subscribedItems.map((mod) => Number(mod.publishedFileId))
      const desactivedModsId = subscribedModsId.filter((mod) => !activatedModsId.includes(mod))
      const unsubcribedModsId = activatedModsId.filter((modId) => !subscribedModsId.includes(modId))

      unsubcribedModsId.map((modId) => subscribeWorkshopModById(client, modId))

      data.mods.map(async (mod: workshop.WorkshopItem) => {
        await addModToProfile(data.activeProfile, Number(mod.publishedFileId))
      })

      desactivedModsId.map(async (modId: number) => {
        await removeModFromProfile(data.activeProfile, modId)
      })

      const profileId = store.get('currentProfile')
      if (profileId === data.activeProfile) {
        await generateAddonsFile(data.activeProfile, client)
      }

      mainWindow.webContents.send('saveProfile')
    })

    ipcMain.on('currentProfile', async () => {
      const profileId = store.get('currentProfile')

      mainWindow.webContents.send('currentProfile', profileId)
    })

    ipcMain.on('activateProfile', async (_, data) => {
      await generateAddonsFile(data.profileId, client)
      store.set('currentProfile', data.profileId)

      mainWindow.webContents.send('activateProfile')
    })
  } else {
    ipcMain.once('steamInitialized', async () => {
      mainWindow.webContents.send('steamInitialized', false)
    })
  }

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
