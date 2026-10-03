import { useState } from 'react'
import {
  Box, Button, Center, Flex, FormControl, FormLabel, HStack, Input, Link, Modal, ModalBody, ModalContent, ModalFooter,
  ModalHeader, ModalOverlay, Progress, Radio, RadioGroup, Spinner, Text, VStack,
} from '@chakra-ui/react'
import { changeAllowance, invitePerson, listPeople, removePerson, type Person } from '../api/people'
import { errorMessage } from '../api/client'
import { PageHeader, Panel } from '../components/PageHeader'
import { AllowanceInput } from '../components/AllowanceInput'
import { CopyField } from '../components/CopyField'
import { useAuth, useMe } from '../providers/AuthProvider'
import { formatBytes, peopleCount, plural, timeAgo } from '../format'
import { useLoad } from '../useLoad'

const SHADES = ['brand.500', 'brand.400', 'brand.300', 'brand.200', 'brand.600', 'brand.700']

// What someone has committed out of their allowance: their images plus what they give others.
const committed = (p: Person) => p.usedBytes + p.allocatedBytes

export default function PeoplePage() {
  const me = useMe()
  const { refresh } = useAuth()
  const { data: people, error, reload } = useLoad(listPeople, [])
  const [changing, setChanging] = useState<Person | null>(null)
  const [removing, setRemoving] = useState<Person | null>(null)

  const changed = () => { reload(); refresh() }
  const pct = (bytes: number) => `${(bytes / me.quotaBytes) * 100}%`

  return (
    <VStack align="stretch" spacing="22px">
      <PageHeader
        title="Sponsored users"
        subtitle={`People you sponsor use a share of your ${formatBytes(me.quotaBytes)}. Their allowance comes out of your space.`}
      />

      <Panel p="18px" gap="12px">
        <Flex justify="space-between" align="baseline" wrap="wrap" gap="6px">
          <Text fontWeight={600}>Your {formatBytes(me.quotaBytes)}</Text>
          <Text fontSize="13px" color="#52525b">
            {formatBytes(me.allocatedBytes)} given to {peopleCount(people?.length ?? 0)} · {formatBytes(Math.max(0, me.availableBytes))} free
          </Text>
        </Flex>
        <HStack h="12px" borderRadius="6px" bg="#f0f0f2" spacing="2px" overflow="hidden">
          <Box h="100%" w={pct(me.usedBytes)} bg="#18181b" />
          {people?.map((p, i) => <Box key={p.id} h="100%" w={pct(p.quotaBytes)} bg={SHADES[i % SHADES.length]} />)}
        </HStack>
        <Flex wrap="wrap" gap="8px 20px" fontSize="12.5px" color="#3f3f46">
          <Legend color="#18181b">You · {formatBytes(me.usedBytes)} used</Legend>
          {people?.map((p, i) => <Legend key={p.id} color={SHADES[i % SHADES.length]}>{p.handle ?? p.email} · {formatBytes(p.quotaBytes)}</Legend>)}
        </Flex>
      </Panel>

      <InviteForm availableBytes={me.availableBytes} onInvited={changed} />

      {error && <Text color="red.600">{error}</Text>}
      {!people && !error && <Center py={10}><Spinner color="brand.500" /></Center>}
      {people && people.length > 0 && (
        <Panel>
          <Text px="18px" py="12px" borderBottom="1px solid #f0f0f2" fontSize="13px" fontWeight={600}>{peopleCount(people.length)}</Text>
          {people.map(p => (
            <Flex key={p.id} px="18px" py="14px" borderBottom="1px solid #f0f0f2" _last={{ borderBottom: 'none' }} wrap="wrap" align="center" gap="10px 18px">
              <HStack flex="1 1 220px" spacing="12px" minW={0}>
                <Center w="36px" h="36px" flex="none" borderRadius="50%" bg="#e4e4e7" fontSize="12px" fontWeight={600} textTransform="uppercase">
                  {(p.handle ?? p.email).slice(0, 2)}
                </Center>
                <Box minW={0}>
                  <Text fontWeight={500} noOfLines={1}>{p.email}</Text>
                  <Text fontSize="12.5px" color="#71717a">
                    {p.activatedAt
                      ? `Active · ${plural(p.imageCount, 'image')}${p.sponsoredCount ? ` · sponsors ${peopleCount(p.sponsoredCount)}` : ''}`
                      : `Invited ${timeAgo(p.createdAt)} · hasn't signed in yet`}
                  </Text>
                </Box>
              </HStack>
              <VStack flex="1 1 180px" align="stretch" spacing="5px">
                <Text fontSize="12.5px" color="#3f3f46">{formatBytes(committed(p))} of {formatBytes(p.quotaBytes)}</Text>
                <Progress value={(committed(p) / p.quotaBytes) * 100} size="xs" borderRadius="3px" bg="#f0f0f2" colorScheme="brand" />
              </VStack>
              <HStack spacing="14px" fontSize="13px" fontWeight={500}>
                <Link color="brand.600" onClick={() => setChanging(p)}>Change allowance</Link>
                <Link color="#c2410c" onClick={() => setRemoving(p)}>Remove</Link>
              </HStack>
            </Flex>
          ))}
        </Panel>
      )}

      <AllowanceDialog person={changing} availableBytes={me.availableBytes} onClose={() => setChanging(null)} onSaved={changed} />
      <RemoveDialog person={removing} onClose={() => setRemoving(null)} onRemoved={changed} />
    </VStack>
  )
}

