import { useAuthStore } from '@/app/store'
import Button from '@/components/buttons'
import { HeroBackground } from '@/components/docs/HeroBackground'
import { Icon } from '@/components/icons'
import Input from '@/components/inputs'
import { JSX } from 'preact/jsx-runtime'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'

export default function LoginPage(): JSX.Element {
  const { login, isLoading } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const rememberedEmail = localStorage.getItem('remember-email') ?? ''
  const from = location.state?.from

  const onLoginSubmit: JSX.SubmitEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const email = formData.get('email')?.toString() as string
    const password = formData.get('password')?.toString() as string

    // handle remember me logic
    const isRemembered = formData.get('remember') === 'on'
    if (isRemembered) localStorage.setItem('remember-email', email)
    else localStorage.setItem('remember-email', '')

    // validate
    const invalidPassword = password.length < 8
    const invalidEmail = email.length < 5 && !email.includes('@')
    if (invalidEmail) toast.error('A valid email is required to sign in.')
    if (invalidPassword)
      toast.error(
        'Please enter a valid password. Remember that passwords must be a minimum of 8 characters.'
      )

    // attempt login when valid
    if (!invalidEmail && !invalidPassword) {
      e.currentTarget.reset()
      login({ email, password })
        .then(() => {
          // from is used when a user previously tried to visit an app
          // page without being signed in so we direct them to that page after sign in
          if (from) navigate(from, { replace: true })
          else navigate('/dashboard/graph', { replace: true })
        })
        .catch((err) => toast.error(err.message))
    }
  }

  return (
    <div class='my-20 flex flex-col items-center justify-center py-20'>
      <div className='fixed right-5/11 bottom-1/6 -z-50 [mask-image:linear-gradient(#05050520,,#050505)] select-none md:right-1/11'>
        <HeroBackground className='absolute translate-y-[-60%] -rotate-90 lg:right-[40%]' />
      </div>
      <div class='border-primary/80 -mt-30 flex w-11/12 flex-col items-center rounded-r-lg border-l-3 bg-gradient-to-tr from-black/50 to-black/30 py-6 shadow-2xl shadow-black/35 backdrop-blur-sm transition-all duration-100 md:w-auto'>
        <h2 class='text-slate-350 font-display relative mb-4 text-2xl font-semibold md:-ml-7'>
          Sign into OSINTBuddy
        </h2>

        <div class='font-display flex flex-col items-center md:px-5'>
          <form
            onSubmit={onLoginSubmit}
            class='grid w-full max-w-2xs gap-y-2 px-2 md:px-0'
          >
            <Input.Transparent
              label='Email'
              type='email'
              className='w-full'
              name='email'
              placeholder='you@provider.com'
              defaultValue={rememberedEmail}
              required
            />
            <Input.TransparentPassword
              label='Password'
              className='w-full'
              name='password'
              placeholder='*******'
              required
            />
            <Input.Checkbox
              label='Remember me?'
              name='remember'
              placeholder='*******'
              className='mt-2 mb-3'
              defaultChecked={rememberedEmail?.length > 0}
            />

            <Button.Solid
              disabled={isLoading}
              type='submit'
              variant='primary'
              className='w-full'
            >
              {isLoading ? (
                <>
                  Authenticating...{' '}
                  <div class='dot-flashing !top-[3px] ml-2.5' />
                </>
              ) : (
                'Sign in'
              )}
              {!isLoading && <Icon icon='fingerprint' className='btn-icon' />}
            </Button.Solid>
          </form>

          <hr class='text-mirage-700 mt-6 mb-4 w-xs md:w-sm' />
          <section class='flex flex-col items-center text-sm text-slate-400'>
            <p>Don't have an account yet?</p>
            <NavLink
              to='/register'
              class='hover:border-primary active:border-primary border-b-2 border-transparent font-sans hover:text-slate-200'
            >
              Sign up here
            </NavLink>
          </section>
        </div>
      </div>
    </div>
  )
}
