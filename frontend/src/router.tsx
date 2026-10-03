import { createBrowserRouter } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import type { ReactNode } from 'react'
import { Shell } from './components/Shell'
import { RequireUser } from './components/RequireUser'

const FoldersPage    = lazy(() => import('./pages/FoldersPage'))
const SettingsPage   = lazy(() => import('./pages/SettingsPage'))
const ComingSoonPage = lazy(() => import('./pages/ComingSoonPage'))
const LoginPage      = lazy(() => import('./pages/LoginPage'))
const WelcomePage    = lazy(() => import('./pages/WelcomePage'))

function Shelled({ children }: { children: ReactNode }) {
  return <RequireUser><Shell><Suspense fallback={null}>{children}</Suspense></Shell></RequireUser>
}

export const router = createBrowserRouter([
  { path: '/',         element: <Shelled><FoldersPage /></Shelled> },
  { path: '/upload',   element: <Shelled><ComingSoonPage title="Upload" /></Shelled> },
  { path: '/sizes',    element: <Shelled><ComingSoonPage title="Sizes" /></Shelled> },
  { path: '/people',   element: <Shelled><ComingSoonPage title="Sponsored users" /></Shelled> },
  { path: '/settings', element: <Shelled><SettingsPage /></Shelled> },
  { path: '/login',    element: <Suspense fallback={null}><LoginPage /></Suspense> },
  { path: '/welcome',  element: <RequireUser allowNoHandle><Suspense fallback={null}><WelcomePage /></Suspense></RequireUser> },
])
