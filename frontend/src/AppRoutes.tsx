import type { JSX } from 'preact'
import { Suspense, lazy } from 'preact/compat'
import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom'
import NotFound from '@/routes/public/NotFound'
import AppLayout from '@/components/layouts/AppLayout'
import PublicLayout from '@/components/layouts/PublicLayout'
import { TourProvider } from '@reactour/tour'
import GraphLayout from '@/components/layouts/GraphLayout'
import Button from './components/buttons'
import RoundLoader from './components/loaders'
// Public routes
import RegisterPage from './routes/public/RegisterPage'
import LoginPage from './routes/public/LoginPage'
import LandingPage from '@/routes/public/LandingPage'
import TermsOfService from './routes/public/Tos'

// Doc routes
import Documentation from './routes/docs/Documentation'
import { Icon } from './components/icons'
import {
  GraphOverview,
  EntitiesOverview,
} from '@/routes/dashboard/_components/overviews'

// Auth routes
const DashboardPage = lazy(() => import('@/routes/dashboard'))
const Market = lazy(() => import('@/routes/dashboard/Market'))

// const GraphOverview = lazy(() => import("@/routes/dashboard/_components/overviews"))
const GraphDetails = lazy(() => import('@/routes/dashboard/GraphDetails'))
const Graphing = lazy(() => import('@/routes/graph/index'))

// const EntitiesOverview = lazy(() => import("@/routes/dashboard/EntitiesOverview"))
const EntityDetails = lazy(() => import('@/routes/dashboard/EntityDetails'))

const Settings = lazy(() => import('@/routes/settings'))
const Workspaces = lazy(() => import('@/routes/workspaces'))

const router = createBrowserRouter([
  {
    path: '/',
    element: <PublicLayout />,
    children: [
      {
        path: '',
        element: <LandingPage />,
      },
      {
        path: '/register',
        element: <RegisterPage />,
      },
      {
        path: '/login',
        element: <LoginPage />,
      },
      {
        path: '/terms',
        element: <TermsOfService />,
      },
      {
        path: '/docs/*',
        element: <Documentation />,
      },
    ],
  },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        path: 'dashboard',
        element: (
          <Suspense fallback={<RoundLoader />}>
            <DashboardPage />
          </Suspense>
        ),
        children: [
          {
            path: '',
            element: <Navigate to='graph' replace />,
          },
          {
            path: 'market',
            element: (
              <Suspense fallback={<RoundLoader />}>
                <Market />
              </Suspense>
            ),
          },
          {
            path: 'graph',
            element: (
              <Suspense fallback={<RoundLoader />}>
                <GraphOverview />
              </Suspense>
            ),
          },
          {
            path: 'graph/:hid',
            element: (
              <Suspense fallback={<RoundLoader />}>
                <GraphDetails />
              </Suspense>
            ),
          },
          {
            path: 'entity',
            element: (
              <Suspense fallback={<RoundLoader />}>
                <EntitiesOverview />
              </Suspense>
            ),
          },
          {
            path: 'entity/:hid',
            element: (
              <Suspense fallback={<RoundLoader />}>
                <EntityDetails />
              </Suspense>
            ),
          },
        ],
      },
      {
        path: 'settings',
        element: (
          <Suspense fallback={<RoundLoader />}>
            <Settings />
          </Suspense>
        ),
      },
      {
        path: 'workspaces',
        element: (
          <Suspense fallback={<RoundLoader />}>
            <Workspaces />
          </Suspense>
        ),
      },
    ],
  },
  {
    path: 'graph/',
    element: (
      <Suspense fallback={<RoundLoader />}>
        <GraphLayout />
      </Suspense>
    ),
    children: [
      {
        path: ':hid',
        element: (
          <Suspense fallback={<RoundLoader />}>
            <Graphing />
          </Suspense>
        ),
      },
    ],
  },
  {
    path: '*',
    element: <NotFound />,
  },
])

export default function AppRoutes(): JSX.Element {
  // const [tourSteps, _] = useAtom(tourAtom)
  const tourSteps = [{ todo: 'zustand' }]

  return (
    <TourProvider
      key={tourSteps.length}
      steps={tourSteps}
      onClickClose={({ setCurrentStep, setIsOpen }) => {
        setIsOpen(false)
        setCurrentStep(0)
      }}
      padding={{ mask: 10, popover: [5, 10], wrapper: 0 }}
      prevButton={({ currentStep, setCurrentStep, steps }: JSONObject) => (
        <Button.Ghost
          variant='primary'
          className={`!justify-between ${currentStep === 0 && 'hidden !opacity-0'}`}
          onClick={() =>
            currentStep === 0
              ? setCurrentStep(() => steps.length - 1)
              : setCurrentStep((s: number) => s - 1)
          }
        >
          <Icon icon='chevron-left' className='mr-5 !ml-0 h-5 w-5' />
          <span>Back</span>
        </Button.Ghost>
      )}
      nextButton={({
        currentStep,
        stepsLength,
        setIsOpen,
        setCurrentStep,
        steps,
      }: JSONObject) => (
        <Button.Ghost
          onClick={() =>
            currentStep === stepsLength - 1
              ? setIsOpen(false)
              : setCurrentStep((s: number) =>
                  s === steps?.length - 1 ? 0 : s + 1
                )
          }
          variant='primary'
        >
          {!(currentStep === stepsLength - 1) ? 'Next' : 'Close guide'}
          <Icon icon='chevron-right' className='mr-5 !ml-0 h-5 w-5' />
        </Button.Ghost>
      )}
      styles={{
        popover: (base) => ({
          ...base,
          '--reactour-accent': '#2B3BFF',
          borderRadius: 5,
          backgroundColor: '#14192Aee',
          color: '#64748b',
        }),
        maskArea: (base) => ({ ...base, rx: 10 }),
        maskWrapper: (base) => ({ ...base, color: '#0D111C', opacity: 0.8 }),
        badge: (base) => ({ ...base, left: 'auto', right: '-0.8125em' }),
        controls: (base) => ({ ...base, marginTop: 100 }),
        close: (base) => ({ ...base, right: 'auto', left: 8, top: 8 }),
      }}
    >
      <RouterProvider router={router} />
    </TourProvider>
  )
}
