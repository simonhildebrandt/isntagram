import { Box, Button, Flex, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { useAuth, useMe } from '../providers/AuthProvider'
import { formatBytes } from '../format'

function Row({ title, detail, children }: { title: string; detail: string; children: ReactNode }) {
  return (
    <Flex px="18px" py={4} wrap="wrap" gap="10px" align="center" justify="space-between" borderBottom="1px solid #f0f0f2" _last={{ borderBottom: 'none' }}>
      <Box flex="1 1 220px" minW={0}>
        <Text fontWeight={600}>{title}</Text>
        <Text fontSize="13px" color="#52525b" overflowWrap="anywhere">{detail}</Text>
      </Box>
      {children}
    </Flex>
  )
}

export default function SettingsPage() {
  const me = useMe()
  const { logout } = useAuth()

  return (
    <VStack align="stretch" spacing={5}>
      <Heading size="lg">Settings</Heading>
      <Box bg="white" border="1px solid #e6e6ea" borderRadius="12px">
        <Row title="Account" detail={`Signed in as ${me.email} via login-with.link`}>
          <Button variant="outline" colorScheme="gray" onClick={logout}>Sign out</Button>
        </Row>
        <Row title="Public link domain" detail="Used for every shared image URL">
          <Text fontFamily="mono" fontSize="13px" px={3} py={2} maxW="100%" overflowWrap="anywhere" border="1px solid #e6e6ea" borderRadius="8px" bg="#fafafa">
            {me.linkHost}
          </Text>
        </Row>
        <Row
          title="Storage"
          detail={`${formatBytes(me.usedBytes)} used${me.allocatedBytes ? ` · ${formatBytes(me.allocatedBytes)} given to people you sponsor` : ''} · ${formatBytes(Math.max(0, me.availableBytes))} free`}
        >
          <Text fontWeight={600}>{formatBytes(me.quotaBytes)}</Text>
        </Row>
        <Box px="18px" pb={4}>
          <HStack h="10px" borderRadius="5px" bg="#f0f0f2" spacing="2px" overflow="hidden">
            <Box h="100%" w={`${(me.usedBytes / me.quotaBytes) * 100}%`} bg="brand.500" />
            <Box h="100%" w={`${(me.allocatedBytes / me.quotaBytes) * 100}%`} bg="brand.300" />
          </HStack>
        </Box>
      </Box>
    </VStack>
  )
}
