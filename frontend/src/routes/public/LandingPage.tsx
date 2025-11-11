import { type JSX } from 'preact'
import ScrambleText from '@/components/ScrambleText'
import HeroSvg from '@/assets/images/grid-tiles-mask.svg'
import FeatureCard from '@/components/cards/FeatureCard'
import HeroCard from '@/components/cards/HeroCard'

export default function LandingPage(): JSX.Element {
  return (
    <>
      <img src={HeroSvg} alt='' className='absolute top-0 left-0' />
      <main class='bg-backdrop-500 z-0 flex flex-col'>
        <div class='grid grid-cols-12 grid-rows-1'>
          {/* diagonal stripe and hero text */}
          <div className='grid-cols-1'> {/** todo */}</div>
          <div className='grid-cols-1'> {/** todo */}</div>
          <div className='flex items-center'>
            <div className='ml-18 flex h-full flex-col items-center justify-center px-30'>
              <HeroCard />
            </div>
          </div>
        </div>

        <div class='bg-surface border-mirage-800 relative mt-100 flex h-full justify-center border-t-1 py-10'>
          <section className='-left-50% right-50% bg-backdrop-500 absolute -top-0.5 flex h-1 w-[34rem] items-center justify-center text-[2em]'>
            <h3 class='font-display absolute -top-6 left-5 text-nowrap'>
              <ScrambleText
                className='text-art illuminate-out-text'
                delay={0}
                speed={120}
                hold={100}
                phrases={['Introducing OSINTBuddy']}
              />
            </h3>
            <h3 class='font-display absolute -top-6 left-8 text-nowrap'>
              <ScrambleText
                style={{ '--vanish-delay': '1.75s' }}
                className='text-art illuminate-out-hold'
                delay={3750}
                speed={60}
                hold={360}
                phrases={['Elevate your Research']}
              />
            </h3>
          </section>
          <div className='flex flex-col gap-y-8'>
            <div className='flex w-full items-center justify-center gap-x-16 px-16 text-slate-400'>
              <FeatureCard
                icon='chart-dots-3'
                title='Network Visualization'
                description='Visualize and collect data points through an interactive click and drag graph interface. Attach files, comment, and collaborate like never before.'
                iconClass='text-blue-600'
              />
              <FeatureCard
                icon='plug-connected'
                title='Powered by Plugins'
                description='Create custom plugins for your needs. The osintbuddy python package has everything you need. We keep you safe by running plugins in a battle-tested sandbox.'
                iconClass='text-amber-600'
              />
              <FeatureCard
                icon='code'
                title='Workspaces'
                description='Build entities through a no-code drag and drop builder in the workspace. Drop down to our code editor for creating transforms and for fine-grained control.'
                iconClass='text-green-600'
                comingSoon={true}
              />
            </div>
            <div className='flex w-full items-center justify-between gap-x-16 px-16 text-slate-400'>
              <FeatureCard
                icon='message'
                title='Graph Narratives'
                description='Imagine a timeline or story view that summarizes key relationships and findings. Each pivot you take becomes a paragraph for your reports.'
                iconClass='text-emerald-600'
                comingSoon={true}
              />
              <FeatureCard
                icon='building-store'
                title='Community Marketplace'
                description='Download verified plugins for entities and transforms from trusted community members. Or place request bounties to get our developers to build what you need.'
                iconClass='text-violet-500'
                comingSoon={true}
              />
              <FeatureCard
                icon='hourglass-low'
                title='Temporal Graphs'
                description='Replay your investigations over time, see how entities and links evolve with verifiable lineage through public archives and our auditable append-only event log.'
                iconClass='text-fuchsia-600'
                comingSoon={true}
              />
            </div>
          </div>
        </div>
        <div className='flex h-screen w-screen'></div>
      </main>
    </>
  )
}
