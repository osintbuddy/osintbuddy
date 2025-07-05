import Logo from '@/assets/images/logo.svg'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/icons'
import Button from '@/components/buttons'

const links = [
  {
    title: 'Documentation',
    href: 'https://osintbuddy.com',
    description: 'Learn about OSINTBuddy',
    icon: (
      <Icon
        icon='book'
        className='h-6 w-6 text-slate-300/70 group-hover:text-slate-300'
      />
    ),
  },
  {
    title: 'Architecture guide',
    href: 'https://osintbuddy.com/docs/architecture-guide',
    description: 'Overview of the OSINTBuddy architecture',
    icon: (
      <Icon
        icon='buildings'
        className='h-6 w-6 text-slate-300/70 group-hover:text-slate-300'
      />
    ),
  },
]

const social = [
  {
    name: 'GitHub',
    href: 'https://github.com/jerlendds/osintbuddy',
    icon: <Icon icon='brand-github' className='h-6 w-6' />,
  },
]

export default function NotFound() {
  return (
    <div class='flex h-screen flex-col justify-between'>
      <main class='mx-auto w-full max-w-7xl px-8'>
        <img class='mx-auto mt-16 h-12 w-auto' src={Logo} alt='OSINTBuddy' />
        <div class='mx-auto max-w-xl py-16 sm:py-24'>
          <div class='text-center'>
            <p class='text-primary-200 text-base font-semibold'>404</p>
            <h1 class='font-display mt-2 text-4xl font-bold tracking-tight text-slate-300 sm:text-5xl'>
              This page does not exist.
            </h1>
            <p class='mt-2 text-lg text-slate-400'>
              The page you are looking for could not be found.
            </p>
          </div>
          <div class='mt-12'>
            <h2 class='text-base font-semibold text-slate-400'>
              Popular pages
            </h2>
            <ul
              role='list'
              class='border-mirage-100 mt-4 divide-y divide-slate-400 border-y'
            >
              {links.map(({ title, href, description, icon }) => (
                <li class='group relative flex items-start space-x-4 py-6'>
                  <span class='border-mirage-100 group-hover:border-primary flex h-12 w-12 items-center justify-center rounded border transition-colors duration-75 ease-in-out'>
                    {icon}
                  </span>
                  <section class='min-w-0 flex-1'>
                    <a
                      href={href}
                      target='_blank'
                      rel='noreferrer'
                      class='text-base font-medium text-slate-200 focus:outline-hidden'
                    >
                      {title}
                    </a>
                    <p class='text-base text-slate-400'>{description}</p>
                  </section>
                  <Icon
                    icon='chevron-right'
                    className='h-5 w-5 shrink-0 self-center text-slate-400'
                  />
                </li>
              ))}
            </ul>
            <Link to='/' replace>
              <Button.Ghost variant='primary' className='mt-8'>
                Or go back home
                <Icon icon='home' className='btn-icon' />
              </Button.Ghost>
            </Link>
          </div>
        </div>
      </main>
      <footer class='mx-auto w-full max-w-7xl px-8'>
        <div class='border-mirage-100 border-t py-12 text-center md:flex md:justify-between'>
          <p class='text-base text-slate-400'>
            &copy; jerlendds. AGPL. All rights reserved.
          </p>
          <div class='mt-6 flex justify-center space-x-8 md:mt-0'>
            {social.map(({ name, href, icon }) => (
              <a
                href={href}
                class='inline-flex text-slate-400 hover:text-slate-500'
              >
                <span class='sr-only'>{name}</span>
                {icon}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
