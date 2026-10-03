import { Flex, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import type { ReactNode } from 'react'

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <Flex wrap="wrap" gap={3} align="flex-end" justify="space-between">
      <VStack align="stretch" spacing="2px" minW={0}>
        <Heading size="lg" overflowWrap="anywhere">{title}</Heading>
        {subtitle && <Text color="#52525b">{subtitle}</Text>}
      </VStack>
      {actions && <HStack spacing={2}>{actions}</HStack>}
    </Flex>
  )
}

export function Panel({ children, ...props }: { children: ReactNode } & Record<string, unknown>) {
  return <VStack align="stretch" spacing={0} bg="white" border="1px solid #e6e6ea" borderRadius="12px" {...props}>{children}</VStack>
}
