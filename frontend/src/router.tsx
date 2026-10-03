import { createBrowserRouter } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import type { ReactNode } from 'react'
import { Shell } from './components/Shell'
import { RequireUser } from './components/RequireUser'

const FoldersPage    = lazy(() => import('./pages/FoldersPage'))
const FolderPage     = lazy(() => import('./pages/FolderPage'))
const ImagePage      = lazy(() => import('./pages/ImagePage'))
const UploadPage     = lazy(() => import('./pages/UploadPage'))
const SearchPage     = lazy(() => import('./pages/SearchPage'))
const SizesPage      = lazy(() => import('./pages/SizesPage'))
const PeoplePage     = lazy(() => import('./pages/PeoplePage'))
const SettingsPage   = lazy(() => import('./pages/SettingsPage'))
const LoginPage      = lazy(() => import('./pages/LoginPage'))
const WelcomePage    = lazy(() => import('./pages/WelcomePage'))

function Shelled({ children }: { children: ReactNode }) {
  return <RequireUser><Shell><Suspense fallback={null}>{children}</Suspense></Shell></RequireUser>
}

export const router = createBrowserRouter([
  { path: '/',         element: <Shelled><FoldersPage /></Shelled> },
  { path: '/folders/:id', element: <Shelled><FolderPage /></Shelled> },
  { path: '/images/:id',  element: <Shelled><ImagePage /></Shelled> },
  { path: '/upload',   element: <Shelled><UploadPage /></Shelled> },
  { path: '/search',   element: <Shelled><SearchPage /></Shelled> },
  { path: '/sizes',    element: <Shelled><SizesPage /></Shelled> },
  { path: '/people',   element: <Shelled><PeoplePage /></Shelled> },
  { path: '/settings', element: <Shelled><SettingsPage /></Shelled> },
  { path: '/login',    element: <Suspense fallback={null}><LoginPage /></Suspense> },
  { path: '/welcome',  element: <RequireUser allowNoHandle><Suspense fallback={null}><WelcomePage /></Suspense></RequireUser> },
])
