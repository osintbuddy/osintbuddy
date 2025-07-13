import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import { useAppStore, useAuthStore } from '@/app/store'

import { Link, NavLink } from 'react-router-dom'
import Logo from '@/assets/images/logo.svg'
import { Icon } from '../icons'
import { MouseEventHandler } from 'preact/compat'

interface HamburgerProps {
  isOpen: boolean
  onClick: MouseEventHandler<HTMLButtonElement>
  className?: string
}

export function HamburgerMenu({ isOpen, onClick, className }: HamburgerProps) {
  return (
    <button
      onClick={onClick}
      class={`hamburger ${className ?? ''} ${isOpen && 'is-active'}`}
    >
      <span className='line' />
      <span className='line' />
      <span className='line' />
    </button>
  )
}

interface SidebarProps {
  showSidebar: boolean
  toggleSidebar: () => void
  logout: () => void
}

const navigation = [
  {
    name: 'Dashboard',
    to: '/dashboard',
    icon: 'home-infinity',
  },
  {
    name: 'Workspace',
    to: '/workspaces',
    icon: 'variable',
  },
]

function AppLayoutSidebar({
  showSidebar,
  toggleSidebar,
  logout,
}: SidebarProps) {
  return (
    <div
      class={`fixed inset-y-0 flex w-64 flex-col border-r border-black/10 bg-gradient-to-br from-black/50 to-black/40 shadow-2xl shadow-black/15 backdrop-blur-sm transition-transform duration-200 ${showSidebar ? 'translate-x-0' : '-translate-x-52 border-r-2'}`}
    >
      <div class='mt-2 flex min-h-0 flex-1 flex-col'>
        <div
          class={`my-1 flex h-10 shrink-0 items-center justify-between ${showSidebar ? 'px-3.5' : 'px-1'}`}
        >
          <Link to='/' replace>
            <img src={Logo} class='ml-1 h-7 w-auto fill-slate-400' />
          </Link>
          <HamburgerMenu
            isOpen={showSidebar}
            className={!showSidebar ? 'mr-1.5' : ''}
            onClick={toggleSidebar}
          />
        </div>
        <div class='flex flex-1 flex-col overflow-y-auto'>
          <nav class='flex flex-1 flex-col'>
            {navigation.map(({ icon, to, name }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `font-display z-50 my-1 flex items-center rounded-md border from-10% py-2.5 pr-1.5 pl-3 text-base font-medium transition-all duration-200 ease-in-out select-none ${isActive ? 'ring-primary-400/80 border-primary-400/80 text-slate-350 from-cod-800/10 to-cod-800/20 translate-x-px bg-gradient-to-tl shadow ring-1 ring-inset hover:translate-x-px' : 'hover:from-mirage-600/20 hover:to-mirage-600/10 to-mirage-900/10 from-mirage-900/5 -translate-x-px border-slate-800/10 bg-gradient-to-br text-slate-600/50 shadow ring-2 ring-slate-950/10 ring-inset hover:translate-x-px hover:border-slate-700/10 hover:text-slate-300/60 hover:ring-transparent'} ${showSidebar ? 'mx-2.5' : 'mr-px ml-0'}`
                }
              >
                <Icon
                  icon={icon}
                  className={`mr-2 h-6 w-6 shrink-0 text-slate-600/50 transition-all duration-200 ${location.pathname.includes(to) && '!text-primary'} ${showSidebar ? 'translate-x-0' : 'translate-x-[12.75rem]'}`}
                />
                {name}
              </NavLink>
            ))}
            <div class='mt-auto'>
              <NavLink
                to='/settings'
                replace
                className={({ isActive }) =>
                  `font-display z-50 my-1 flex items-center rounded-md border from-10% py-2.5 pr-1.5 pl-3 text-base font-medium transition-all duration-200 ease-in-out ${isActive ? 'ring-primary-400/80 border-primary-400/80 text-slate-350 from-cod-800/10 to-cod-800/20 translate-x-px bg-gradient-to-tl shadow ring-1 ring-inset hover:translate-x-px' : 'hover:from-mirage-600/20 hover:to-mirage-600/10 to-mirage-900/10 from-mirage-900/5 -translate-x-px border-slate-800/10 bg-gradient-to-br text-slate-600/50 shadow ring-2 ring-slate-950/10 ring-inset hover:translate-x-px hover:border-slate-700/10 hover:text-slate-300/60 hover:ring-transparent'} ${showSidebar ? 'mx-2.5' : 'mr-px ml-0'}`
                }
              >
                <Icon
                  icon='settings'
                  className={`${location.pathname.includes('settings') && '!text-primary'} mr-2 h-6 w-6 shrink-0 text-slate-600/50 transition-all duration-200 ${showSidebar ? 'translate-x-0' : 'translate-x-[12.75rem]'}`}
                />
                Settings
              </NavLink>
              <a
                target='_blank'
                href='https://github.com/osintbuddy'
                class={`to-mirage-900/10 from-mirage-900/5 hover:from-mirage-600/20 hover:to-mirage-600/10 font-display z-50 my-1 flex -translate-x-px items-center rounded-md border border-slate-800/10 bg-gradient-to-br from-10% py-2.5 pr-1.5 pl-3 font-medium text-slate-600/50 shadow ring-2 ring-slate-950/10 transition-all duration-200 ease-in-out ring-inset hover:translate-x-px hover:border-slate-700/10 hover:text-slate-300/60 hover:ring-transparent focus:text-slate-400/70 ${showSidebar ? 'mx-2.5' : 'mr-px ml-0.5'}`}
              >
                <Icon
                  icon='brand-github'
                  className={`mr-2 h-6 w-6 shrink-0 transition-all duration-200 ${showSidebar ? 'translate-x-0' : 'translate-x-[12.75rem]'}`}
                />
                Github
              </a>
              <NavLink
                to='/'
                replace
                class={`to-mirage-900/10 from-mirage-900/5 hover:from-mirage-600/20 hover:to-mirage-600/10 font-display group z-50 my-1 !mb-2 flex w-[calc(100%-1.25rem)] -translate-x-px items-center rounded-md border border-slate-800/10 bg-gradient-to-br from-10% py-2.5 pr-1.5 pl-3 text-base font-medium text-slate-600/50 shadow ring-2 ring-slate-950/10 transition-all duration-200 ease-in-out ring-inset hover:translate-x-px hover:border-amber-950/10 hover:text-slate-300/60 hover:ring-transparent focus:text-slate-400/70 ${showSidebar ? 'mx-2.5' : 'mr-px ml-0.5'}`}
                onClick={logout}
              >
                <Icon
                  icon='lock'
                  className={`mr-2 h-6 w-6 shrink-0 transition-all duration-200 group-hover:text-amber-500/40 ${showSidebar ? 'translate-x-0' : 'translate-x-[12.75rem]'}`}
                />
                Logout
              </NavLink>
            </div>
          </nav>
        </div>
      </div>
    </div>
  )
}

