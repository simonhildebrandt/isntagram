import { Button, Center, Spinner, Text, VStack } from '@chakra-ui/react'
import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../providers/AuthProvider'
import { CenteredCard } from './CenteredCard'

// Gate for signed-in pages: sends people to sign in or choose a handle first.
export function RequireUser({ children, allowNoHandle = false }: { children: ReactNode; allowNoHandle?: boolean }) {
  const { status, me, logout, refresh } = useAuth()
  const location = useLocation()

  if (status === 'signed-out') return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (status === 'loading') return <Center minH="100vh"><Spinner color="brand.500" /></Center>

  if (status === 'not-invited' || status === 'removed') {
    return (
      <CenteredCard>
        <VStack align="stretch" spacing={4}>
          <Text fontSize="18px" fontWeight={650}>{status === 'removed' ? 'Your access has ended' : 'You need an invite'}</Text>
          <Text color="#52525b">
            {status === 'removed'
              ? 'The person who sponsored your space has removed you. Ask them, or someone else who uses Isntagram, to invite you again.'
              : 'Isntagram is invite-only. Ask someone who already uses it to sponsor you, then sign in again.'}
          </Text>
          <Button variant="outline" onClick={logout}>Use a different email</Button>
        </VStack>
      </CenteredCard>
    )
  }

  if (status === 'error' || !me) {
    return (
      <CenteredCard>
        <VStack align="stretch" spacing={4}>
          <Text fontSize="18px" fontWeight={650}>Couldn't load your account</Text>
          <Button onClick={refresh}>Try again</Button>
        </VStack>
      </CenteredCard>
    )
  }

  if (!me.handle && !allowNoHandle) return <Navigate to="/welcome" replace />
  return <>{children}</>
}
