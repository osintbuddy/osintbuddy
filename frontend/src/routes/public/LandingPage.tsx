import type { JSX } from 'preact';
import { FingerPrintIcon, Squares2X2Icon, UserPlusIcon } from '@heroicons/react/24/outline';
import Button from '@/components/buttons';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'preact/hooks';

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

  const token = ""
  useEffect(() => {
    console.log('token', token)
  })
  return (
    <div class='min-h-[calc(100vh-3.5rem)] relative flex flex-col justify-between items-between'>
      <div class='mx-auto md:mt-52 mt-24 items-center'>
        <div class='relative text-center'>
          <section class='relative pb-12 flex flex-col items-center'>
            <h2 class='inline text-center bg-gradient-to-r from-primary-300 via-primary-200 to-primary-300 bg-clip-text text-3xl md:text-5xl font-display font-medium tracking-tight text-transparent md:leading-14 max-w-[50rem] px-2 md:px-0'>
              Elevate your Research with Strategic Insights from Public Data
            </h2>
            <p class='pt-1 text-md px-3 md:px-0 md:text-lg text-slate-350 max-w-2xl'>
              Hi, I'm jerlendds and I created OSINTBuddy, an open source tool for collecting, processing, and visualizing connections between entities through a Python plugin system. You can identify relationships like what links to a given domain.
            </p>
            <div class='mt-4 flex gap-4 justify-center'>
              {token?.length > 1 ? (
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
                  onClick={() => navigate("/login", { replace: true })}
                >
                  Sign in
                  <FingerPrintIcon class="btn-icon" />
                </Button.Solid>
              )}

              <Button.Ghost
                variant='primary'
                onClick={() => navigate("/register", { replace: true })}
              >
                Create account
                <UserPlusIcon class="btn-icon" />
              </Button.Ghost>
            </div>
          </section>
        </div>
      </div>
      <section class='relative px-3 flex flex-col items-center justify-center mt-auto bottom-0 mx-auto'>
        <h1 class='font-display text-2xl tracking-tight bg-gradient-to-r text-slate-350'>
          {atfQuote}
        </h1>
        <p class='text-slate-350 mb-2 '>
          Email me at
          <a
            href='mailto:oss@osintbuddy.com'
            class='hover:text-primary-100 text-primary-200 transition-all duration-100 font-sans ease-in-out'
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
