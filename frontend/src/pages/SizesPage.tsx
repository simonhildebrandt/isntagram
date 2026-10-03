import { useEffect, useState } from 'react'
import {
  Badge, Box, Button, Center, Checkbox, Flex, FormControl, FormHelperText, FormLabel, HStack, Input, Link, Modal, ModalBody,
  ModalContent, ModalFooter, ModalHeader, ModalOverlay, Select, SimpleGrid, Spinner, Text, useDisclosure, VStack,
} from '@chakra-ui/react'
import {
  createPreset, deletePreset, describeDims, describeFit, describeFormat, listPresets, updatePreset, type Preset, type PresetInput,
} from '../api/presets'
import { errorMessage } from '../api/client'
import { PageHeader, Panel } from '../components/PageHeader'
import { ConfirmDialog } from '../components/Dialogs'
import { useMe } from '../providers/AuthProvider'
import { plural } from '../format'
import { useLoad } from '../useLoad'

function usage(p: Preset) {
  const parts = [p.folderCount && plural(p.folderCount, 'folder'), p.imageCount && plural(p.imageCount, 'image')].filter(Boolean)
  return parts.length ? parts.join(' · ') : 'Not used yet'
}

const Pill = ({ children }: { children: React.ReactNode }) => (
  <Flex h="26px" px="9px" borderRadius="6px" bg="#f4f4f5" align="center" fontSize="12.5px" color="#3f3f46">{children}</Flex>
)

export default function SizesPage() {
  const me = useMe()
  const { data: presets, error, reload } = useLoad(listPresets, [])
  const [editing, setEditing] = useState<Preset | 'new' | null>(null)

  return (
    <VStack align="stretch" spacing="22px">
      <PageHeader
        title="Sizes"
        subtitle="Presets you can apply to whole folders or single images. Each one gets its own URL."
        actions={<Button onClick={() => setEditing('new')}>New size</Button>}
      />
      <Flex bg="white" border="1px solid #e6e6ea" borderRadius="12px" px="14px" py="12px" wrap="wrap" gap="6px 14px" align="center">
        <Text fontSize="12.5px" color="#52525b">URL format</Text>
        <Text fontFamily="mono" fontSize="12.5px" wordBreak="break-all">
          {me.linkHost}/{'{folder}'}/{'{file}'}<Text as="span" color="brand.600">@{'{size}'}</Text>.{'{ext}'}
        </Text>
      </Flex>
      {error && <Text color="red.600">{error}</Text>}
      {!presets && !error && <Center py={10}><Spinner color="brand.500" /></Center>}
      {presets?.length === 0 && <Text color="#52525b">No sizes yet. Create one to start sharing scaled images.</Text>}
      {!!presets?.length && (
        <Panel>
          {presets.map(p => (
            <Flex key={p.id} p="14px" borderBottom="1px solid #f0f0f2" _last={{ borderBottom: 'none' }} wrap="wrap" align="center" gap="8px 20px">
              <Box flex="1 1 160px">
                <HStack spacing={2}>
                  <Text fontFamily="mono" fontWeight={500}>{p.name}</Text>
                  {p.isDefault && <Badge colorScheme="brand" fontWeight={500} textTransform="none">Default</Badge>}
                </HStack>
                <Text fontSize="12.5px" color="#71717a">{usage(p)}</Text>
              </Box>
              <HStack flex="2 1 260px" spacing="6px" wrap="wrap">
                <Pill><Text fontWeight={500}>{describeDims(p)}</Text></Pill>
                <Pill>{describeFit(p)}</Pill>
                <Pill>{describeFormat(p)}</Pill>
              </HStack>
              <Link fontSize="13px" fontWeight={500} color="brand.600" onClick={() => setEditing(p)}>Edit</Link>
            </Flex>
          ))}
        </Panel>
      )}
      <PresetDialog preset={editing} onClose={() => setEditing(null)} onSaved={reload} />
    </VStack>
  )
}

const blank: PresetInput = { name: '', width: 800, height: null, fit: 'inside', format: 'keep', isDefault: false }

