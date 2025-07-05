import { Link, NavLink, useParams } from 'react-router-dom'
import { formatPGDate } from '@/app/utilities'
import { Icon } from '@/components/icons'
import { Entity, Graph } from '@/app/api'

export function GraphLoaderCard() {
  return (
    <>
      <div class='mb-2'>
        <div class='border-mirage-400/60 from-mirage-400/50 to-mirage-400/30 via-mirage-400/10 before:via-mirage-300/5 relative isolate w-full space-y-1 overflow-hidden rounded-md rounded-r-none border border-y border-l bg-gradient-to-tl from-10% px-4 py-6 shadow shadow-black/5 before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:to-transparent'>
          <div class='space-y-3'>
            <div class='h-2 w-3/5 animate-pulse rounded-lg bg-slate-600/20'></div>
            <div class='h-2 w-4/5 animate-pulse rounded-lg bg-slate-600/20'></div>
            <div class='h-2 w-2/5 animate-pulse rounded-lg bg-slate-600/20'></div>
          </div>
        </div>
      </div>
    </>
  )
}

interface SubpanelProps {
  showError: any
  showEntities: boolean
  isLoading: boolean | undefined
  setShowEntities: () => void
  isSuccess: boolean | undefined
  label: string
  onClick: (hid: string) => void
  items: Entity[] | Graph[]
  to: '/dashboard/entity' | '/dashboard/graph'
  errorMessage?: string | null
  dateLabel?: string
  dateKey?: string
  isFavorite?: boolean
}

export default function Subpanel({
  showError,
  showEntities,
  isLoading,
  setShowEntities,
  isSuccess,
  label,
  onClick,
  items,
  to,
  errorMessage,
  isFavorite,
}: SubpanelProps) {
  const { hid } = useParams()
  return (
    <div class='subpanel'>
      <header
        class='hover:border-primary-300 z-50 flex cursor-pointer items-center border-b border-slate-500/30 py-0.5 pb-1 text-slate-600 transition-colors duration-500 ease-in-out hover:text-slate-500'
        onClick={setShowEntities}
      >
        <h2 class='font-display px-1 text-sm leading-3 font-semibold text-inherit select-none focus:outline-hidden'>
          {label}
        </h2>
        <Icon
          icon='chevron-down'
          className={
            `hover:border-primary-300/40 mr-1 ml-auto h-5 w-5 origin-center transform cursor-pointer text-slate-600 hover:rotate-3 focus:outline-hidden show-header-icon-${showEntities}` +
            ' transition-transform duration-300'
          }
        />
      </header>
      {showError && showEntities && !isLoading && (
        <>
          <p>
            {errorMessage?.length ? (
              <p class='px-2 text-sm text-slate-400/60'>{errorMessage}</p>
            ) : (
              <>
                We ran into an error fetching your data. Please try refreshing
                the page, if this error continues to occur please{' '}
                <a href='#' class='text-info-300'>
                  file an issue
                </a>{' '}
                on github
              </>
            )}
          </p>
        </>
      )}
      {showEntities && isLoading && !showError && (
        <>
          <GraphLoaderCard />
          <GraphLoaderCard />
        </>
      )}
      <div
        class={`-translate-y-4 px-1 transition-transform duration-100 ${showEntities ? '!translate-y-0' : 'first-child:mt-2 !h-0 -scale-y-0'}`}
      >
        {items.map((item) => {
          return (
            <NavLink
              key={item.id}
              to={`${to}/${item.id}`}
              className={({ isActive }) =>
                `from-mirage-600/20 to-mirage-600/10 hover:shadow-primary-950/50 shadow-cod-800/20 relative z-0 mb-1.5 flex w-full -translate-x-px items-center overflow-hidden rounded-md border border-slate-950 bg-transparent from-10% shadow-2xs transition-transform duration-300 ease-out first:mt-2 hover:translate-x-[3px] hover:border-slate-900/40 hover:bg-gradient-to-tl hover:shadow focus:outline-hidden ${isActive ? '*:text-slate-350 from-mirage-600/20 to-mirage-600/10 hover:!from-mirage-600/20 hover:!to-mirage-600/10 translate-x-0 !border-slate-900/40 bg-gradient-to-tl from-10% shadow-none hover:!translate-x-0 hover:!border-slate-900/40 hover:bg-gradient-to-tl' : '*:text-slate-500'}`
              }
            >
              <div class='mb-0.5 flex w-full flex-col items-start p-2.5 pr-0 text-sm text-inherit'>
                <p class={`line-clamp-1 pb-0.5 text-sm leading-4 font-medium`}>
                  {item.label}
                </p>
                <p class='line-clamp-2 h-full max-h-8 w-full pr-2 !text-xs leading-4'>
                  {item.description}
                </p>
                <p class='mt-1 text-left font-sans text-xs leading-none font-light'>
                  Created {formatPGDate(item.ctime)}
                </p>
              </div>
              <Icon
                icon='star'
                onClick={async (e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  await onClick(item.id)
                }}
                className={`hover:!text-primary-350 text- ml-auto h-8 w-8 rounded border border-transparent p-1 text-slate-700 transition-colors duration-300 ${isFavorite ? '!text-primary-300' : '!text-slate-700'} link-active-${hid !== item.id}`}
              />
            </NavLink>
          )
        })}
      </div>
    </div>
  )
}
