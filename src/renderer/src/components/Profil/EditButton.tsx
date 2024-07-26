import { Button, TextInput } from '@mantine/core'
import { modals } from '@mantine/modals'
import { Profile } from '@renderer/App'
import { useEffect, useState } from 'react'
import { IconPencil } from '@tabler/icons-react'

export default function EditButton({
  profile,
  profiles,
  setProfiles
}: {
  profile: Profile
  profiles: Profile[]
  setProfiles: React.Dispatch<React.SetStateAction<Profile[]>>
}): JSX.Element {
  const [profileName, setProfileName] = useState<string>('')
  const [isOpen, setOpen] = useState<boolean>(false)

  useEffect(() => {
    if (isOpen == true && profileName != '') renameProfile(profile.id, profileName)
  }, [isOpen])

  const renameProfile = (id: number, name: string): void => {
    window.electron.ipcRenderer.send('renameProfile', { id, name })

    window.electron.ipcRenderer.on('renameProfile', () => {
      const newProfiles = profiles.map((profile) => {
        if (profile.id === id) {
          return {
            id: id,
            name: name
          }
        } else {
          return profile
        }
      })
      setProfileName('')
      setProfiles(newProfiles)
      setOpen(false)
    })
  }

  const openEditModal = (): void =>
    modals.openConfirmModal({
      title: `Rename ${profile.name} profile`,
      centered: true,
      children: (
        <>
          <TextInput
            onChange={(event) => setProfileName(event.currentTarget.value)}
            label="Profile name"
            placeholder="Hello world"
            data-autofocus
          />
        </>
      ),
      labels: { confirm: 'Rename profile', cancel: 'Cancel' },
      confirmProps: { color: 'blue' },
      onConfirm: () => setOpen(true)
    })

  return (
    <Button onClick={openEditModal}>
      <IconPencil />
    </Button>
  )
}
