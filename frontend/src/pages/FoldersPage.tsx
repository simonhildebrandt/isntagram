import { Box, Button, Center, Flex, Grid, Image, Spinner, Text, useDisclosure, VStack } from '@chakra-ui/react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { createFolder, listFolders, type FolderSummary } from '../api/folders'
import { PageHeader } from '../components/PageHeader'
import { NameDialog } from '../components/Dialogs'
import { placeholderBg } from '../components/ImageGrid'
import { useUploads } from '../providers/UploadProvider'
import { formatBytes, plural, timeAgo } from '../format'
import { useLoad } from '../useLoad'

function Cover({ url }: { url?: string }) {
  return url
    ? <Image src={url} alt="" loading="lazy" objectFit="cover" w="100%" h="100%" minH={0} bg={placeholderBg} />
    : <Box bg={placeholderBg} w="100%" h="100%" />
}

function FolderCard({ folder }: { folder: FolderSummary }) {
  const [a, b, c] = folder.coverUrls
  return (
    <Box as={RouterLink} to={`/folders/${folder.id}`} bg="white" border="1px solid #e6e6ea" borderRadius="12px" overflow="hidden" display="flex" flexDirection="column">
      <Grid templateColumns="2fr 1fr" templateRows="1fr 1fr" gap="2px" aspectRatio={16 / 10}>
        <Box gridRow="span 2" minH={0}><Cover url={a} /></Box>
        <Box minH={0}><Cover url={b} /></Box>
        <Box minH={0}><Cover url={c} /></Box>
      </Grid>
      <Box px="14px" pt="12px" pb="14px">
        <Text fontWeight={600} noOfLines={1}>{folder.name}</Text>
        <Text fontSize="12.5px" color="#52525b">
          {plural(folder.imageCount, 'image')} · {formatBytes(folder.sizeBytes)} · {timeAgo(folder.updatedAt)}
        </Text>
        {folder.presetNames.length > 0 && (
          <Flex wrap="wrap" gap="4px" mt="8px">
            {folder.presetNames.map(name => (
              <Text key={name} fontFamily="mono" fontSize="11px" px="7px" py="2px" borderRadius="5px" bg="#f4f4f5" color="#3f3f46">{name}</Text>
            ))}
          </Flex>
        )}
      </Box>
    </Box>
  )
}

export default function FoldersPage() {
  const { version } = useUploads()
  const { data: folders, error } = useLoad(listFolders, [version])
  const newFolder = useDisclosure()
  const navigate = useNavigate()

  const totals = folders && {
    images: folders.reduce((n, f) => n + f.imageCount, 0),
    bytes: folders.reduce((n, f) => n + f.sizeBytes, 0),
  }

  return (
    <VStack align="stretch" spacing="22px">
      <PageHeader
        title="Folders"
        subtitle={folders && totals && `${plural(folders.length, 'folder')} · ${plural(totals.images, 'image')} · ${formatBytes(totals.bytes)}`}
        actions={<>
          <Button variant="outline" colorScheme="gray" bg="white" onClick={newFolder.onOpen}>New folder</Button>
          <Button as={RouterLink} to="/upload">Upload</Button>
        </>}
      />
      {error && <Text color="red.600">{error}</Text>}
      {!folders && !error && <Center py={10}><Spinner color="brand.500" /></Center>}
      {folders?.length === 0 && (
        <Box bg="white" border="1.5px dashed #b9b9c6" borderRadius="14px" p={{ base: 8, md: 14 }} textAlign="center">
          <Text fontSize="16px" fontWeight={600}>No folders yet</Text>
          <Text color="#52525b">Upload a zip to create a folder from it, or create an empty one.</Text>
        </Box>
      )}
      {!!folders?.length && (
        <Grid templateColumns="repeat(auto-fill, minmax(min(100%, 230px), 1fr))" gap="16px">
          {folders.map(f => <FolderCard key={f.id} folder={f} />)}
        </Grid>
      )}
      <NameDialog
        isOpen={newFolder.isOpen} onClose={newFolder.onClose} title="New folder" submitLabel="Create"
        onSubmit={async name => navigate(`/folders/${(await createFolder(name)).id}`)}
      />
    </VStack>
  )
}
