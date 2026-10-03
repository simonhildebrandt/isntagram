import { Button, HStack, Menu, MenuButton, MenuDivider, MenuItem, MenuList, Text } from '@chakra-ui/react'
import { Link as RouterLink } from 'react-router-dom'
import { describeDims, type Preset } from '../api/presets'

// A size applied to a folder or image, optionally removable.
export function SizeChip({ preset, onRemove }: { preset: Preset; onRemove?: () => void }) {
  return (
    <HStack spacing="6px" h="28px" px="10px" borderRadius="6px" bg="brand.50" color="brand.800" fontSize="12.5px" fontWeight={500}>
      <Text fontFamily="mono">{preset.name}</Text>
      <Text opacity={0.8}>{describeDims(preset)}</Text>
      {onRemove && (
        <Text as="button" aria-label={`Remove ${preset.name}`} onClick={onRemove} opacity={0.6} _hover={{ opacity: 1 }} pl="2px">×</Text>
      )}
    </HStack>
  )
}

export function AddSizeMenu({ available, onAdd, label = '+ Add size' }: { available: Preset[]; onAdd: (preset: Preset) => void; label?: string }) {
  return (
    <Menu>
      <MenuButton
        as={Button} h="28px" px="10px" fontSize="12.5px" fontWeight={400} variant="outline" colorScheme="gray"
        borderStyle="dashed" borderColor="#c4c4cc" color="#52525b" bg="white"
      >
        {label}
      </MenuButton>
      <MenuList fontSize="13px">
        {available.map(p => (
          <MenuItem key={p.id} onClick={() => onAdd(p)} gap={2}>
            <Text fontFamily="mono">{p.name}</Text><Text color="#71717a">{describeDims(p)}</Text>
          </MenuItem>
        ))}
        {available.length > 0 && <MenuDivider />}
        <MenuItem as={RouterLink} to="/sizes">Manage sizes…</MenuItem>
      </MenuList>
    </Menu>
  )
}
