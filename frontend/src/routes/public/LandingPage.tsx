import type { JSX } from 'preact'
import { HeroBackground } from '@/components/HeroBackground'
import Button from '@/components/buttons'
import { NavLink, useNavigate } from 'react-router-dom'
import { Icon } from '@/components/icons'
import { Callout } from '@/components/docs/Callout'
import { useAuthStore } from '@/app/store'

const QUOTES = [
  'Find the connections that matter to you',
  ...Array(2).fill('Unlock the potential of public data'),
  'Vision is the art of seeing insight in the invisible',
  'Transform data into connected knowledge',
  'Unraveling mysteries for insights',
  ...Array(2).fill(
    'All truths are easy to understand once they are discovered'
  ),
]

export default function LandingPage(): JSX.Element {
  const atfQuote = QUOTES[Math.floor(Math.random() * QUOTES.length)]
  const navigate = useNavigate()
  const { isAuthenticated, logout } = useAuthStore()

  return (
    <div class='items-between relative flex min-h-[calc(100vh-3.5rem)] flex-col justify-between'>
      <div class='mx-auto mt-36 items-center md:mt-52'>
        <div class='relative text-center'>
          <section class='relative flex flex-col items-center pb-12'>
            <h2 class='from-primary-200 to-primary-200 font-display inline max-w-[50rem] bg-gradient-to-br via-blue-500 bg-clip-text px-2 text-center text-2xl font-medium tracking-tight text-transparent md:text-[2.75rem] md:leading-14'>
              Elevate your Research with
              <br /> Strategic Insights from Public Data
            </h2>
            <p class='text-slate-350 md:text-md max-w-2xl px-3 pt-1 text-lg md:px-0'>
              Hi, I'm jerlendds, creator of OSINTBuddy, an open source tool for
              collecting, processing, and visualizing connections between
              entities through a Python plugin system. You can identify
              relationships like what relates to a given domain.
            </p>

            <div class='mt-4 flex justify-center gap-4'>
              {isAuthenticated ? (
                <Button.Solid
                  variant='primary'
                  onClick={() => navigate('/dashboard/cases')}
                >
                  Launch OSINTBuddy
                  <Icon icon='rocket' className='btn-icon' />
                </Button.Solid>
              ) : (
                <Button.Solid
                  variant='primary'
                  onClick={() => navigate('/login')}
                >
                  Sign in
                  <Icon icon='fingerprint' className='btn-icon' />
                </Button.Solid>
              )}
              {isAuthenticated ? (
                <Button.Ghost variant='primary' onClick={() => logout()}>
                  Sign out
                  <Icon icon='lock' className='btn-icon' />
                </Button.Ghost>
              ) : (
                <Button.Ghost
                  variant='primary'
                  onClick={() => navigate('/register')}
                >
                  Create account
                  <Icon icon='user-plus' className='btn-icon' />
                </Button.Ghost>
              )}
            </div>
          </section>
          <div className='fixed right-5/11 bottom-1/6 -z-50 [mask-image:linear-gradient(#05050520,,#050505)] select-none md:right-1/11'>
            <HeroBackground className='absolute translate-y-[-60%] -rotate-90 lg:right-[40%]' />
          </div>
        </div>
      </div>
      <div className='absolute top-0 left-4.5 *:mx-0 *:my-2 *:mr-4 lg:top-auto lg:bottom-3 lg:max-w-lg'>
        <Callout type='warning' title='Experimental Software (v0.3.0)'>
          <p>
            Please note that OSINTBuddy is currently experimental software. We
            do not recommend using this project for anything serious!
          </p>
        </Callout>
      </div>
      <section class='relative bottom-0 mt-auto flex flex-col justify-center px-4 md:mx-auto md:items-center md:px-0'>
        <section className='flex flex-col items-center'>
          <h1 class='font-display text-slate-350 text-2xl tracking-tight'>
            {atfQuote}
          </h1>
          <p class='text-slate-350 mb-2'>
            Email me at&nbsp;
            <a href='mailto:oss@osintbuddy.com' class='link'>
              oss@osintbuddy.com
            </a>
            &nbsp;to share ideas, bugs, and or{' '}
            <NavLink
              to='/docs/contrib/bugs-security'
              class='hover:text-danger-500 mx-px font-sans transition-colors duration-100 ease-in-out after:content-[".."] hover:underline hover:after:content-["?"]'
            >
              security concerns
            </NavLink>
          </p>
        </section>
      </section>
    </div>
  )
}
