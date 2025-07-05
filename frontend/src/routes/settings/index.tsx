import { Header } from '@/components/headers'

const secondaryNavigation = [
  { name: 'Account', href: '#', current: true },
  { name: 'Plugins', href: '#', current: false },
]

export default function SettingsPage() {
  return (
    <>
      <header class='border-mirage-700/20 z-10 border-b bg-gradient-to-br from-black/50 from-10% to-black/40 shadow-xl backdrop-blur-md'>
        <nav class='flex overflow-x-auto py-4'>
          <ul class='flex min-w-full flex-none gap-x-6 px-4 text-sm leading-6 font-semibold text-gray-400 sm:px-6 lg:px-8'>
            {secondaryNavigation.map((item) => (
              <li key={item.name}>
                <a
                  href={item.href}
                  class={`font-display ${item.current ? 'text-primary-300' : 'text-slate-400/30 hover:text-slate-400/50'}`}
                >
                  {item.name}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <Header title='Account Settings' header='Your Account Details' />
      <div class='relative mx-auto my-2 flex w-full flex-col justify-center sm:px-2 lg:px-6'>
        <p class='text-slate-350'>
          Take control of the OSINTBuddy app theme, your account information,
          <br /> and permissions for any shared workspaces or graphs.
        </p>
      </div>
    </>
  )
}
