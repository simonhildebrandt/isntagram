import { Box, Grid, Image, Text } from '@chakra-ui/react'
import { Link as RouterLink } from 'react-router-dom'
import { previewUrl, type ImageSummary } from '../api/images'

export const placeholderBg = 'repeating-linear-gradient(135deg,#e9e9ed 0 8px,#f3f3f5 8px 16px)'

export function ImageGrid({ images }: { images: ImageSummary[] }) {
  return (
    <Grid templateColumns="repeat(auto-fill, minmax(150px, 1fr))" gap="14px">
      {images.map(image => (
        <Box key={image.id} as={RouterLink} to={`/images/${image.id}`} display="flex" flexDirection="column" gap="6px" minW={0}>
          <Image
            src={previewUrl(image)} alt={image.name} loading="lazy"
            aspectRatio={4 / 3} objectFit="cover" borderRadius="10px" bg={placeholderBg} w="100%"
          />
          <Box px="2px" minW={0}>
            <Text fontSize="13px" fontWeight={500} noOfLines={1} title={image.name}>{image.name}</Text>
            <Text fontSize="12px" color="#71717a">{image.width} × {image.height}</Text>
          </Box>
        </Box>
      ))}
    </Grid>
  )
}
