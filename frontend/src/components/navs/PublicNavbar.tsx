import type { JSX } from 'preact/jsx-runtime'
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'preact/hooks';
import { Icon } from '../Icons';
import Logo from '@/assets/images/logo.svg';

export default function PublicNavbar(): JSX.Element {
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
    <header class={`sticky w-full  top-0 z-50 flex sm:flex-wrap items-center justify-between flex-nowrap px-4 py-2.5 shadow-md shadow-slate-900/5 transition duration-500 dark:shadow-none sm:px-6 lg:px-8 ${isScrolled ? 'dark:bg-slate-800/95 dark:backdrop-blur dark:[@supports(backdrop-filter:blur(0))]:bg-slate-900/75' : 'dark:bg-transparent'}`}>
      <div class="flex lg:hidden">
        <Link to="/">
          <img class=" h-7 w-auto fill-slate-700 dark:fill-sky-100 block" src={Logo} />
        </Link>
      </div>
      <div class="relative flex flex-grow basis-0 items-center">
        <Link to="/">
          <img class="hidden h-9  fill-slate-700 dark:fill-sky-100 lg:block" src={Logo} />
        </Link>
      </div>
      <div class="">
      </div>
      <div class="ml-auto relative flex basis-0 justify-end mr-2 gap-6 sm:gap-8 md:flex-grow">
        <a href="https://discord.gg/gsbbYHA3K3" class="group" aria-label="Discord">
          <Icon icon="brand-discord" className="h-6 w-6 transition-colors duration-150 ease-in-out text-slate-500 hover:text-slate-300 focus:text-slate-300" />
        </a>
      </div>
      <div class="relative flex justify-end">
        <a href="https://github.com/jerlendds/osintbuddy" class="group" aria-label="GitHub">
          <Icon icon="brand-github" className="h-6 w-6 transition-colors duration-150 ease-in-out text-slate-500 hover:text-slate-300 focus:text-slate-300" />
        </a>
      </div>
    </header>
  );
}
