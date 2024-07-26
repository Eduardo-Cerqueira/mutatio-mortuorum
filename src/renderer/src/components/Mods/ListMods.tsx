import { WorkshopMod } from '@renderer/App'
import { Accordion, Input, SimpleGrid } from '@mantine/core'
import ModRow from './ModRow'
import { useEffect, useState } from 'react'
import { IconSearch } from '@tabler/icons-react'
import { FixedSizeList as List } from 'react-window'
import { useViewportSize } from '@mantine/hooks'

export default function ListMods({
  workshopItems,
  validatedMods,
  setValidatedMods
}: {
  workshopItems: WorkshopMod[]
  validatedMods: WorkshopMod[]
  setValidatedMods: React.Dispatch<React.SetStateAction<WorkshopMod[]>>
}): JSX.Element {
  const [search, setSearch] = useState('')
  const [sortedData, setSortedData] = useState(workshopItems)

  const { height, width } = useViewportSize()

  const filterData = (data: WorkshopMod[], search: string): WorkshopMod[] => {
    const query = search.toLowerCase().trim()
    return data.filter(
      (item) =>
        item.title.toLowerCase().includes(query) || item.publishedFileId.toString().includes(query)
    )
  }

  useEffect(() => {
    setSortedData(filterData(workshopItems, search))
  }, [search])

  return (
    <div>
      <Input
        value={search}
        style={{ position: 'sticky', top: 40, zIndex: 1, marginInline: 10 }}
        onChange={(event) => setSearch(event.currentTarget.value)}
        placeholder="Search"
        leftSection={<IconSearch size={16} />}
      />
      <SimpleGrid cols={1} spacing="sm">
        <Accordion>
          <List
            innerElementType="ul"
            itemCount={sortedData.length}
            itemData={sortedData}
            itemSize={80}
            height={height}
            width={width}
          >
            {({ index, style, data }) => (
              <ModRow
                style={style}
                key={data[index].publishedFileId}
                item={data[index]}
                validatedMods={validatedMods}
                setValidatedMods={setValidatedMods}
                setSearch={setSearch}
              />
            )}
          </List>
        </Accordion>
      </SimpleGrid>
    </div>
  )
}
