import { Box, Button, Flex, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { useAuth, useMe } from '../providers/AuthProvider'
import { formatBytes } from '../format'
import { Link as RouterLink } from 'react-router-dom'
import { listPresets } from '../api/presets'
import { useLoad } from '../useLoad'

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
  const { data: presets } = useLoad(listPresets, [])
  const defaults = presets?.filter(p => p.isDefault) ?? []

  return (
    <VStack align="stretch" spacing={5}>
      <Heading size="lg">Settings</Heading>
      <Box bg="white" border="1px solid #e6e6ea" borderRadius="12px">
        <Row title="Account" detail={`Signed in as ${me.email} via login-with.link${me.sponsorEmail ? ` · sponsored by ${me.sponsorEmail}` : ''}`}>
          <Button variant="outline" colorScheme="gray" onClick={logout}>Sign out</Button>
        </Row>
        <Row title="Public link domain" detail="Used for every shared image URL">
          <Text fontFamily="mono" fontSize="13px" px={3} py={2} maxW="100%" overflowWrap="anywhere" border="1px solid #e6e6ea" borderRadius="8px" bg="#fafafa">
            {me.linkHost}
          </Text>
        </Row>
        <Row title="Default sizes for new folders" detail="Applied automatically when a folder is created">
          <HStack spacing="6px" wrap="wrap">
            {defaults.map(p => (
              <Text key={p.id} fontFamily="mono" fontSize="12px" px="10px" py="4px" borderRadius="6px" bg="brand.50" color="brand.800">{p.name}</Text>
            ))}
            <Button as={RouterLink} to="/sizes" size="sm" variant="link" colorScheme="brand">{defaults.length ? 'Change' : 'Choose'}</Button>
          </HStack>
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
