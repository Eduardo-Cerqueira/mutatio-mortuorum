import { useEffect, useState } from 'react'
import { Profile, WorkshopMod } from '@renderer/App'
import { FileButton, ActionIcon, rem } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconExclamationCircle, IconFileUpload } from '@tabler/icons-react'

export default function ImportButton({
  profiles,
  setProfiles
}: {
  profiles: Profile[]
  setProfiles: React.Dispatch<React.SetStateAction<Profile[]>>
}): JSX.Element {
  const [fileData, setFileData] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)

  const saveProfile = (activeProfile: number, mods: WorkshopMod[]): void => {
    window.electron.ipcRenderer.send('saveProfile', { activeProfile, mods })

    window.electron.ipcRenderer.on('saveProfile', () => null)
  }

  const addProfile = (profileName: string, mods: WorkshopMod[]): void => {
    window.electron.ipcRenderer.send('addProfile', { name: profileName })

    window.electron.ipcRenderer.on('addProfile', (_, newProfile) => {
      setProfiles([...profiles, newProfile[0]])
      saveProfile(newProfile[0].id, mods)
    })
  }

  const fileToText = async (file: File): Promise<void> => {
    const text = await file.text()
    setFileData(text)
    setFile(null)
  }

  useEffect(() => {
    if (file !== null) fileToText(file)
  }, [file])

  useEffect(() => {
    if (fileData !== null) {
      try {
        const data = JSON.parse(fileData)
        if (data.profileName && data.mods) {
          addProfile(data.profileName, data.mods)
        } else if (!data.profileName || !data.mods) {
          notifications.show({
            color: 'red',
            title: 'Error while importing the profile',
            message: 'Profile does not contain profile name and mods data',
            icon: <IconExclamationCircle style={{ width: rem(18), height: rem(18) }} />,
            autoClose: 4000
          })
        }
      } catch (e) {
        notifications.show({
          color: 'red',
          title: 'Error while importing the profile',
          message: 'Invalid format, please import a valid JSON file',
          icon: <IconExclamationCircle style={{ width: rem(18), height: rem(18) }} />,
          autoClose: 4000
        })
      }
      setFileData(null)
    }
  }, [fileData])

  return (
    <FileButton onChange={setFile} accept="application/json">
      {(props) => (
        <ActionIcon variant="filled" {...props}>
          <IconFileUpload />
        </ActionIcon>
      )}
    </FileButton>
  )
}
