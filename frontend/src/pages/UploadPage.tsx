import { useEffect, useRef, useState } from 'react'
import { Badge, Box, Button, Flex, HStack, Input, Link, Progress, Select, Text, VStack } from '@chakra-ui/react'
import { Link as RouterLink, useSearchParams } from 'react-router-dom'
import { createFolder, listFolders } from '../api/folders'
import { errorMessage } from '../api/client'
import { PageHeader, Panel } from '../components/PageHeader'
import { useUploads, type UploadItem } from '../providers/UploadProvider'
import { ACCEPT, imageType, isZip } from '../imageFiles'
import { plural } from '../format'
import { useLoad } from '../useLoad'

const NEW_FOLDER = 'new'

export default function UploadPage() {
  const [params] = useSearchParams()
  const { items, version, addZip, addImages, clearFinished } = useUploads()
  const { data: folders } = useLoad(listFolders, [version])
  const [target, setTarget] = useState<string>(params.get('folder') ?? '')
  const [newName, setNewName] = useState('')
  const [dragging, setDragging] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  // Default to the most recently updated folder, or a new one if there are none.
  useEffect(() => {
    if (folders && !target) setTarget(folders[0] ? String(folders[0].id) : NEW_FOLDER)
  }, [folders, target])

  const handleFiles = async (files: File[]) => {
    setMessage(null)
    const zips = files.filter(isZip)
    const images = files.filter(f => !isZip(f) && imageType(f.name))
    const skipped = files.length - zips.length - images.length

    zips.forEach(addZip)
    if (images.length) {
      try {
        let folderId = Number(target)
        if (target === NEW_FOLDER) {
          if (!newName.trim()) {
            setMessage('Name the new folder for your images first.')
            return
          }
          folderId = (await createFolder(newName.trim())).id
          setTarget(String(folderId))
          setNewName('')
        }
        addImages(images, folderId)
      } catch (err) {
        setMessage(errorMessage(err))
        return
      }
    }
    if (skipped) setMessage(`Skipped ${plural(skipped, 'file')} that ${skipped === 1 ? "isn't an image or a zip" : "aren't images or zips"}.`)
  }

  const done = items.filter(i => i.state === 'done' || i.state === 'error').length

  return (
    <VStack align="stretch" spacing="22px">
      <PageHeader title="Upload" subtitle="Add images to a folder, or upload a .zip to create a new one." />
      <VStack
        border="1.5px dashed" borderColor={dragging ? 'brand.500' : '#b9b9c6'} bg={dragging ? 'brand.50' : 'white'}
        borderRadius="14px" py={{ base: 8, md: 14 }} px={5} spacing="10px" textAlign="center"
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleFiles([...e.dataTransfer.files]) }}
      >
        <Text fontSize="18px" fontWeight={600}>Drop images or a .zip here</Text>
        <Text color="#52525b" maxW="420px">JPG, PNG, WebP, GIF or AVIF up to 50 MB each. A zip becomes a folder named after the archive.</Text>
        <Button mt="6px" onClick={() => fileInput.current?.click()}>Choose files</Button>
        <input
          ref={fileInput} type="file" multiple accept={ACCEPT} hidden
          onChange={e => { handleFiles([...(e.target.files ?? [])]); e.target.value = '' }}
        />
      </VStack>

      <Flex wrap="wrap" gap="10px" align="center">
        <Text fontSize="13px" color="#52525b">Single images go to</Text>
        <Select value={target} onChange={e => setTarget(e.target.value)} w="auto" maxW="100%" bg="white" fontWeight={500}>
          {folders?.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          <option value={NEW_FOLDER}>New folder…</option>
        </Select>
        {target === NEW_FOLDER && (
          <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="New folder name" w="240px" maxW="100%" bg="white" />
        )}
      </Flex>
      {message && <Text color="#c2410c" fontSize="13px">{message}</Text>}

      {items.length > 0 && (
        <Panel>
          <HStack px="14px" py="12px" borderBottom="1px solid #f0f0f2" fontSize="13px" justify="space-between">
            <Text fontWeight={600}>Uploading {plural(items.length, 'item')}</Text>
            <HStack spacing={4}>
              <Text color="#52525b">{done} of {items.length} done</Text>
              {done > 0 && <Link color="brand.600" onClick={clearFinished}>Clear finished</Link>}
            </HStack>
          </HStack>
          {items.map(item => <QueueRow key={item.id} item={item} />)}
        </Panel>
      )}
    </VStack>
  )
}

function QueueRow({ item }: { item: UploadItem }) {
  const finished = item.state === 'done' || item.state === 'error'
  return (
    <VStack align="stretch" spacing="8px" px="14px" py="12px" borderBottom="1px solid #f0f0f2" _last={{ borderBottom: 'none' }}>
      <Flex gap="10px" align="baseline" wrap="wrap">
        <Badge fontFamily="mono" fontSize="10.5px" fontWeight={400} bg="#f4f4f5" color="#52525b" textTransform="uppercase">{item.kind}</Badge>
        <Box fontWeight={500} minW={0} overflowWrap="anywhere">
          {finished && item.folderId
            ? <Link as={RouterLink} to={`/folders/${item.folderId}`}>{item.name}</Link>
            : item.name}
        </Box>
        <Text ml="auto" fontSize="12.5px" color={item.state === 'error' ? '#c2410c' : '#52525b'}>{item.status}</Text>
      </Flex>
      <Progress
        value={item.progress * 100} size="xs" borderRadius="3px" bg="#f0f0f2"
        colorScheme={item.state === 'error' ? 'orange' : 'brand'}
      />
    </VStack>
  )
}
