import { useAuthStore } from '@/app/store'
import Button from '../buttons'
import { Icon } from '../icons'
import { useNavigate } from 'react-router-dom'

const QUOTES = [
  'Find the connections that matter',
  ...Array(2).fill('Unlock the potential of public data'),
  'Vision is the art of seeing insight in the invisible',
  'Transform data into connected knowledge',
  'Unraveling mysteries for insights',
  ...Array(3).fill('Truths are easy to understand once discovered'),
]

export default function HeroCard() {
  const atfQuote = QUOTES[Math.floor(Math.random() * QUOTES.length)]
  const navigate = useNavigate()
  const { isAuthenticated, logout } = useAuthStore()

  const redirectToLogin = () =>
    (window.location.href = window.sdk.getSigninUrl())

  return (
    <div className='bg-backdrop-500/65 inset-shadow-primary-300 shadow-primary-400/10 hover:shadow-primary-400/15 mt-47 flex flex-col items-center justify-center text-center shadow-xs backdrop-blur-md transition-all duration-500 ease-in hover:shadow-sm'>
      <div class='border-primary-400/10 relative bottom-0 mx-auto mt-auto flex min-w-4xl flex-col rounded-xs border px-6 inset-ring-2 md:py-14'>
        {/* Login + info box */}
        <section className='flex flex-col items-center text-slate-400'>
          {/* Animated header fade in 'Introducing OSINTBuddy' */}

          <h1 class='font-display text-3xl font-medium tracking-tight'>
            {atfQuote}
          </h1>
          <p class='mt-1 mb-2 max-w-3xl text-lg'>
            Meet your next-generation research companion. From domains to
            organizations to the humans behind them. Reveal how entities
            connect, and let the network tell its story.
            {/* Email me at&nbsp;
              <a
                href='mailto:oss@osintbuddy.com'
                class='link !border-b-primary !text-slate-350'
              >
                oss@osintbuddy.com
              </a>
              &nbsp;to share ideas, bugs, and or{' '}
              <NavLink
                to='/docs/contrib/bugs-security'
                class='hover:text-danger-500 mx-px font-sans transition-colors duration-100 ease-in-out after:content-[".."] hover:underline hover:after:content-["?"]'
              >
                security concerns
              </NavLink> */}
          </p>
        </section>
        <div class='mt-2 flex justify-center gap-4'>
          {isAuthenticated ? (
            <Button.Solid
              variant='primary'
              className='!rounded-none'
              onClick={() => navigate('/dashboard/cases')}
            >
              Launch OSINTBuddy
              <Icon icon='rocket' className='btn-icon' />
            </Button.Solid>
          ) : (
            <Button.Solid
              variant='primary'
              className='!rounded-none'
              onClick={redirectToLogin}
            >
              Sign in
              <Icon icon='fingerprint' className='btn-icon' />
            </Button.Solid>
          )}
          {isAuthenticated ? (
            <Button.Ghost
              className='!rounded-none'
              variant='primary'
              onClick={() => logout()}
            >
              Sign out
              <Icon icon='lock' className='btn-icon' />
            </Button.Ghost>
          ) : (
            <Button.Ghost
              className='!rounded-none'
              variant='primary'
              onClick={() => {
                window.location.href = window.sdk.getSignupUrl()
              }}
            >
              Create account
              <Icon icon='user-plus' className='btn-icon' />
            </Button.Ghost>
          )}
        </div>
      </div>
    </div>
  )
}
