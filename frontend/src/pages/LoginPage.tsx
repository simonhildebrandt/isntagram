import { useEffect } from 'react'
import { Button, Text, VStack } from '@chakra-ui/react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../providers/AuthProvider'
import { CenteredCard } from '../components/CenteredCard'
import { loginUrl } from '../loginWithLink'

export default function LoginPage() {
  const [params] = useSearchParams()
  const location = useLocation()
  const { login } = useAuth()
  const navigate = useNavigate()
  const token = params.get('lwl-token')
  const returnTo = (location.state as { from?: string } | null)?.from ?? '/'

  // Login-With.Link redirects back here with the token and the state we passed out.
  useEffect(() => {
    if (!token) return
    login(token)
    const state = params.get('lwl-state')
    navigate(state && state.startsWith('/') ? state : '/', { replace: true })
  }, [])

  if (token) return <CenteredCard><Text color="#52525b">Signing in…</Text></CenteredCard>

  return (
    <CenteredCard>
      <VStack align="stretch" spacing={4}>
        <VStack align="stretch" spacing={1}>
          <Text fontSize="18px" fontWeight={650}>Sign in</Text>
          <Text color="#52525b">
            {params.get('error') === 'auth'
              ? 'Your session has expired. Sign in again to continue.'
              : 'We\'ll email you a sign-in link.'}
          </Text>
        </VStack>
        <Button as="a" href={loginUrl(returnTo)}>Sign in with email</Button>
      </VStack>
    </CenteredCard>
  )
}
