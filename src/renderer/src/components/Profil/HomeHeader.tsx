import React from 'react'
import { Profile } from '@renderer/App'
import ImportButton from './ImportButton'
import AddButton from './AddButton'
import { Flex, Group } from '@mantine/core'

export default function HomeHeader({
  profiles,
  setProfiles
}: {
  profiles: Profile[]
  setProfiles: React.Dispatch<React.SetStateAction<Profile[]>>
}): JSX.Element {
  return (
    <Flex direction={'column'} align={'center'} style={{ marginBottom: '20px' }}>
      <h3>Profile selection</h3>
      <h5>Manage and share mods easily</h5>
      <Group justify="center" gap="xs">
        <AddButton profiles={profiles} setProfiles={setProfiles} />
        <ImportButton profiles={profiles} setProfiles={setProfiles} />
      </Group>
      <div />
    </Flex>
  )
}
