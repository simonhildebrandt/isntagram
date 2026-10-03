import { useEffect, useState } from 'react'
import { HStack, Input, Select } from '@chakra-ui/react'

const UNITS = { MB: 1e6, GB: 1e9 }
type Unit = keyof typeof UNITS

// A number plus MB/GB, reported in bytes.
export function AllowanceInput({ bytes, onChange }: { bytes: number; onChange: (bytes: number) => void }) {
  const [unit, setUnit] = useState<Unit>(bytes >= 1e9 ? 'GB' : 'MB')
  const [text, setText] = useState(String(+(bytes / UNITS[unit]).toFixed(2)))

  useEffect(() => {
    const value = Number(text)
    onChange(Number.isFinite(value) && value > 0 ? Math.round(value * UNITS[unit]) : 0)
  }, [text, unit])

  return (
    <HStack spacing={0}>
      <Input type="number" min={0} step="any" value={text} onChange={e => setText(e.target.value)} borderRightRadius={0} />
      <Select value={unit} onChange={e => setUnit(e.target.value as Unit)} w="90px" flex="none" borderLeftRadius={0} ml="-1px">
        <option value="MB">MB</option>
        <option value="GB">GB</option>
      </Select>
    </HStack>
  )
}
