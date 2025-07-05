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
          <div className='shadow-primary-950/60 from-cod-900/25 to-cod-950/60 grid w-full max-w-2xl place-items-start rounded-md border-2 border-slate-950/50 bg-gradient-to-br px-13 py-10 shadow-lg backdrop-blur-sm'>
            {sortedFavorites.length === 0 && sortedGraphs.length === 0 && (
              <>
                <h1 className='font-display border-b-primary-300 border-b-3 pr-2 text-3xl leading-9 font-semibold lg:text-4xl'>
                  Oh no!
                </h1>
                <p className='max-w-xl pt-4'>
                  We're usually a treasure chest of knowledge, but we couldn't
                  find any graphs. Get started by creating a new graph
                </p>
              </>
            )}
            {(sortedGraphs.length > 0 || sortedFavorites.length > 0) && (
              <>
                <h1 className='font-display border-b-primary-300 border-b-3 pr-2 text-3xl leading-9 font-semibold lg:text-4xl'>
                  {sortedGraphs.length + sortedFavorites.length}{' '}
                  {sortedFavorites.length + sortedGraphs.length > 1
                    ? 'graphs'
                    : 'graph'}
                  &nbsp;available
                </h1>
                <p className='max-w-xl md:pt-4'>
                  Get started by selecting an existing graph from the sidebar on
                  the left or you can create a new graph with the button located
                  towards the bottom left
                </p>
              </>
            )}
          </div>
          <div className='shadow-primary-950/60 from-cod-900/25 to-cod-950/60 mt-8 grid w-full max-w-2xl place-items-start rounded-md border-2 border-slate-950/50 bg-gradient-to-br px-13 py-10 shadow-lg backdrop-blur-sm'>
            <h1 className='font-display border-b-primary-300 border-b-3 pr-2 text-3xl leading-9 font-semibold lg:text-4xl'>
              The availability bias{' '}
            </h1>
            <p className='max-w-xl py-3'>
              Remember, data presentation can impact results during exploration
              and analysis. Availability bias is the tendency to think readily
              available examples are more representative than they really are.
              Even color can influence interpretation.
            </p>
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
          <div className='shadow-primary-950/60 from-cod-900/25 to-cod-950/60 grid w-full max-w-2xl place-items-start rounded-md border-2 border-slate-950/50 bg-gradient-to-br px-13 py-10 shadow-lg backdrop-blur-sm'>
            {entitiesData.length === 0 && (
              <>
                <h1 className='font-display border-b-primary-300 border-b-3 pr-2 text-3xl leading-9 font-semibold lg:text-4xl'>
                  Oh no!
                </h1>
                <p className='max-w-xl md:pt-4'>
                  We're usually a treasure chest of knowledge, but we couldn't
                  find any entities. Read the OSINTBuddy docs to get setup
                </p>
              </>
            )}
            {entitiesData.length > 0 && (
              <>
                <h1 className='font-display border-b-primary-300 border-b-3 pr-2 text-3xl leading-9 font-semibold lg:text-4xl'>
                  {entitiesData.length}{' '}
                  {entitiesData.length > 1 ? 'entities' : 'entity'} available
                </h1>
                <p className='max-w-xl leading-6.5 md:pt-4'>
                  View entity information by selecting one from the sidebar on
                  the left or you can create a new entity for your workspace
                  with the create entity button
                </p>
              </>
            )}
          </div>
          <div className='shadow-primary-950/60 from-cod-900/25 to-cod-950/60 mt-8 grid w-full max-w-2xl place-items-start rounded-md border-2 border-slate-950/50 bg-gradient-to-br px-13 py-10 shadow-lg backdrop-blur-sm'>
            <h1 className='text-slate-350 font-display border-b-primary-300 border-b-3 pr-2 text-3xl leading-9 font-semibold lg:text-4xl'>
              Confirmation bias
            </h1>
            <p className='max-w-xl py-3'>
              To search for, interpret, favor and recall information in a way
              that confirms one's prior beliefs. What you search for matters.
              Remember that a small change in a question's wording can affect
              how you search through available information.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
