import type { JSX } from 'preact';
import { HeroBackground } from '@/components/docs/HeroBackground'
import { FingerPrintIcon, LockClosedIcon, Squares2X2Icon, UserPlusIcon } from '@heroicons/react/24/outline';
import blurCyanImage from '@/assets/images/blur-cyan.png'
import blurIndigoImage from '@/assets/images/blur-indigo.png'
import Button from '@/components/buttons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/app/api';

const QUOTES = [
  "Find the connections that matter to you",
  ...Array(2).fill("Unlock the potential of public data"),
  "Vision is the art of seeing insight in the invisible",
  "Transform data into connected knowledge",
  "Unraveling mysteries for insights",
  ...Array(2).fill("All truths are easy to understand once they are discovered")
]

export default function LandingPage(): JSX.Element {
  const atfQuote = QUOTES[Math.floor(Math.random() * QUOTES.length)]
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth()

  return (
    <div class='min-h-[calc(100vh-3.5rem)] relative flex flex-col justify-between items-between'>
      <div class='mx-auto md:mt-52 mt-36 items-center'>
        <div class='relative text-center'>
          <section class='relative pb-12 flex flex-col items-center'>
            <h2 class='inline text-center bg-gradient-to-br from-primary-200 via-blue-500 to-primary-200 bg-clip-text text-2xl md:text-5xl font-display font-medium tracking-tight text-transparent md:leading-14 max-w-[50rem] px-2'>
              Elevate your Research with<br /> Strategic Insights from Public Data
            </h2>
            <p class='pt-1 text-md px-3 md:px-0 md:text-lg text-slate-300 max-w-2xl'>
              Hi, I'm jerlendds and I created OSINTBuddy, an open source tool for collecting, processing, and visualizing connections between entities through a Python plugin system. You can identify relationships like what links to a given domain.
            </p>

            <div class='mt-4 flex gap-4 justify-center'>
              {isAuthenticated ? (
                <Button.Solid
                  variant='primary'
                  onClick={() => navigate("/dashboard/graph")}
                >
                  Open OSINTBuddy
                  <Squares2X2Icon class="btn-icon" />
                </Button.Solid>
              ) : (
                <Button.Solid
                  variant='primary'
                  onClick={() => navigate("/login")}
                >
                  Sign in
                  <FingerPrintIcon class="btn-icon" />
                </Button.Solid>
              )}
              {isAuthenticated ? (
                <Button.Ghost
                  variant='primary'
                  onClick={() => logout()}
                >
                  Sign out
                  <LockClosedIcon class="btn-icon" />
                </Button.Ghost>
              ) : (
                <Button.Ghost
                  variant='primary'
                  onClick={() => navigate("/register")}
                >
                  Create account
                  <UserPlusIcon class="btn-icon" />
                </Button.Ghost>
              )}
            </div>
          </section>
          <div className="h-screen w-screen fixed top-0 -z-50">
            <div className="select-none absolute top-[58%] -bottom-2 [mask-image:linear-gradient(#05050520,,#050505)] right-0 left-8 ">
              <HeroBackground className="absolute top-1/2 -translate-y-1/2  -rotate-90 lg:right-[40%]  lg:translate-y-[-60%]" />
            </div>
            <img
              className="absolute -top-64 right-12 select-none w-[40%] h-[40%] opacity-40"
              src={blurCyanImage}
              alt=""
              width={530}
              height={530}
            />
            <img
              className="absolute bottom-2/3 right-12 select-none w-[40%] h-[40%] opacity-40"
              src={blurIndigoImage}
              alt=""
              width={567}
              height={567}
            />
          </div>
        </div>
      </div>
      <section class='relative px-4 md:px-0 flex flex-col md:items-center justify-center mt-auto bottom-0 md:mx-auto'>
        <h1 class='font-display text-2xl tracking-tight text-slate-300'>
          {atfQuote}

        </h1>
        <p class='text-slate-300 mb-2 '>
          Email me at
          <a
            href='mailto:oss@osintbuddy.com'
            class='hover:text-primary-50 active:text-primary-50 text-primary-100 transition-all duration-100 font-sans ease-in-out'
          >
            &nbsp;oss@osintbuddy.com&nbsp;
          </a>
          to share ideas or <a
            href="#todo-redirect-to-security.mdx-page"
            class='border-b-2 border-b-transparent hover:border-b-red-600/40 transition-all duration-100 font-sans ease-in-out mx-px'
          >
            security concerns.
          </a>
        </p>
      </section>
    </div>
  );
}
