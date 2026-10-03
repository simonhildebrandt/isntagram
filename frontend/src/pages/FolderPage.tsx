import { Box, Button, Center, HStack, Link, Menu, MenuButton, MenuItem, MenuList, Spinner, Text, useDisclosure, VStack } from '@chakra-ui/react'
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom'
import { deleteFolder, getFolder, renameFolder } from '../api/folders'
import { PageHeader } from '../components/PageHeader'
import { ConfirmDialog, NameDialog } from '../components/Dialogs'
import { ImageGrid } from '../components/ImageGrid'
import { useUploads } from '../providers/UploadProvider'
import { useAuth } from '../providers/AuthProvider'
import { formatBytes, plural, timeAgo } from '../format'
import { useLoad } from '../useLoad'

export default function FolderPage() {
  const id = Number(useParams().id)
  const { version } = useUploads()
  const { refresh } = useAuth()
  const { data: folder, error, reload } = useLoad(() => getFolder(id), [id, version])
  const rename = useDisclosure()
  const remove = useDisclosure()
  const navigate = useNavigate()

  if (error) return <Text color="red.600">{error}</Text>
  if (!folder) return <Center py={10}><Spinner color="brand.500" /></Center>

  return (
    <VStack align="stretch" spacing="22px">
      <HStack fontSize="13px" color="#52525b" spacing="6px">
        <Link as={RouterLink} to="/" color="brand.600">Folders</Link><Text>/</Text><Text noOfLines={1}>{folder.name}</Text>
      </HStack>
      <PageHeader
        title={folder.name}
        subtitle={`${plural(folder.imageCount, 'image')} · ${formatBytes(folder.sizeBytes)} · updated ${timeAgo(folder.updatedAt)}`}
        actions={<>
          <Menu placement="bottom-end">
            <MenuButton as={Button} variant="outline" colorScheme="gray" bg="white">More</MenuButton>
            <MenuList>
              <MenuItem onClick={rename.onOpen}>Rename</MenuItem>
              <MenuItem color="#c2410c" onClick={remove.onOpen}>Delete folder</MenuItem>
            </MenuList>
          </Menu>
          <Button as={RouterLink} to={`/upload?folder=${folder.id}`}>Upload</Button>
        </>}
      />
      {folder.images.length === 0
        ? (
          <Box bg="white" border="1.5px dashed #b9b9c6" borderRadius="14px" p={{ base: 8, md: 14 }} textAlign="center">
            <Text fontSize="16px" fontWeight={600}>This folder is empty</Text>
            <Text color="#52525b">Upload images to add them here.</Text>
          </Box>
        )
        : <ImageGrid images={folder.images} />}
      <NameDialog
        isOpen={rename.isOpen} onClose={rename.onClose} title="Rename folder" initial={folder.name} submitLabel="Rename"
        onSubmit={async name => { await renameFolder(folder.id, name); reload() }}
      />
      <ConfirmDialog
        isOpen={remove.isOpen} onClose={remove.onClose} title={`Delete ${folder.name}?`} confirmLabel="Delete folder"
        body={folder.imageCount
          ? `This deletes its ${plural(folder.imageCount, 'image')}, and every link to them will stop working. This can't be undone.`
          : 'This folder is empty.'}
        onConfirm={async () => { await deleteFolder(folder.id); refresh(); navigate('/', { replace: true }) }}
      />
    </VStack>
  )
}
