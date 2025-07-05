import { Link, NavLink, useParams } from 'react-router-dom'
import { formatPGDate } from '@/app/utilities'
import { Icon } from '@/components/icons'
import { Entity, Graph } from '@/app/api'

export function GraphLoaderCard() {
  return (
    <>
      <div class='mb-2'>
        <div class='w-full py-6 space-y-1 rounded-md rounded-r-none border border-mirage-400/60  from-mirage-400/50 to-mirage-400/30 shadow bg-gradient-to-tl from-10%  before:absolute  px-4  via-mirage-400/10 relative before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-mirage-300/5 before:to-transparent isolate overflow-hidden shadow-black/5 border-l border-y'>
          <div class='space-y-3'>
            <div class='h-2 w-3/5 rounded-lg bg-slate-600/20 animate-pulse'></div>
            <div class='h-2 w-4/5 rounded-lg bg-slate-600/20 animate-pulse'></div>
            <div class='h-2 w-2/5 rounded-lg bg-slate-600/20 animate-pulse'></div>
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
        class='flex py-0.5 pb-1 items-center hover:text-slate-500 text-slate-600 hover:border-primary-400 border-slate-500/30 border-b transition-colors duration-300 ease-in-out z-50'
        onClick={setShowEntities}
      >
        <h2 class='text-sm px-1 font-semibold font-display leading-3 select-none text-inherit focus:outline-hidden cursor-pointer'>
          {label}
        </h2>
        <Icon
          icon='chevron-down'
          className={
            ` h-5 w-5 mr-1 hover:rotate-3 origin-center text-slate-600 ml-auto transform focus:outline-hidden hover:border-primary-300/40 cursor-pointer show-header-icon-${showEntities}` +
            ' transition-transform duration-100'
          }
        />
      </header>
      {showError && showEntities && !isLoading && (
        <>
          <p>
            {errorMessage?.length ? (
              <p class='text-slate-400/60 text-sm px-2'>{errorMessage}</p>
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
        class={` transition-transform duration-200  ${showEntities ? 'translate-y-0' : '-translate-y-[45%] first-child:mt-2 -scale-y-0 !h-0'}`}
      >
        {items.map((item) => {
          const isActive = hid === `${item.id}`
          return (
            <NavLink
              key={item.id}
              to={`${to}/${item.id}`}
              className={({ isActive }) =>
                `mb-1 first:mt-2 focus:outline-hidden bg-transparent border rounded-md border-transparent hover:ring-slate-700/20 hover:to-mirage-700/10 shadow hover:bg-gradient-to-tl from-10% hover:translate-x-px z-0 transition-transform hover:from-mirage-700/20 w-full flex items-center -translate-x-px relative duration-100 ease-out overflow-hidden text-slate-500 ${isActive && '*:text-slate-350 hover:-translate-x-px shadow -translate-x-px ring-slate-600/10 ring-1 ring-inset from-mirage-600/20 to-mirage-600/10 bg-gradient-to-tl from-10% hover:from-mirage-600/20 hover:to-mirage-600/10 hover:bg-gradient-to-tl '} ${isSuccess && showEntities ? 'translate-y-0 scale-y-100' : '-translate-y-full scale-y-0 '}`
              }
            >
              <div class='flex w-full p-2.5 pr-0 text-sm flex-col items-start mb-0.5    text-inherit'>
                <p
                  class={` text-sm leading-4 font-display font-medium line-clamp-1 pb-0.5`}
                >
                  {item.label}
                </p>
                <p class='max-h-8 line-clamp-2 leading-4 w-full pr-2 h-full '>
                  {item.description}
                </p>
                <p class='mt-1 font-sans text-xs font-light leading-none text-left'>
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
                className={`bg-mirage-900/20 border-transparent text-slate-600 border ml-auto rounded p-1 h-8 w-8 transition-colors duration-200 hover:text-primary-300 hover:border-mirage-300/20 ${isFavorite ? '!text-primary-350' : '!text-slate-700'} link-active-${hid !== item.id}`}
              />
            </NavLink>
          )
        })}
      </div>
    </div>
  )
}
