import { useEffect, useState } from 'react'
import { workshop } from 'steamworks.js/client'
import HomeHeader from './components/Profil/HomeHeader'
import ProfileSelection from './components/Profil/ProfileSelection'
import TopBar from './components/Mods/TopBar'
import ListMods from './components/Mods/ListMods'
import { Modal } from '@mantine/core'

export type Profile = {
  id: number
  name: string
}

export type ProfileMod = {
  id: number
  profile_id: number
  mod_id: number
}

interface Conflicts {
  conflicts: string[]
}

export type WorkshopMod = workshop.WorkshopItem & Conflicts

function App(): JSX.Element {
  const [steamInitialized, setSteamInitialized] = useState<boolean>(false)
  const [workshopItems, setWorkshopItems] = useState<WorkshopMod[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [activeProfile, setActiveProfile] = useState<number>(0)
  const [currentProfile, setCurrentProfile] = useState<number>(0)
  const [validatedMods, setValidatedMods] = useState<WorkshopMod[]>([])

  useEffect(() => {
    window.electron.ipcRenderer.send('steamInitialized')

    window.electron.ipcRenderer.on('steamInitialized', (_, data) => {
      setSteamInitialized(data)
    })

    window.electron.ipcRenderer.send('fetchSubscribedItems')

    window.electron.ipcRenderer.on('fetchSubscribedItems', (_, data) => {
      setWorkshopItems(data.filter((item) => item))
    })

    window.electron.ipcRenderer.send('fetchProfiles')

    window.electron.ipcRenderer.on('fetchProfiles', (_, data) => setProfiles(data))

    window.electron.ipcRenderer.send('currentProfile')

    window.electron.ipcRenderer.on('currentProfile', (_, data) => setCurrentProfile(data))
  }, [])

  useEffect(() => {
    window.electron.ipcRenderer.send('fetchProfileMods', { profile_id: activeProfile })

    window.electron.ipcRenderer.on('fetchProfileMods', (_, data: ProfileMod[]) => {
      const validatedModsId = data.map((profileMod) => profileMod.mod_id)
      setValidatedMods(
        workshopItems.filter((item) => validatedModsId.includes(Number(item.publishedFileId)))
      )
    })
  }, [activeProfile])

  return (
    <>
      {steamInitialized ? (
        <></>
      ) : (
        <Modal
          size={'xl'}
          opened={!steamInitialized}
          onClose={close}
          title="Steam is not launched/installed"
          centered
        />
      )}
      {activeProfile === 0 ? (
        <>
          <HomeHeader setProfiles={setProfiles} profiles={profiles} />
          <ProfileSelection
            profiles={profiles}
            setProfiles={setProfiles}
            setActiveProfile={setActiveProfile}
            currentProfile={currentProfile}
            setCurrentProfile={setCurrentProfile}
          />
        </>
      ) : (
        <>
          <TopBar
            validatedMods={validatedMods}
            activeProfile={activeProfile}
            setActiveProfile={setActiveProfile}
            profileName={profiles.filter((profile) => profile.id === activeProfile)[0].name}
          />
          <ListMods
            workshopItems={workshopItems}
            validatedMods={validatedMods}
            setValidatedMods={setValidatedMods}
          />
        </>
      )}
    </>
  )
}

export default App
