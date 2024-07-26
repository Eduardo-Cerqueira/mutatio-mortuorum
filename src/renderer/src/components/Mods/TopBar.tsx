import ExportButton from '../Profil/ExportButton'
import { WorkshopMod } from '@renderer/App'
import { notifications } from '@mantine/notifications'
import { IconArrowLeft, IconCheck, IconDeviceFloppy } from '@tabler/icons-react'
import { ActionIcon, Flex, Grid, Title, rem } from '@mantine/core'

export default function TopBar({
  activeProfile,
  setActiveProfile,
  validatedMods,
  profileName
}: {
  activeProfile: number
  setActiveProfile: React.Dispatch<React.SetStateAction<number>>
  validatedMods: WorkshopMod[]
  profileName: string
}): JSX.Element {
  const saveProfile = (activeProfile: number, mods: WorkshopMod[]): void => {
    const id = notifications.show({
      loading: true,
      title: 'Saving profile',
      message: 'Profile is being saved, you cannot close this yet',
      autoClose: false,
      withCloseButton: false
    })
    window.electron.ipcRenderer.send('saveProfile', { activeProfile, mods })

    window.electron.ipcRenderer.on('saveProfile', () => {
      notifications.update({
        id,
        color: 'teal',
        title: 'Profile was succefully saved',
        message: 'Notification will close in 2 seconds',
        icon: <IconCheck style={{ width: rem(18), height: rem(18) }} />,
        loading: false,
        autoClose: 2000
      })
    })
  }

  return (
    <Grid style={{ marginTop: '10px', position: 'sticky', top: 0, zIndex: 1 }}>
      <Grid.Col style={{ marginLeft: '10px' }} span={1}>
        <Flex justify={'flex-start'} align={'center'}>
          <ActionIcon
            variant="filled"
            aria-label="Go back"
            onClick={() => setActiveProfile(0)}
            style={{ marginRight: '5px' }}
          >
            <IconArrowLeft />
          </ActionIcon>
          <ActionIcon variant="filled" onClick={() => saveProfile(activeProfile, validatedMods)}>
            <IconDeviceFloppy />
          </ActionIcon>
        </Flex>
      </Grid.Col>
      <Grid.Col span={'auto'}>
        <Flex justify={'center'} align={'center'}>
          <Title order={5}>{profileName}</Title>
        </Flex>
      </Grid.Col>
      <Grid.Col style={{ marginRight: '10px' }} span={1}>
        <Flex justify={'flex-end'} align={'center'}>
          <ExportButton mods={validatedMods} profileName={profileName} />
        </Flex>
      </Grid.Col>
    </Grid>
  )
}