function Legend({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <HStack spacing="6px"><Box w="10px" h="10px" borderRadius="2px" bg={color} /><Text>{children}</Text></HStack>
  )
}

function InviteForm({ availableBytes, onInvited }: { availableBytes: number; onInvited: () => void }) {
  const [email, setEmail] = useState('')
  const [allowance, setAllowance] = useState(100e6)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState<{ email: string; signInUrl: string } | null>(null)

  const invite = async () => {
    setBusy(true)
    setError(null)
    try {
      setSent(await invitePerson(email.trim(), allowance))
      setEmail('')
      onInvited()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel px="18px" py="16px" gap="12px" as="form" onSubmit={(e: React.FormEvent) => { e.preventDefault(); invite() }}>
      <Box>
        <Text fontWeight={600}>Sponsor someone</Text>
        <Text fontSize="13px" color="#52525b">They sign in with their email address using login-with.link.</Text>
      </Box>
      <Flex wrap="wrap" gap="8px" align="flex-end">
        <FormControl flex="3 1 220px">
          <FormLabel fontSize="12.5px" mb="5px">Email</FormLabel>
          <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" />
        </FormControl>
        <FormControl flex="1 1 160px">
          <FormLabel fontSize="12.5px" mb="5px">Allowance</FormLabel>
          <AllowanceInput bytes={allowance} onChange={setAllowance} />
        </FormControl>
        <Button type="submit" flex="1 1 120px" isLoading={busy} isDisabled={!email.trim() || !allowance}>Invite</Button>
      </Flex>
      <Text fontSize="12.5px" color="#52525b">Up to {formatBytes(Math.max(0, availableBytes))} available to give.</Text>
      {error && <Text color="red.600" fontSize="13px">{error}</Text>}
      {sent && (
        <VStack align="stretch" spacing="6px" bg="brand.50" borderRadius="8px" p="12px">
          <Text fontSize="13px">
            <b>{sent.email}</b> can now sign in. Send them this link; they'll sign in with that email address.
          </Text>
          <CopyField value={sent.signInUrl} />
        </VStack>
      )}
    </Panel>
  )
}

function AllowanceDialog({ person, availableBytes, onClose, onSaved }: {
  person: Person | null; availableBytes: number; onClose: () => void; onSaved: () => void
}) {
  const [bytes, setBytes] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = async () => {
    if (!person) return
    setBusy(true)
    try {
      await changeAllowance(person.id, bytes)
      onSaved()
      onClose()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal isOpen={!!person} onClose={() => { setError(null); onClose() }} isCentered>
      <ModalOverlay />
      {person && (
        <ModalContent mx={4} as="form" onSubmit={(e: React.FormEvent) => { e.preventDefault(); save() }}>
          <ModalHeader fontSize="18px">Change allowance for {person.email}</ModalHeader>
          <ModalBody>
            <VStack align="stretch" spacing={3}>
              <AllowanceInput key={person.id} bytes={person.quotaBytes} onChange={setBytes} />
              <Text fontSize="12.5px" color="#52525b">
                They're using {formatBytes(committed(person))}, so it can't go lower than that.
                You can raise it by up to {formatBytes(Math.max(0, availableBytes))}.
              </Text>
              {error && <Text color="red.600" fontSize="13px">{error}</Text>}
            </VStack>
          </ModalBody>
          <ModalFooter gap={2}>
            <Button variant="outline" colorScheme="gray" onClick={onClose}>Cancel</Button>
            <Button type="submit" isLoading={busy} isDisabled={!bytes}>Save</Button>
          </ModalFooter>
        </ModalContent>
      )}
    </Modal>
  )
}

function RemoveDialog({ person, onClose, onRemoved }: { person: Person | null; onClose: () => void; onRemoved: () => void }) {
  const [mode, setMode] = useState<'move' | 'delete'>('move')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const remove = async () => {
    if (!person) return
    setBusy(true)
    try {
      await removePerson(person.id, mode)
      onRemoved()
      onClose()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const name = person ? (person.handle ?? person.email) : ''
  const Option = ({ value, title, detail }: { value: 'move' | 'delete'; title: string; detail: string }) => (
    <Box
      as="label" border={mode === value ? '1.5px solid' : '1px solid'} borderColor={mode === value ? 'brand.500' : '#e6e6ea'}
      bg={mode === value ? 'brand.50' : 'white'} borderRadius="10px" p="12px" cursor="pointer"
    >
      <Radio value={value} alignItems="flex-start">
        <Text fontWeight={600}>{title}</Text>
        <Text fontSize="12.5px" color="#52525b">{detail}</Text>
      </Radio>
    </Box>
  )

  return (
    <Modal isOpen={!!person} onClose={() => { setError(null); onClose() }} isCentered>
      <ModalOverlay />
      {person && (
        <ModalContent mx={4}>
          <ModalHeader fontSize="18px" pb={1}>Stop sponsoring {person.email}?</ModalHeader>
          <ModalBody>
            <VStack align="stretch" spacing={4}>
              <Text color="#52525b">
                They'll lose access and their {formatBytes(person.quotaBytes)} allowance returns to your space.
                {person.imageCount > 0 && ` They have ${plural(person.imageCount, 'image')} (${formatBytes(person.usedBytes)}).`}
                {person.sponsoredCount > 0 && ` The ${peopleCount(person.sponsoredCount)} they sponsor will be sponsored by you instead.`}
              </Text>
              {person.imageCount > 0 && (
                <RadioGroup value={mode} onChange={v => setMode(v as 'move' | 'delete')}>
                  <VStack align="stretch" spacing="8px">
                    <Option value="move" title="Move their images to my library" detail={`Links keep working. Uses ${formatBytes(person.usedBytes)} of your space.`} />
                    <Option value="delete" title="Delete their images" detail="All their links stop working. This can't be undone." />
                  </VStack>
                </RadioGroup>
              )}
              {error && <Text color="red.600" fontSize="13px">{error}</Text>}
            </VStack>
          </ModalBody>
          <ModalFooter gap={2}>
            <Button variant="outline" colorScheme="gray" onClick={onClose}>Cancel</Button>
            <Button colorScheme="orange" bg="#c2410c" onClick={remove} isLoading={busy}>Remove {name}</Button>
          </ModalFooter>
        </ModalContent>
      )}
    </Modal>
  )
}
