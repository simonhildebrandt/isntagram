import React from 'react'
import { createRoot } from 'react-dom/client'
import { ChakraProvider } from '@chakra-ui/react'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { AuthProvider } from './providers/AuthProvider'
import { UploadProvider } from './providers/UploadProvider'
import theme from './theme'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ChakraProvider theme={theme}>
      <AuthProvider>
        <UploadProvider>
          <RouterProvider router={router} />
        </UploadProvider>
      </AuthProvider>
    </ChakraProvider>
  </React.StrictMode>
)
