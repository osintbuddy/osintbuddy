import { Link, NavLink, useParams } from 'react-router-dom'
import { formatPGDate } from '@/app/utilities'
import { Icon } from '@/components/icons'
import { Entity, Graph } from '@/app/api'

export function GraphLoaderCard() {
  return (
    <>
      <div class='mb-2'>
        <div class='from-mirage-600/20 to-mirage-600/10 hover:shadow-primary-950/50 shadow-cod-800/20 relative z-0 mb-1.5 flex w-full -translate-x-px items-center overflow-hidden rounded-md border border-slate-950 bg-transparent from-10% text-sm shadow-2xs transition-transform duration-300 ease-out first:mt-2 hover:translate-x-[3px] hover:border-slate-900/40 hover:bg-gradient-to-tl hover:shadow focus:outline-hidden'>
          <div class='space-y-3'>
            <div class='h-2 w-3/5 animate-pulse rounded-lg bg-slate-800/20'></div>
            <div class='h-2 w-4/5 animate-pulse rounded-lg bg-slate-800/20'></div>
            <div class='h-2 w-2/5 animate-pulse rounded-lg bg-slate-800/20'></div>
          </div>
        </div>
      </div>
    </>
  )
}

interface SubpanelProps {
  showError: any
  show: boolean
  isLoading: boolean | undefined
  setShow: () => void
  isFavorite?: boolean
  label: string
  onClick: (hid: string) => void
  items: Entity[] | Graph[]
  to: '/dashboard/entity' | '/dashboard/graph'
  errorMessage?: string | null
}

export default function Subpanel({
  showError,
  show,
  isLoading,
  setShow,
  label,
  onClick,
  items,
  to,
  errorMessage,
  isFavorite = false,
}: SubpanelProps) {
  const { hid } = useParams()
  return (
    <>
      <header
        class={`hover:border-primary-350 border-mirage-400 z-50 flex cursor-pointer items-center border-b-2 py-0.5 pb-1 text-slate-700 transition-colors duration-500 ease-in-out hover:text-slate-500`}
        onClick={setShow}
      >
        <h2
          class={`font-display ${show && '!text-slate-350/80'} px-1 text-sm leading-3 font-semibold select-none focus:outline-hidden`}
        >
          {label}
        </h2>
        <Icon
          icon='chevron-down'
          className={
            `hover:text-primary-300 mr-1 ml-auto h-5 w-5 origin-center transform cursor-pointer text-slate-600 hover:rotate-3 focus:outline-hidden ${!show && 'rotate-180'}` +
            ' transition-transform duration-300'
          }
        />
      </header>
      {showError && show && !isLoading && (
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
      {show && isLoading && !showError && (
        <>
          <GraphLoaderCard />
          <GraphLoaderCard />
        </>
      )}
      <div
        class={`overflow-y-scroll pr-2.5 pl-0.5 transition-all duration-200 ease-in ${show ? 'h-full opacity-100' : 'h-0 max-h-full'}`}
      >
        {items.map((item) => {
          return (
            <NavLink
              key={item.id}
              to={`${to}/${item.id}`}
              className={({ isActive }) =>
                `from-mirage-600/20 to-mirage-600/10 hover:shadow-primary-950/50 shadow-cod-800/20 relative z-0 mb-1.5 flex w-full -translate-x-px items-center overflow-hidden rounded-md border border-slate-950 bg-transparent from-10% text-sm shadow-2xs transition-transform duration-300 ease-out first:mt-2 hover:translate-x-[3px] hover:border-slate-900/40 hover:bg-gradient-to-tl hover:shadow focus:outline-hidden ${isActive ? '*:text-slate-350 from-mirage-600/20 to-mirage-600/10 hover:!from-mirage-600/20 hover:!to-mirage-600/10 translate-x-0 !border-slate-900/40 bg-gradient-to-tl from-10% shadow-none hover:!translate-x-0 hover:!border-slate-900/40 hover:bg-gradient-to-tl' : '*:text-slate-500'}`
              }
            >
              {({ isActive }) => (
                <>
                  <div class='group mb-0.5 flex w-full flex-col items-start p-2.5 pr-0 text-inherit'>
                    <p
                      class={`line-clamp-1 pb-0.5 text-base leading-4 ${isActive ? 'group-hover:text-slate-350' : 'group-hover:text-slate-400'}`}
                    >
                      {item.label}
                    </p>
                    <p class='mb-0.5 line-clamp-3 h-full max-h-8 w-full overflow-clip pr-6 leading-4 wrap-break-word'>
                      {item.description}
                    </p>
                    <p class='mt-1 text-left text-xs leading-none font-light'>
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
                    className={`hover:!text-primary-350 text- absolute right-0 ml-auto h-8 w-8 rounded border border-transparent p-1 text-slate-700 transition-colors duration-300 ${isFavorite ? '!text-primary-300' : '!text-slate-700'} link-active-${hid !== item.id}`}
                  />
                </>
              )}
            </NavLink>
          )
        })}
      </div>
    </>
  )
}