function PresetDialog({ preset, onClose, onSaved }: { preset: Preset | 'new' | null; onClose: () => void; onSaved: () => void }) {
  const isNew = preset === 'new'
  const [form, setForm] = useState<PresetInput>(blank)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const remove = useDisclosure()

  useEffect(() => {
    if (preset) setForm(preset === 'new' ? blank : preset)
    setError(null)
  }, [preset])

  const set = <K extends keyof PresetInput>(key: K, value: PresetInput[K]) => setForm(f => ({ ...f, [key]: value }))
  const number = (v: string) => (v === '' ? null : Math.round(Number(v)))

  const save = async () => {
    setBusy(true)
    try {
      if (isNew) await createPreset(form)
      else if (preset) await updatePreset(preset.id, form)
      onSaved()
      onClose()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const linked = preset && !isNew ? (preset.folderCount ?? 0) + (preset.imageCount ?? 0) : 0

  return (
    <Modal isOpen={!!preset} onClose={onClose} isCentered size="lg">
      <ModalOverlay />
      <ModalContent mx={4} as="form" onSubmit={(e: React.FormEvent) => { e.preventDefault(); save() }}>
        <ModalHeader fontSize="18px">{isNew ? 'New size' : `Edit ${form.name}`}</ModalHeader>
        <ModalBody>
          <VStack align="stretch" spacing={4}>
            <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={4}>
              <FormControl>
                <FormLabel fontSize="13px">Name</FormLabel>
                <Input
                  value={form.name} isDisabled={!isNew} fontFamily="mono" placeholder="large" autoFocus={isNew}
                  onChange={e => set('name', e.target.value.toLowerCase())}
                />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="13px">Format</FormLabel>
                <Select value={form.format} isDisabled={!isNew} onChange={e => set('format', e.target.value as PresetInput['format'])}>
                  <option value="keep">Keep original format</option>
                  <option value="webp">WebP</option>
                  <option value="jpeg">JPEG</option>
                </Select>
              </FormControl>
            </SimpleGrid>
            {!isNew && <Text fontSize="12.5px" color="#71717a" mt="-8px">Name and format can't be changed: both are part of every link to this size.</Text>}
            <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={4}>
              <FormControl>
                <FormLabel fontSize="13px">Width</FormLabel>
                <Input type="number" min={1} value={form.width} onChange={e => set('width', number(e.target.value) ?? 0)} />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="13px">Height</FormLabel>
                <Input type="number" min={1} value={form.height ?? ''} placeholder="Any" onChange={e => set('height', number(e.target.value))} />
                <FormHelperText fontSize="12px">Leave empty to keep proportions.</FormHelperText>
              </FormControl>
            </SimpleGrid>
            {form.height !== null && (
              <FormControl>
                <FormLabel fontSize="13px">Fit</FormLabel>
                <Select value={form.fit} onChange={e => set('fit', e.target.value as PresetInput['fit'])}>
                  <option value="inside">Fit inside, keeping proportions</option>
                  <option value="crop">Crop to fill exactly</option>
                </Select>
              </FormControl>
            )}
            <Checkbox isChecked={form.isDefault} onChange={e => set('isDefault', e.target.checked)}>
              <Text fontSize="13px">Apply to new folders automatically</Text>
            </Checkbox>
            <Text fontSize="12.5px" color="#71717a">Images are never enlarged beyond their original size.</Text>
            {error && <Text color="red.600" fontSize="13px">{error}</Text>}
          </VStack>
        </ModalBody>
        <ModalFooter gap={2}>
          {!isNew && <Button variant="ghost" colorScheme="orange" color="#c2410c" mr="auto" onClick={remove.onOpen}>Delete</Button>}
          <Button variant="outline" colorScheme="gray" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={busy} isDisabled={!form.name || !form.width}>{isNew ? 'Create' : 'Save'}</Button>
        </ModalFooter>
      </ModalContent>
      {preset && !isNew && (
        <ConfirmDialog
          isOpen={remove.isOpen} onClose={remove.onClose} title={`Delete ${preset.name}?`} confirmLabel="Delete size"
          body={linked
            ? `It's applied to ${usage(preset).toLowerCase()}. Every link to this size will stop working. This can't be undone.`
            : "It isn't applied anywhere yet."}
          onConfirm={async () => { await deletePreset(preset.id); onSaved(); onClose() }}
        />
      )}
    </Modal>
  )
}