export default function AppLayout() {
  const location = useLocation()
  const { isAuthenticated, logout } = useAuthStore()
  const { showSidebar, toggleSidebar } = useAppStore()

  if (!isAuthenticated)
    return <Navigate to='/login' state={{ from: location.pathname }} replace />
  const handleLogout = async () => await logout()
  return (
    <>
      <div className='flex max-w-screen flex-col'>
        <AppLayoutSidebar
          logout={handleLogout}
          toggleSidebar={toggleSidebar}
          showSidebar={showSidebar}
        />
        <div
          style={{ width: `calc(100% - ${showSidebar ? 16 : 3}rem)` }}
          className={`w-full transition-all duration-200 ${showSidebar ? 'translate-x-64' : 'translate-x-12'}`}
        >
          <main id='main' className='h-screen flex-1'>
            <Outlet />
          </main>
        </div>
      </div>
      <ToastContainer
        position='bottom-right'
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        toastStyle={{
          backgroundColor: 'rgba(0, 2, 22, 0.94)',
          color: '#e2e8f0',
          backdropFilter:
            'var(--tw-backdrop-blur,) var(--tw-backdrop-brightness,) var(--tw-backdrop-contrast,) var(--tw-backdrop-grayscale,) var(--tw-backdrop-hue-rotate,) var(--tw-backdrop-invert,) var(--tw-backdrop-opacity,) var(--tw-backdrop-saturate,) var(--tw-backdrop-sepia,)',
        }}
      />
    </>
  )
}
