import { Profile } from '@renderer/App'
import ActivateButton from './ActivateButton'
import DeleteButton from './DeleteButton'
import EditButton from './EditButton'
import { Flex, Grid, Group, Title } from '@mantine/core'

export default function ProfileSelection({
  profiles,
  setProfiles,
  setActiveProfile,
  currentProfile,
  setCurrentProfile
}: {
  profiles: Profile[]
  setProfiles: React.Dispatch<React.SetStateAction<Profile[]>>
  setActiveProfile: React.Dispatch<React.SetStateAction<number>>
  currentProfile: number
  setCurrentProfile: React.Dispatch<React.SetStateAction<number>>
}): JSX.Element {
  return (
    <div>
      {profiles.map((profile) => (
        <Grid key={profile.id}>
          <Grid.Col style={{ marginLeft: '10px' }} span={'content'}>
            <Flex h={'100%'} justify={'flex-end'} align={'center'}>
              <ActivateButton
                profileId={profile.id}
                currentProfile={currentProfile}
                setCurrentProfile={setCurrentProfile}
              />
            </Flex>
          </Grid.Col>
          <Grid.Col span={'content'}>
            <Flex h={'100%'} justify={'center'} align={'center'}>
              <Title order={5} onClick={() => setActiveProfile(profile.id)}>
                {profile.name}
              </Title>
            </Flex>
          </Grid.Col>
          <Grid.Col style={{ marginRight: '10px' }} span={'auto'}>
            <Flex direction={'row'} h={'100%'} justify={'flex-end'} align={'center'}>
              <Group justify="center" gap="xs">
                <EditButton profile={profile} profiles={profiles} setProfiles={setProfiles} />
                <DeleteButton profile={profile} profiles={profiles} setProfiles={setProfiles} />
              </Group>
            </Flex>
          </Grid.Col>
        </Grid>
      ))}
    </div>
  )
}
