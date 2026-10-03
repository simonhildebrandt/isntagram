import { Box, Flex, HStack, Text } from '@chakra-ui/react'
import { NavLink, Link as RouterLink } from 'react-router-dom'
import type { ReactNode } from 'react'
import { Logo } from './CenteredCard'
import { useMe } from '../providers/AuthProvider'

const NAV = [
  { to: '/', label: 'Folders' },
  { to: '/upload', label: 'Upload' },
  { to: '/sizes', label: 'Sizes' },
  { to: '/people', label: 'People' },
  { to: '/settings', label: 'Settings' },
]

// Layout 1b: top nav on desktop, header plus tab strip on mobile.
export function Shell({ children }: { children: ReactNode }) {
  const me = useMe()

  const tabs = NAV.map(n => (
    <NavLink key={n.to} to={n.to} end={n.to === '/'} style={{ display: 'flex' }}>
      {({ isActive }) => (
        <Flex
          align="center" px={3} whiteSpace="nowrap"
          fontWeight={isActive ? 600 : 500}
          color={isActive ? '#18181b' : '#52525b'}
          boxShadow={isActive ? 'inset 0 -2px 0 var(--chakra-colors-brand-500)' : undefined}
        >
          {n.label}
        </Flex>
      )}
    </NavLink>
  ))

  return (
    <Flex direction="column" minH="100vh">
      <Flex
        as="header" h={{ base: '56px', md: '64px' }} flex="none" bg="white" borderBottom="1px solid #e6e6ea"
        align="center" gap={8} px={{ base: 4, md: 8 }} position="sticky" top={0} zIndex={10}
      >
        <RouterLink to="/"><Logo /></RouterLink>
        <HStack as="nav" spacing={1} h="100%" display={{ base: 'none', md: 'flex' }}>{tabs}</HStack>
        <RouterLink to="/settings" style={{ marginLeft: 'auto' }}>
          <Flex w="32px" h="32px" borderRadius="50%" bg="#e4e4e7" align="center" justify="center">
            <Text fontSize="12px" fontWeight={600} textTransform="uppercase">{me.handle?.slice(0, 2)}</Text>
          </Flex>
        </RouterLink>
      </Flex>
      <HStack
        as="nav" h="46px" flex="none" bg="white" borderBottom="1px solid #e6e6ea" spacing={1} px={2}
        overflowX="auto" display={{ base: 'flex', md: 'none' }}
      >
        {tabs}
      </HStack>
      <Box as="main" flex={1} p={{ base: 4, md: 10 }}>
        <Box maxW="1120px" mx="auto">{children}</Box>
      </Box>
    </Flex>
  )
}
