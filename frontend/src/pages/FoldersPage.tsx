import { Box, Heading, Text, VStack } from '@chakra-ui/react'

export default function FoldersPage() {
  return (
    <VStack align="stretch" spacing={5}>
      <Heading size="lg">Folders</Heading>
      <Box bg="white" border="1.5px dashed #b9b9c6" borderRadius="14px" p={{ base: 8, md: 14 }} textAlign="center">
        <Text fontSize="16px" fontWeight={600}>No folders yet</Text>
        <Text color="#52525b">Uploading images and zips is on its way.</Text>
      </Box>
    </VStack>
  )
}
