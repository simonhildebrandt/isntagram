import { useState } from 'react'
import { Button, Flex, Text } from '@chakra-ui/react'

export function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Flex gap="6px">
      <Text
        flex={1} minW={0} h="34px" lineHeight="32px" px="10px" border="1px solid #e6e6ea" borderRadius="7px" bg="#fafafa"
        fontFamily="mono" fontSize="11.5px" color="#3f3f46" whiteSpace="nowrap" overflow="hidden" textOverflow="ellipsis"
        title={value}
      >
        {value}
      </Text>
      <Button
        flex="none" w="72px" h="34px" fontSize="12.5px"
        {...(copied ? { bg: '#18181b', color: 'white', _hover: { bg: '#18181b' } } : { variant: 'outline', colorScheme: 'gray' })}
        onClick={copy}
      >
        {copied ? 'Copied' : 'Copy'}
      </Button>
    </Flex>
  )
}
