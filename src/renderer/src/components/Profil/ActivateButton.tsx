import { Switch, rem } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconCheck } from '@tabler/icons-react'

export default function ActivateButton({
  profileId,
  currentProfile,
  setCurrentProfile
}: {
  profileId: number
  currentProfile: number
  setCurrentProfile: React.Dispatch<React.SetStateAction<number>>
}): JSX.Element {
  const activateProfile = (profileId: number): void => {
    const id = notifications.show({
      loading: true,
      title: 'Activating the profile',
      message: "Wait while the profile data is being processed, don't close the app",
      autoClose: false,
      withCloseButton: false
    })
    window.electron.ipcRenderer.send('activateProfile', { profileId })

    window.electron.ipcRenderer.on('activateProfile', () => {
      setCurrentProfile(profileId)
      notifications.update({
        id,
        color: 'teal',
        title: 'Profile is activated',
        message: 'You can now close the app',
        icon: <IconCheck style={{ width: rem(18), height: rem(18) }} />,
        loading: false,
        autoClose: 2000
      })
    })
  }

  return (
    <Switch
      checked={profileId === currentProfile}
      onClick={() => {
        if (profileId !== currentProfile) activateProfile(profileId)
      }}
    />
  )
}
