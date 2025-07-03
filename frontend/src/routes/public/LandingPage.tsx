import type { JSX } from 'preact';
import { HeroBackground } from '@/components/docs/HeroBackground'
import Button from '@/components/buttons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/app/hooks';
import { Icon } from '@/components/icons';
import { Callout } from '@/components/docs/Callout';

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

        <div class='relative text-center '>
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
                  <Icon icon="folder-open" className="btn-icon" />
                </Button.Solid>
              ) : (
                <Button.Solid
                  variant='primary'
                  onClick={() => navigate("/login")}
                >
                  Sign in
                  <Icon icon="fingerprint" className="btn-icon" />
                </Button.Solid>
              )}
              {isAuthenticated ? (
                <Button.Ghost
                  variant='primary'
                  onClick={() => logout()}
                >
                  Sign out
                  <Icon icon="lock" className="btn-icon" />
                </Button.Ghost>
              ) : (
                <Button.Ghost
                  variant='primary'
                  onClick={() => navigate("/register")}
                >
                  Create account
                  <Icon icon="user-plus" className="btn-icon" />
                </Button.Ghost>
              )}
            </div>
          </section>
          <div className="select-none fixed bottom-1/6 -z-50 [mask-image:linear-gradient(#05050520,,#050505)] right-5/11 md:right-1/11">
            <HeroBackground className="absolute  -rotate-90 lg:right-[40%]  translate-y-[-60%]" />
          </div>
        </div>
      </div>
      <div className="lg:max-w-lg absolute top-0 lg:top-auto lg:bottom-3 left-4.5 *:my-2 *:mx-0 *:mr-4">
        <Callout type='warning' title="Experimental Software (Alpha)">
          <p>Please note that OSINTBuddy is currently experimental software. We do not recommend using this project for anything serious!</p>
        </Callout>
      </div>
      <section class='relative px-4 md:px-0 flex flex-col md:items-center justify-center mt-auto bottom-0 md:mx-auto'>

        <section className="flex flex-col items-center">
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

      </section>
    </div>
  );
}
