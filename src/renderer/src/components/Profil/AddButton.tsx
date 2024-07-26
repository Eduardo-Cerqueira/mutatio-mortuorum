import { ActionIcon, TextInput } from '@mantine/core'
import { modals } from '@mantine/modals'
import { Profile } from '@renderer/App'
import { useEffect, useState } from 'react'
import { IconPlus } from '@tabler/icons-react'

export default function AddButton({
  profiles,
  setProfiles
}: {
  profiles: Profile[]
  setProfiles: React.Dispatch<React.SetStateAction<Profile[]>>
}): JSX.Element {
  const [profileName, setProfileName] = useState<string>('')
  const [isOpen, setOpen] = useState<boolean>(false)

  useEffect(() => {
    if (isOpen == true && profileName != '') addProfile(profileName)
  }, [isOpen])

  const addProfile = (name: string): void => {
    window.electron.ipcRenderer.send('addProfile', { name })
    setProfileName('')
    setOpen(false)

    window.electron.ipcRenderer.on('addProfile', (_, newProfile) =>
      setProfiles(profiles.concat(newProfile))
    )
  }

  const openEditModal = (): void =>
    modals.openConfirmModal({
      title: `Create a profile`,
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
      labels: { confirm: 'Add profile', cancel: 'Cancel' },
      confirmProps: { color: 'blue' },
      onConfirm: () => setOpen(true)
    })

  return (
    <ActionIcon onClick={openEditModal}>
      <IconPlus />
    </ActionIcon>
  )
}
