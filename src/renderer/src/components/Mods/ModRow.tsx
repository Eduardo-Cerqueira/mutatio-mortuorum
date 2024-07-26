import {
  Accordion,
  Avatar,
  Badge,
  Checkbox,
  Flex,
  Grid,
  Group,
  Indicator,
  Text
} from '@mantine/core'
import { WorkshopMod } from '@renderer/App'
import { useEffect, useState } from 'react'

interface AccordionLabelProps {
  label: string
  image: string | undefined
  tags: string[]
  conflicts: string[] | null
  hasConflicts: boolean
  setSearch: React.Dispatch<React.SetStateAction<string>>
}

function AccordionLabel({
  label,
  image,
  tags,
  conflicts,
  hasConflicts,
  setSearch
}: AccordionLabelProps): JSX.Element {
  return (
    <Group wrap="nowrap">
      {hasConflicts ? (
        <Indicator color="red" size={16} withBorder>
          <Avatar src={image} radius="xl" size="lg" />
        </Indicator>
      ) : (
        <Avatar src={image} radius="xl" size="lg" />
      )}
      <div>
        <Text>{label}</Text>
        <Flex gap="xs" justify="flex-start" align="center" direction="row" wrap="wrap">
          {tags.map((tag, index) => (
            <Badge key={tag + index} color="blue">
              {tag}
            </Badge>
          ))}
          {hasConflicts &&
            conflicts &&
            conflicts.map((conflict, index) => (
              <Badge key={conflict + index} color="red" onClick={() => setSearch(conflict)}>
                {conflict}
              </Badge>
            ))}
        </Flex>
      </div>
    </Group>
  )
}

export default function ModRow({
  item,
  validatedMods,
  setValidatedMods,
  setSearch,
  style
}: {
  item: WorkshopMod
  validatedMods: WorkshopMod[]
  setValidatedMods: React.Dispatch<React.SetStateAction<WorkshopMod[]>>
  setSearch: React.Dispatch<React.SetStateAction<string>>
  style: React.CSSProperties
}): JSX.Element {
  const [conflicts, setConflicts] = useState<string[]>([])

  useEffect(
    () =>
      setConflicts(
        validatedMods
          .filter(
            (validatedItem) =>
              item.conflicts.includes(validatedItem.publishedFileId.toString()) &&
              validatedItem.publishedFileId !== item.publishedFileId
          )
          .map((validatedItem) => validatedItem.publishedFileId.toString())
      ),
    [validatedMods]
  )

  return (
    <Grid key={item.publishedFileId} style={style}>
      <Grid.Col span={'auto'}>
        <Accordion.Item key={item.publishedFileId} value={item.publishedFileId.toString()}>
          <Accordion.Control>
            <AccordionLabel
              label={item.title}
              image={item.previewUrl}
              tags={item.tags}
              conflicts={conflicts}
              hasConflicts={
                validatedMods.map((mod) => mod.publishedFileId).indexOf(item.publishedFileId) !==
                  -1 && conflicts.length > 0
              }
              setSearch={setSearch}
            />
          </Accordion.Control>
          <Accordion.Panel>
            <Text size="sm">{item.description}</Text>
          </Accordion.Panel>
        </Accordion.Item>
      </Grid.Col>
      <Grid.Col span="content">
        <Flex h={'100%'} align={'center'}>
          <Checkbox
            style={{ marginRight: '10px' }}
            onChange={() => {
              if (
                validatedMods.map((mod) => mod.publishedFileId).indexOf(item.publishedFileId) === -1
              ) {
                setValidatedMods([...validatedMods, item])
              } else {
                setValidatedMods(
                  validatedMods.filter((mod) => mod.publishedFileId !== item.publishedFileId)
                )
              }
            }}
            checked={
              validatedMods.map((mod) => mod.publishedFileId).indexOf(item.publishedFileId) === -1
                ? false
                : true
            }
          />
        </Flex>
      </Grid.Col>
    </Grid>
  )
}
