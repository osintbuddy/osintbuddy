import type { JSX } from 'preact/jsx-runtime'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'preact/hooks';
import { Icon } from '../Icons';
import Logo from '@/assets/images/logo.svg';
import Button from '../buttons';
import { BookOpenIcon, Squares2X2Icon, UserIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/app/api';

export default function PublicNavbar(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const isDocsPage = location.pathname.includes('/docs');
  const { isAuthenticated } = useAuth();

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
    <header class={`sticky w-full  top-0 z-50 flex sm:flex-wrap items-center justify-between flex-nowrap px-4 py-2.5 shadow-md shadow-slate-900/5 transition duration-500 dark:shadow-none sm:px-6 lg:px-16 ${isScrolled ? 'bg-black/85 backdrop-blur [@supports(backdrop-filter:blur(0))]:bg-black/30' : 'bg-transparent'}`}>
      <div class="flex lg:hidden">
        <NavLink to="/">
          <img class=" h-7 w-auto fill-slate-700 dark:fill-sky-100 block" src={Logo} />
        </NavLink>
      </div>
      <div class="relative flex flex-grow basis-0 items-center">
        <Link to="/">
          <img class="hidden h-8  fill-slate-700 dark:fill-sky-100 lg:block" src={Logo} />
        </Link>
      </div>

      <a href="https://discord.gg/gsbbYHA3K3" aria-label="Discord">
        <Icon icon="brand-discord" className="h-6 w-6 transition-colors duration-150 ease-in-out text-slate-500 hover:text-slate-300 focus:text-slate-300" />
      </a>
      <a href="https://github.com/jerlendds/osintbuddy" class="mx-4" aria-label="GitHub">
        <Icon icon="brand-github" className="h-6 w-6 transition-colors duration-150 ease-in-out text-slate-500 hover:text-slate-300 focus:text-slate-300" />
      </a>
      {!isDocsPage && (
        <Button.Solid variant='primary' onClick={() => navigate("/docs/overview")}>
          OSIB Book
          <BookOpenIcon class="btn-icon" />
        </Button.Solid>
      )}
      {isAuthenticated && isDocsPage && (
        <Button.Solid variant='primary' onClick={() => navigate("/dashboard/graph")}>
          Open OSINTBuddy
          <Squares2X2Icon class="btn-icon" />
        </Button.Solid>
      )}
      {!isAuthenticated && isDocsPage && (
        <Button.Solid variant='primary' onClick={() => navigate("/login")}>
          Sign in
          <UserIcon class="btn-icon" />
        </Button.Solid>
      )}
    </header>
  );
}
