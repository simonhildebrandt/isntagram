import { Box, Center, Input, Link, Spinner, Text, VStack, Wrap } from '@chakra-ui/react'
import { Link as RouterLink, useSearchParams } from 'react-router-dom'
import { search } from '../api/images'
import { ImageGrid } from '../components/ImageGrid'
import { PageHeader } from '../components/PageHeader'
import { useLoad } from '../useLoad'

export default function SearchPage() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const { data, error } = useLoad(() => search(q), [q])

  return (
    <VStack align="stretch" spacing="22px">
      <PageHeader title="Search" />
      <Input
        defaultValue={q} key={q} placeholder="Search folder and image names" bg="white" autoFocus={!q}
        onKeyDown={e => { if (e.key === 'Enter') setParams({ q: e.currentTarget.value }) }}
      />
      {error && <Text color="red.600">{error}</Text>}
      {q && !data && !error && <Center py={10}><Spinner color="brand.500" /></Center>}
      {data && q && (
        <>
          {data.folders.length > 0 && (
            <Box>
              <Text fontWeight={600} mb={2}>Folders</Text>
              <Wrap spacing={2}>
                {data.folders.map(f => (
                  <Link key={f.id} as={RouterLink} to={`/folders/${f.id}`} px={3} py={1} bg="white" border="1px solid #e6e6ea" borderRadius="16px">
                    {f.name}
                  </Link>
                ))}
              </Wrap>
            </Box>
          )}
          {data.images.length > 0 && (
            <Box>
              <Text fontWeight={600} mb={2}>Images</Text>
              <ImageGrid images={data.images} />
            </Box>
          )}
          {!data.folders.length && !data.images.length && <Text color="#52525b">Nothing matches “{q}”.</Text>}
        </>
      )}
    </VStack>
  )
}
