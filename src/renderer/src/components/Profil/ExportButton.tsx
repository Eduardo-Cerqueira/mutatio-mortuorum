import { WorkshopMod } from '@renderer/App'
import { ActionIcon } from '@mantine/core'
import { IconFileDownload } from '@tabler/icons-react'

export default function ExportButton({
  profileName,
  mods
}: {
  profileName: string
  mods: WorkshopMod[]
}): JSX.Element {
  const modsId = mods.map((mod) => {
    return { publishedFileId: mod.publishedFileId }
  })

  const createJSON = (): string => {
    return (
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(
        JSON.stringify({ profileName, mods: modsId }, (_, value) =>
          typeof value === 'bigint' ? value.toString() : value
        )
      )
    )
  }

  return (
    <>
      <a download={`${profileName}.json`} href={createJSON()}>
        <ActionIcon variant="filled">
          <IconFileDownload />
        </ActionIcon>
      </a>
    </>
  )
}
