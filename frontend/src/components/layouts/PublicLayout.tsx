import { Outlet } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import { type JSX } from 'preact/jsx-runtime'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'preact/hooks'
import { Icon } from '../icons'
import Logo from '@/assets/images/logo.svg'
import { useAuthStore } from '@/app/store'

function PublicNavbar(): JSX.Element {
  const navigate = useNavigate()
  const location = useLocation()
  const isDocsPage = location.pathname.includes('/docs')
  const { isAuthenticated } = useAuthStore()

  // controls the header styles
  let [isScrolled, setIsScrolled] = useState(false)
  useEffect(() => {
    function onScroll() {
      setIsScrolled(window.scrollY > 0)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  return (
    <header
      class={`border-b-mirage-800 sticky top-0 z-50 flex w-full flex-nowrap items-center justify-between border-b px-4 py-2.5 shadow-md shadow-slate-400/5 transition duration-500 sm:flex-wrap sm:px-6 lg:px-22 dark:shadow-none ${isScrolled ? 'bg-backdrop-500/50 backdrop-blur-xs' : 'bg-backdrop-400/60'}`}
    >
      <div class='flex lg:hidden'>
        <NavLink to='/'>
          <img
            class='block h-7 w-auto fill-slate-700 dark:fill-sky-100'
            src={Logo}
          />
        </NavLink>
      </div>
      <div class='relative flex grow basis-0 items-center'>
        <Link to='/'>
          <img
            class='hidden h-8 fill-slate-700 lg:block dark:fill-sky-100'
            src={Logo}
          />
        </Link>
      </div>

      <a
        target='_blank'
        href='https://discord.gg/gsbbYHA3K3'
        aria-label='Discord'
      >
        <Icon
          icon='brand-discord'
          className='h-6 w-6 text-slate-400 transition-colors duration-150 ease-in-out hover:text-slate-300 focus:text-slate-300'
        />
      </a>
      <a
        target='_blank'
        href='https://github.com/jerlendds/osintbuddy'
        class='mx-4'
        aria-label='GitHub'
      >
        <Icon
          icon='brand-github'
          className='h-6 w-6 text-slate-400 transition-colors duration-150 ease-in-out hover:text-slate-300 focus:text-slate-300'
        />
      </a>
      {!isDocsPage && (
        <button
          className='font-art before:bg-backdrop-500 hover:text-backdrop-500 relative flex rounded-xs border border-slate-400 px-3.5 py-1 leading-4 font-semibold text-slate-400 uppercase transition-all duration-300 ease-out before:absolute before:-bottom-1.5 before:left-1/2 before:h-1 before:w-0 before:-translate-1/2 before:transition-all before:duration-200 before:content-[""] hover:bg-slate-300 hover:before:w-[calc(100%+2px)]'
          onClick={() => navigate('/docs/overview')}
        >
          The Book
          <Icon icon='book' className='btn-icon relative' />
        </button>
      )}
      {isAuthenticated && isDocsPage && (
        <button
          className='font-art before:bg-backdrop-500 hover:text-backdrop-500 relative flex rounded-xs border border-slate-400 px-3.5 py-1 leading-4 font-semibold text-slate-400 uppercase transition-all duration-300 ease-out before:absolute before:-bottom-1.5 before:left-1/2 before:h-1 before:w-0 before:-translate-1/2 before:transition-all before:duration-200 before:content-[""] hover:bg-slate-300 hover:before:w-[calc(100%+2px)]'
          onClick={() => navigate('/dashboard/cases')}
        >
          Open OSIB
          <Icon icon='folder-open' className='btn-icon' />
        </button>
      )}
      {!isAuthenticated && isDocsPage && (
        <button
          className='font-art before:bg-backdrop-500 hover:text-backdrop-500 relative flex rounded-xs border border-slate-400 px-3.5 py-1 leading-4 font-semibold text-slate-400 uppercase transition-all duration-300 ease-out before:absolute before:-bottom-1.5 before:left-1/2 before:h-1 before:w-0 before:-translate-1/2 before:transition-all before:duration-200 before:content-[""] hover:bg-slate-300 hover:before:w-[calc(100%+2px)]'
          onClick={() => {
            window.location.href = window.sdk.getSigninUrl()
          }}
        >
          Sign in
          <Icon icon='key' className='btn-icon ml-3' />
        </button>
      )}
    </header>
  )
}

export default function PublicLayout(): JSX.Element {
  return (
    <>
      <PublicNavbar />
      <Outlet />
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
          backgroundColor: 'rgba(0, 2, 22, 0.938)',
          color: '#e2e8f0',
          backdropFilter:
            'var(--tw-backdrop-blur,) var(--tw-backdrop-brightness,) var(--tw-backdrop-contrast,) var(--tw-backdrop-grayscale,) var(--tw-backdrop-hue-rotate,) var(--tw-backdrop-invert,) var(--tw-backdrop-opacity,) var(--tw-backdrop-saturate,) var(--tw-backdrop-sepia,)',
        }}
      />
    </>
  )
}
