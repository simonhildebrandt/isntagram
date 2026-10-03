import { Box, Flex, HStack, Text } from '@chakra-ui/react'
import type { ReactNode } from 'react'

export function Logo() {
  return (
    <HStack spacing={2}>
      <Box w="12px" h="12px" borderRadius="3px" bg="brand.500" />
      <Text fontWeight={700} fontSize="17px" letterSpacing="-0.02em">isntagram</Text>
    </HStack>
  )
}

// Standalone screens outside the app shell: sign-in, choosing a handle, errors.
export function CenteredCard({ children }: { children: ReactNode }) {
  return (
    <Flex minH="100vh" align="center" justify="center" px={4} direction="column" gap={6}>
      <Logo />
      <Box w="100%" maxW="420px" bg="white" border="1px solid #e6e6ea" borderRadius="14px" p={6}>
        {children}
      </Box>
    </Flex>
  )
}
