import { Header } from './headers'

interface RoundLoaderProps {
  className?: string
}

export default function RoundLoader({
  className,
}: RoundLoaderProps): React.ReactElement {
  return (
    <div className='flex items-center'>
      <div
        className={`border-dark-200 h-3 w-3 animate-spin rounded-full border-2 border-solid border-t-transparent ${className ?? ''}`}
      >
        <span className='sr-only'>Loading...</span>
      </div>
    </div>
  )
}

export function UnderConstruction({
  header,
  description,
  className = 'flex px-6',
}: any) {
  return (
    <div className={className}>
      <div className='bg-mirage-800/30 block w-full rounded-b-lg shadow'>
        <div className='border-mirage-300 mx-4 border-b py-5 sm:px-6'>
          <div className='-mt-2 -ml-6 flex flex-wrap items-center justify-between sm:flex-nowrap'>
            <section className='mt-2 ml-4 w-full'>
              <h1 className='flex w-full items-center justify-between text-2xl'>
                <span className='right-0 mr-2.5 opacity-30'>🚧</span>
                <p className='font-display text-slate-350 mr-auto font-semibold'>
                  &nbsp;Under Construction&nbsp;
                </p>
                <span className='right-0 ml-auto opacity-30'>🚧</span>
              </h1>
            </section>
          </div>
        </div>

        <section className='mb-6 flex flex-col px-3'>
          <Header title='New Feature' header={header} />
          <p className='my-3 ml-6 max-w-xl text-slate-400'>
            {description}&nbsp;
            <a
              className='hover:text-primary-100 text-primary-200'
              href='https://github.com/osintbuddy/osintbuddy/issues/new'
              target='_blank'
            >
              github.com/osintbuddy/osintbuddy/issues/new
            </a>{' '}
          </p>
        </section>
      </div>
    </div>
  )
}
