import { useEffect, useState } from 'react'
import {
  Button, FormControl, FormErrorMessage, FormHelperText, FormLabel, Input, InputGroup, InputRightAddon, Text, VStack,
} from '@chakra-ui/react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useMe, useAuth } from '../providers/AuthProvider'
import { CenteredCard } from '../components/CenteredCard'
import { checkHandle, setHandle } from '../api/me'
import { errorMessage } from '../api/client'

const APP_HOST = window.location.host

// First sign-in: choose the handle that names your image subdomain.
export default function WelcomePage() {
  const me = useMe()
  const { refresh } = useAuth()
  const navigate = useNavigate()
  const [handle, setValue] = useState(() => me.email.split('@')[0].toLowerCase().replace(/[^a-z0-9-]/g, '-'))
  const [problem, setProblem] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setProblem(null)
    if (!handle) return
    const timer = setTimeout(() => {
      checkHandle(handle).then(r => setProblem(r.available ? null : r.problem ?? 'Not available.')).catch(() => {})
    }, 300)
    return () => clearTimeout(timer)
  }, [handle])

  if (me.handle) return <Navigate to="/" replace />

  const save = async () => {
    setSaving(true)
    try {
      await setHandle(handle)
      await refresh()
      navigate('/', { replace: true })
    } catch (err) {
      setProblem(errorMessage(err))
      setSaving(false)
    }
  }

  return (
    <CenteredCard>
      <VStack as="form" align="stretch" spacing={5} onSubmit={(e) => { e.preventDefault(); save() }}>
        <VStack align="stretch" spacing={1}>
          <Text fontSize="18px" fontWeight={650}>Choose your handle</Text>
          <Text color="#52525b">Your image links will live on this address. It can't be changed later.</Text>
        </VStack>
        <FormControl isInvalid={!!problem}>
          <FormLabel fontSize="13px">Handle</FormLabel>
          <InputGroup>
            <Input
              value={handle} autoFocus fontFamily="mono" autoCapitalize="none" autoCorrect="off" spellCheck={false}
              onChange={(e) => setValue(e.target.value.toLowerCase())}
            />
            <InputRightAddon fontFamily="mono" fontSize="13px" color="#52525b">.{APP_HOST}</InputRightAddon>
          </InputGroup>
          {problem
            ? <FormErrorMessage>{problem}</FormErrorMessage>
            : <FormHelperText>Lowercase letters, numbers and hyphens.</FormHelperText>}
        </FormControl>
        <Button type="submit" isLoading={saving} isDisabled={!handle || !!problem}>Continue</Button>
      </VStack>
    </CenteredCard>
  )
}
