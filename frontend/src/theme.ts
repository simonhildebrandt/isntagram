import { extendTheme } from '@chakra-ui/react'

// Accent scale converted from the design's oklch(… 0.2 270) violet.
const brand = {
  50: '#f1f5ff', 100: '#e6eeff', 200: '#c8d6ff', 300: '#9eb5f8', 400: '#7591f4',
  500: '#4761e4', 600: '#3b51d3', 700: '#2f40c2', 800: '#2735a6', 900: '#19237d',
}

const theme = extendTheme({
  colors: { brand },
  fonts: {
    heading: 'Geist, system-ui, sans-serif',
    body: 'Geist, system-ui, sans-serif',
    mono: "'Geist Mono', ui-monospace, monospace",
  },
  styles: {
    global: {
      body: { bg: '#f7f7f8', color: '#18181b', fontSize: '14px', lineHeight: 1.45 },
    },
  },
  components: {
    Button: { defaultProps: { colorScheme: 'brand' } },
    Heading: { baseStyle: { fontWeight: 650, letterSpacing: '-0.02em' } },
  },
})

export default theme
