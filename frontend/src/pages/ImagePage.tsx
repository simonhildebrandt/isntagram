import { useRef, useState } from 'react'
import {
  Box, Button, Center, Flex, HStack, Image, Link, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, ModalOverlay,
  Select, Spinner, Text, useDisclosure, VStack,
} from '@chakra-ui/react'
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom'
import { deleteImage, getImage, moveImage, previewUrl, replaceImageFile } from '../api/images'
import { listFolders } from '../api/folders'
import { errorMessage } from '../api/client'
import { Panel } from '../components/PageHeader'
import { ConfirmDialog } from '../components/Dialogs'
import { CopyField } from '../components/CopyField'
import { placeholderBg } from '../components/ImageGrid'
import { useAuth } from '../providers/AuthProvider'
import { IMAGE_ACCEPT, prepareImage } from '../imageFiles'
import { formatBytes, formatDate } from '../format'
import { useLoad } from '../useLoad'

const FORMATS: Record<string, string> = {
  'image/jpeg': 'JPEG', 'image/png': 'PNG', 'image/webp': 'WebP', 'image/gif': 'GIF', 'image/avif': 'AVIF',
}

export default function ImagePage() {
  const id = Number(useParams().id)
  const { data: image, error, reload } = useLoad(() => getImage(id), [id])
  const { refresh } = useAuth()
  const navigate = useNavigate()
  const move = useDisclosure()
  const remove = useDisclosure()
  const fileInput = useRef<HTMLInputElement>(null)
  const [replacing, setReplacing] = useState<number | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  if (error) return <Text color="red.600">{error}</Text>
  if (!image) return <Center py={10}><Spinner color="brand.500" /></Center>

  const replace = async (file: File | undefined) => {
    if (!file) return
    setActionError(null)
    setReplacing(0)
    try {
      await replaceImageFile(image.id, await prepareImage(file, file.name), setReplacing)
      reload()
      refresh()
    } catch (err) {
      setActionError(errorMessage(err, err instanceof Error ? err.message : undefined))
    } finally {
      setReplacing(null)
    }
  }

  return (
    <VStack align="stretch" spacing="22px">
      <HStack fontSize="13px" color="#52525b" spacing="6px" flexWrap="wrap">
        <Link as={RouterLink} to="/" color="brand.600">Folders</Link><Text>/</Text>
        <Link as={RouterLink} to={`/folders/${image.folder.id}`} color="brand.600">{image.folder.name}</Link><Text>/</Text>
        <Text overflowWrap="anywhere">{image.name}</Text>
      </HStack>
      <Flex wrap="wrap" gap="24px" align="flex-start">
        <VStack flex="1 1 440px" minW={0} align="stretch" spacing="10px">
          <Image src={previewUrl(image)} alt={image.name} borderRadius="12px" bg={placeholderBg} maxH="70vh" objectFit="contain" />
          <Flex wrap="wrap" gap="6px 20px" fontSize="13px" color="#52525b">
            <Text>{image.width} × {image.height}</Text>
            <Text>{formatBytes(image.sizeBytes)}</Text>
            <Text>{FORMATS[image.contentType] ?? image.contentType}</Text>
            <Text>Uploaded {formatDate(image.createdAt)}</Text>
          </Flex>
        </VStack>
        <VStack flex="1 1 340px" maxW="440px" minW={0} align="stretch" spacing="16px">
          <Box>
            <Text as="h1" fontSize="22px" fontWeight={650} letterSpacing="-0.02em" overflowWrap="anywhere">{image.name}</Text>
            <Text color="#52525b">Each size has its own direct link.</Text>
          </Box>
          <Panel>
            <VStack align="stretch" spacing="7px" px="14px" py="12px">
              <HStack spacing={2} align="baseline">
                <Text fontFamily="mono" fontWeight={500} fontSize="13px">original</Text>
                <Text fontSize="12.5px" color="#52525b">{image.width} × {image.height}</Text>
                <Text ml="auto" fontSize="11.5px" color="#71717a">{formatBytes(image.sizeBytes)}</Text>
              </HStack>
              <CopyField value={image.url} />
            </VStack>
          </Panel>
          <HStack spacing={4} fontSize="13px">
            <Link color="brand.600" onClick={() => fileInput.current?.click()}>
              {replacing === null ? 'Replace file' : `Replacing… ${Math.round(replacing * 100)}%`}
            </Link>
            <Link color="brand.600" onClick={move.onOpen}>Move</Link>
            <Link color="#c2410c" onClick={remove.onOpen}>Delete</Link>
          </HStack>
          {actionError && <Text color="red.600" fontSize="13px">{actionError}</Text>}
          <input
            ref={fileInput} type="file" accept={IMAGE_ACCEPT} hidden
            onChange={e => { replace(e.target.files?.[0]); e.target.value = '' }}
          />
        </VStack>
      </Flex>
      <MoveDialog
        isOpen={move.isOpen} onClose={move.onClose} currentFolderId={image.folder.id}
        onMove={async folderId => { await moveImage(image.id, folderId); reload() }}
      />
      <ConfirmDialog
        isOpen={remove.isOpen} onClose={remove.onClose} title={`Delete ${image.name}?`} confirmLabel="Delete image"
        body="Every link to this image will stop working. This can't be undone."
        onConfirm={async () => { await deleteImage(image.id); refresh(); navigate(`/folders/${image.folder.id}`, { replace: true }) }}
      />
    </VStack>
  )
}

function MoveDialog({ isOpen, onClose, currentFolderId, onMove }: {
  isOpen: boolean; onClose: () => void; currentFolderId: number; onMove: (folderId: number) => Promise<void>
}) {
  const { data: folders } = useLoad(() => isOpen ? listFolders() : Promise.resolve(null), [isOpen])
  const [target, setTarget] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const options = folders?.filter(f => f.id !== currentFolderId) ?? []

  const submit = async () => {
    const folderId = target ?? options[0]?.id
    if (!folderId) return
    setBusy(true)
    try {
      await onMove(folderId)
      onClose()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent mx={4}>
        <ModalHeader fontSize="18px">Move to folder</ModalHeader>
        <ModalBody>
          <VStack align="stretch" spacing={3}>
            {folders && !options.length
              ? <Text color="#52525b">There are no other folders to move this image to.</Text>
              : <Select value={target ?? options[0]?.id ?? ''} onChange={e => setTarget(Number(e.target.value))}>
                  {options.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </Select>}
            <Text fontSize="13px" color="#52525b">Its link stays the same.</Text>
            {error && <Text color="red.600" fontSize="13px">{error}</Text>}
          </VStack>
        </ModalBody>
        <ModalFooter gap={2}>
          <Button variant="outline" colorScheme="gray" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} isLoading={busy} isDisabled={!options.length}>Move</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
