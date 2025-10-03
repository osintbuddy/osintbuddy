import { useMemo } from 'preact/hooks'
import { useOutletContext } from 'react-router-dom'
import { DashboardContextType } from '..'

export function GraphOverview() {
  const { graphs, favoriteGraphs } = useOutletContext<DashboardContextType>()
  const sortedGraphs = useMemo(() => {
    const sortedGraphs = graphs
      ?.slice()
      .sort((a: any, b: any) => b.ctime.localeCompare(a.ctime))
    return sortedGraphs ?? []
  }, [graphs])

  const sortedFavorites = useMemo(() => {
    if (!favoriteGraphs || !graphs) return []
    const filteredGraphs = graphs.filter((graph) =>
      favoriteGraphs.includes(graph.id)
    )
    filteredGraphs.sort((a: any, b: any) => b.ctime.localeCompare(a.ctime))
    return filteredGraphs
  }, [graphs, favoriteGraphs])

  return (
    <>
      <div className='relative -top-16 my-auto w-full items-center justify-center'>
        <div className='flex h-full flex-col items-center justify-center text-slate-400'>
          {/* Graphs available — dark, agency style */}
          <div
            className={`group bg-cod-900/50 relative grid w-full max-w-3xl place-items-start overflow-hidden rounded-xl border border-slate-800/40 px-10 py-10 shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_20px_60px_-20px_rgba(0,0,0,0.6)] backdrop-blur-md transition-colors before:absolute before:inset-0 before:-z-10 before:bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.05)_0_1px,transparent_1px_24px)] before:opacity-5 after:absolute after:inset-0 after:-z-10 after:bg-[radial-gradient(60%_60%_at_70%_-10%,rgba(22,40,255,0.12),transparent_70%)] after:opacity-30`}
          >
            {/* Top ops strip */}
            <div className='mb-6 inline-flex items-center gap-2 rounded-sm border border-slate-700/60 bg-slate-900/60 px-2 py-1 font-mono text-[10px] tracking-[0.25em] text-slate-300/80 uppercase'>
              internal // operations dashboard
            </div>

            {sortedFavorites.length === 0 && sortedGraphs.length === 0 && (
              <>
                <h1 className='font-display text-slate-350 text-3xl font-bold tracking-tight md:text-4xl'>
                  No graphs available
                </h1>
                <p className='max-w-xl pt-3 text-slate-300/90'>
                  Create a graph to begin structuring entities and
                  relationships.
                </p>
              </>
            )}

            {(sortedGraphs.length > 0 || sortedFavorites.length > 0) && (
              <>
                <div className='mb-2 flex w-full items-end justify-between gap-6'>
                  <h1 className='font-display text-6xl leading-none font-extrabold tracking-tight text-slate-300 md:text-7xl'>
                    {sortedGraphs.length}
                  </h1>
                  <div className='translate-y-1 text-right'>
                    <div className='font-mono text-[10px] tracking-[0.3em] text-slate-400/80 uppercase'>
                      total
                    </div>
                    <div className='font-display text-slate-350 text-xl font-semibold md:text-2xl'>
                      {sortedGraphs.length > 1 ? 'graphs' : 'graph'} available
                    </div>
                  </div>
                </div>
                <p className='max-w-xl pt-2 leading-6 text-slate-300/85 md:pt-3'>
                  Select an existing graph from the sidebar or create a new one
                  to continue analysis.
                </p>
              </>
            )}

            {/* Watermark ring */}
            <div className='pointer-events-none absolute -top-10 -right-8 -z-0 h-40 w-40 -rotate-12 rounded-full border border-slate-700/10' />
            <div className='pointer-events-none absolute -top-8 -right-6 -z-0 h-32 w-32 -rotate-12 rounded-full border border-slate-700/10' />
            {/* Geometric SVG background: diagonals + rotated squares */}
            <div className='pointer-events-none absolute inset-0 -z-10 opacity-20'>
              <svg
                className='h-full w-full text-slate-500/20'
                viewBox='0 0 1000 400'
                preserveAspectRatio='none'
                aria-hidden='true'
              >
                <defs>
                  <linearGradient
                    id='gradGraphsLines'
                    x1='0%'
                    y1='0%'
                    x2='100%'
                    y2='0%'
                  >
                    <stop offset='0%' stopColor='rgba(148,163,184,0.00)' />
                    <stop offset='35%' stopColor='rgba(148,163,184,0.25)' />
                    <stop offset='100%' stopColor='rgba(148,163,184,0.00)' />
                  </linearGradient>
                </defs>
                <g
                  stroke='url(#gradGraphsLines)'
                  strokeWidth='0.75'
                  shapeRendering='crispEdges'
                >
                  <line x1='-50' y1='40' x2='1050' y2='-20' />
                  <line x1='-50' y1='120' x2='1050' y2='60' />
                  <line x1='-50' y1='200' x2='1050' y2='140' />
                  <line x1='-50' y1='280' x2='1050' y2='220' />
                  <line x1='-50' y1='360' x2='1050' y2='300' />
                </g>
                <g transform='translate(180,140) rotate(18)'>
                  <rect
                    x='-60'
                    y='-60'
                    width='120'
                    height='120'
                    fill='none'
                    stroke='rgba(148,163,184,0.18)'
                    strokeWidth='1'
                  />
                  <rect
                    x='-35'
                    y='-35'
                    width='70'
                    height='70'
                    fill='none'
                    stroke='rgba(148,163,184,0.22)'
                    strokeWidth='0.75'
                  />
                </g>
                <g
                  stroke='rgba(148,163,184,0.18)'
                  strokeWidth='1'
                  shapeRendering='crispEdges'
                >
                  <path d='M30 30 L90 30 L90 36' />
                  <path d='M970 370 L910 370 L910 364' />
                </g>
              </svg>
            </div>
          </div>

          {/* Availability bias — dark, agency style */}
          <div
            className={`group bg-cod-900/50 relative mt-8 grid w-full max-w-3xl place-items-start overflow-hidden rounded-xl border border-slate-800/40 px-10 py-10 shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_20px_60px_-20px_rgba(0,0,0,0.6)] backdrop-blur-md transition-colors before:absolute before:inset-0 before:-z-10 before:bg-[repeating-linear-gradient(0deg,rgba(255,255,255,0.05)_0_1px,transparent_1px_24px)] before:opacity-5 after:absolute after:inset-0 after:-z-10 after:bg-[radial-gradient(70%_70%_at_-10%_80%,rgba(2,154,254,0.12),transparent_70%)] after:opacity-25`}
          >
            <div className='mb-6 inline-flex items-center gap-2 rounded-sm border border-slate-700/60 bg-slate-900/60 px-2 py-1 font-mono text-[10px] tracking-[0.25em] text-slate-300/80 uppercase'>
              analyst advisory
            </div>
            <h1 className='font-display text-slate-350 text-3xl font-bold tracking-tight md:text-4xl'>
              The availability bias
            </h1>
            <p className='max-w-xl py-3 text-slate-300/90'>
              Remember, data presentation can impact results during exploration
              and analysis. Availability bias is the tendency to think readily
              available examples are more representative than they really are.
              Even color can influence interpretation.
            </p>
            <div className='pointer-events-none mt-2 inline-flex items-center gap-2 rounded-sm border border-slate-800/40 bg-slate-900/40 px-2 py-1 font-mono text-[10px] tracking-[0.25em] text-slate-300/85 uppercase select-none'>
              Bias influences judgment
              <span className='h-1 w-1 rounded-full bg-slate-400/60' />
              Remain skeptical
            </div>
            {/* Watermark ring */}
            <div className='pointer-events-none absolute -bottom-12 -left-10 -z-0 h-44 w-44 rotate-6 rounded-full border border-slate-700/10' />
            <div className='pointer-events-none absolute -bottom-10 -left-6 -z-0 h-32 w-32 rotate-6 rounded-full border border-slate-700/10' />
            {/* Subtle animated scanline sweep */}
            <div className='pointer-events-none absolute inset-0 -z-0 overflow-hidden'>
              <div className='absolute -top-full right-0 left-0 h-10 [animation:scanline_7s_linear_infinite] bg-[linear-gradient(to_bottom,transparent,rgba(148,163,184,0.08),transparent)]' />
            </div>
            {/* Geometric SVG background: grid + isometric strokes */}
            <div className='pointer-events-none absolute inset-0 -z-10 opacity-20'>
              <svg
                className='h-full w-full text-slate-500/20'
                viewBox='0 0 1000 400'
                preserveAspectRatio='none'
                aria-hidden='true'
              >
                <defs>
                  <linearGradient
                    id='gradBiasLines'
                    x1='0%'
                    y1='100%'
                    x2='100%'
                    y2='0%'
                  >
                    <stop offset='0%' stopColor='rgba(148,163,184,0.00)' />
                    <stop offset='50%' stopColor='rgba(148,163,184,0.22)' />
                    <stop offset='100%' stopColor='rgba(148,163,184,0.00)' />
                  </linearGradient>
                </defs>
                <g stroke='rgba(148,163,184,0.12)' strokeWidth='0.6'>
                  <path d='M40 60 H960' />
                  <path d='M40 120 H960' />
                  <path d='M40 180 H960' />
                  <path d='M40 240 H960' />
                  <path d='M40 300 H960' />
                </g>
                <g
                  stroke='url(#gradBiasLines)'
                  strokeWidth='0.8'
                  shapeRendering='crispEdges'
                >
                  <line x1='60' y1='380' x2='400' y2='60' />
                  <line x1='260' y1='380' x2='600' y2='60' />
                  <line x1='460' y1='380' x2='800' y2='60' />
                </g>
                <g transform='translate(800,260) rotate(-8)'>
                  <rect
                    x='-90'
                    y='-50'
                    width='180'
                    height='100'
                    fill='none'
                    stroke='rgba(148,163,184,0.2)'
                    strokeWidth='1.2'
                  />
                  <rect
                    x='-60'
                    y='-30'
                    width='120'
                    height='60'
                    fill='none'
                    stroke='rgba(148,163,184,0.18)'
                    strokeWidth='0.8'
                  />
                </g>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export function EntitiesOverview() {
  const { entities: entitiesData } = useOutletContext<DashboardContextType>()
  return (
    <>
      <div className='relative -top-16 my-auto w-full items-center justify-center'>
        <div className='flex flex-col items-center justify-center text-slate-400'>
          {/* Entities available — dark cohesive card */}
          <div
            className={`group bg-cod-900/50 relative grid w-full max-w-3xl place-items-start overflow-hidden rounded-xl border border-slate-800/40 px-10 py-10 shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_20px_60px_-20px_rgba(0,0,0,0.6)] backdrop-blur-md transition-colors before:absolute before:inset-0 before:-z-10 before:bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.05)_0_1px,transparent_1px_24px)] before:opacity-5 after:absolute after:inset-0 after:-z-10 after:bg-[radial-gradient(60%_60%_at_70%_-10%,rgba(148,163,184,0.10),transparent_70%)] after:opacity-20`}
          >
            <div className='mb-6 inline-flex items-center gap-2 rounded-sm border border-slate-700/60 bg-slate-900/60 px-2 py-1 font-mono text-[10px] tracking-[0.25em] text-slate-300/80 uppercase'>
              internal // entities
            </div>
            {entitiesData.length === 0 && (
              <>
                <h1 className='font-display text-slate-350 text-3xl font-semibold tracking-tight md:text-4xl'>
                  No entities found
                </h1>
                <p className='max-w-xl md:pt-4'>
                  We couldn't find any entities. The README contains setup
                  instructions
                </p>
              </>
            )}
            {entitiesData.length > 0 && (
              <>
                <div className='mb-1.5 flex w-full items-end justify-between gap-6'>
                  <h1 className='font-display text-5xl leading-none font-bold tracking-tight text-slate-100 md:text-6xl'>
                    {entitiesData.length}
                  </h1>
                  <div className='translate-y-1 text-right'>
                    <div className='font-mono text-[10px] tracking-[0.3em] text-slate-500/70 uppercase'>
                      total
                    </div>
                    <div className='font-display text-slate-350 text-lg font-medium md:text-xl'>
                      {entitiesData.length > 1 ? 'entities' : 'entity'}{' '}
                      available
                    </div>
                  </div>
                </div>
                <p className='max-w-xl pt-2 leading-6 text-slate-300/85 md:pt-3'>
                  Select an entity from the sidebar or create one to enrich your
                  graph.
                </p>
              </>
            )}
            {/* Watermark ring */}
            <div className='pointer-events-none absolute -top-10 -right-8 -z-0 h-40 w-40 -rotate-12 rounded-full border border-slate-700/10' />
            <div className='pointer-events-none absolute -top-8 -right-6 -z-0 h-32 w-32 -rotate-12 rounded-full border border-slate-700/10' />
            {/* Geometric SVG background for entities */}
            <div className='pointer-events-none absolute inset-0 -z-10 opacity-20'>
              <svg
                className='h-full w-full text-slate-500/20'
                viewBox='0 0 1000 400'
                preserveAspectRatio='none'
                aria-hidden='true'
              >
                <defs>
                  <linearGradient
                    id='gradEntitiesLines'
                    x1='0%'
                    y1='0%'
                    x2='100%'
                    y2='0%'
                  >
                    <stop offset='0%' stopColor='rgba(148,163,184,0.00)' />
                    <stop offset='35%' stopColor='rgba(148,163,184,0.22)' />
                    <stop offset='100%' stopColor='rgba(148,163,184,0.00)' />
                  </linearGradient>
                </defs>
                <g
                  stroke='url(#gradEntitiesLines)'
                  strokeWidth='0.75'
                  shapeRendering='crispEdges'
                >
                  <line x1='-50' y1='80' x2='1050' y2='20' />
                  <line x1='-50' y1='160' x2='1050' y2='100' />
                  <line x1='-50' y1='240' x2='1050' y2='180' />
                  <line x1='-50' y1='320' x2='1050' y2='260' />
                </g>
                <g transform='translate(820,140) rotate(-12)'>
                  <rect
                    x='-70'
                    y='-70'
                    width='140'
                    height='140'
                    fill='none'
                    stroke='rgba(148,163,184,0.18)'
                    strokeWidth='1'
                  />
                  <rect
                    x='-40'
                    y='-40'
                    width='80'
                    height='80'
                    fill='none'
                    stroke='rgba(148,163,184,0.22)'
                    strokeWidth='0.75'
                  />
                </g>
              </svg>
            </div>
          </div>

          {/* Entities note — cohesive bias-style card */}
          <div
            className={`group bg-cod-900/50 relative mt-8 grid w-full max-w-3xl place-items-start overflow-hidden rounded-xl border border-slate-800/40 px-10 py-10 shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_20px_60px_-20px_rgba(0,0,0,0.6)] backdrop-blur-md transition-colors before:absolute before:inset-0 before:-z-10 before:bg-[repeating-linear-gradient(0deg,rgba(255,255,255,0.05)_0_1px,transparent_1px_24px)] before:opacity-5 after:absolute after:inset-0 after:-z-10 after:bg-[radial-gradient(70%_70%_at_-10%_80%,rgba(148,163,184,0.10),transparent_70%)] after:opacity-20`}
          >
            <div className='text-slate-350 mb-6 inline-flex items-center gap-2 rounded-sm border border-slate-700/60 bg-slate-900/60 px-2 py-1 font-mono text-[10px] tracking-[0.25em] uppercase'>
              Analyst advisory
            </div>
            <h1 className='font-display text-slate-350 text-3xl font-semibold tracking-tight md:text-4xl'>
              Confirmation bias
            </h1>
            <p className='max-w-xl py-3 text-slate-300/85'>
              To search for, interpret, favor, and recall information in a way
              that confirms prior beliefs. What you ask and how you frame it
              matters.
            </p>
            <div className='pointer-events-none mt-2 inline-flex items-center gap-2 rounded-sm border border-slate-800/40 bg-slate-900/40 px-2 py-1 font-mono text-[10px] tracking-[0.25em] text-slate-300/85 uppercase select-none'>
              Bias influences judgment
              <span className='h-1 w-1 rounded-full bg-slate-400/60' />
              Remain skeptical
            </div>
            {/* Watermark ring */}
            <div className='pointer-events-none absolute -bottom-12 -left-10 -z-0 h-44 w-44 rotate-6 rounded-full border border-slate-700/10' />
            <div className='pointer-events-none absolute -bottom-10 -left-6 -z-0 h-32 w-32 rotate-6 rounded-full border border-slate-700/10' />
            {/* Geometric SVG background */}
            <div className='pointer-events-none absolute inset-0 -z-10 opacity-20'>
              <svg
                className='h-full w-full text-slate-500/20'
                viewBox='0 0 1000 400'
                preserveAspectRatio='none'
                aria-hidden='true'
              >
                <defs>
                  <linearGradient
                    id='gradEntitiesNote'
                    x1='0%'
                    y1='100%'
                    x2='100%'
                    y2='0%'
                  >
                    <stop offset='0%' stopColor='rgba(148,163,184,0.00)' />
                    <stop offset='50%' stopColor='rgba(148,163,184,0.22)' />
                    <stop offset='100%' stopColor='rgba(148,163,184,0.00)' />
                  </linearGradient>
                </defs>
                <g stroke='rgba(148,163,184,0.12)' strokeWidth='0.6'>
                  <path d='M40 80 H960' />
                  <path d='M40 160 H960' />
                  <path d='M40 240 H960' />
                  <path d='M40 320 H960' />
                </g>
                <g
                  stroke='url(#gradEntitiesNote)'
                  strokeWidth='0.8'
                  shapeRendering='crispEdges'
                >
                  <line x1='120' y1='360' x2='420' y2='80' />
                  <line x1='320' y1='360' x2='620' y2='80' />
                </g>
                <g transform='translate(180,260) rotate(14)'>
                  <rect
                    x='-80'
                    y='-40'
                    width='160'
                    height='80'
                    fill='none'
                    stroke='rgba(148,163,184,0.2)'
                    strokeWidth='1.2'
                  />
                  <rect
                    x='-50'
                    y='-25'
                    width='100'
                    height='50'
                    fill='none'
                    stroke='rgba(148,163,184,0.18)'
                    strokeWidth='0.8'
                  />
                </g>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
