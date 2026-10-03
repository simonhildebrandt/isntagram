import { Heading, Text, VStack } from '@chakra-ui/react'

// Placeholder for screens that arrive in later slices.
export default function ComingSoonPage({ title }: { title: string }) {
  return (
    <VStack align="stretch" spacing={2}>
      <Heading size="lg">{title}</Heading>
      <Text color="#52525b">Coming soon.</Text>
    </VStack>
  )
}
