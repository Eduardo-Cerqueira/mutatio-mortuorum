import { Button, Text } from '@mantine/core'
import { modals } from '@mantine/modals'
import { Profile } from '@renderer/App'
import { IconTrash } from '@tabler/icons-react'

export default function DeleteButton({
  profile,
  profiles,
  setProfiles
}: {
  profile: Profile
  profiles: Profile[]
  setProfiles: React.Dispatch<React.SetStateAction<Profile[]>>
}): JSX.Element {
  const deleteProfile = (id: number): void => {
    window.electron.ipcRenderer.send('deleteProfile', { id })

    window.electron.ipcRenderer.on('deleteProfile', () =>
      setProfiles(profiles.filter((value) => value.id !== id))
    )
  }

  const openDeleteModal = (): void =>
    modals.openConfirmModal({
      title: `Delete ${profile.name} profile`,
      centered: true,
      children: (
        <Text size="sm">
          Are you sure you want to delete this profile? This action is destructive and you will lose
          this profile forever unless you exported it.
        </Text>
      ),
      labels: { confirm: 'Delete profile', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: () => deleteProfile(profile.id)
    })

  return (
    <Button onClick={openDeleteModal} color="red">
      <IconTrash />
    </Button>
  )
}
