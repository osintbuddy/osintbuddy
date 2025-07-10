import { useState, useEffect, useCallback, useMemo } from 'preact/hooks'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Responsive, WidthProvider, Layout } from 'react-grid-layout'
import { Icon } from '@/components/icons'
import { PositionMode, useEntitiesStore, useGraphFlowStore } from '@/app/store'
import { Graph } from '@/app/api'

export function EntityOption({ entity, onDragStart }: JSONObject) {
  return (
    <>
      <li
        key={entity.label}
        className='flex w-full items-center justify-between pb-2.5'
      >
        <div
          draggable
          onDragStart={(event) => onDragStart(event, entity.label)}
          className='border-l-primary-350 hover:border-primary-400 from-mirage-600/20 to-mirage-600/10 hover:shadow-primary-950/50 shadow-cod-800/20 relative z-0 flex max-h-[160px] w-full min-w-[12rem] -translate-x-px items-center justify-between overflow-hidden overflow-x-hidden rounded-md border border-l-[6px] border-slate-950 bg-transparent bg-gradient-to-br from-10% p-2 text-sm shadow-2xs backdrop-blur-md transition-all duration-300 ease-out hover:translate-x-[3px] hover:border-l-[6px] hover:bg-gradient-to-tl hover:from-40% hover:shadow focus:outline-hidden'
        >
          <div className='flex w-full flex-col select-none'>
            <div className='relative flex w-full items-start justify-between gap-x-3'>
              <p className='text-sm leading-6 font-semibold whitespace-nowrap text-slate-300/80'>
                {entity.label}
              </p>
            </div>
            <div className='flex flex-wrap items-center gap-x-2 text-xs leading-5 text-slate-500'>
              <p className='line-clamp-2 truncate leading-5 whitespace-normal text-slate-400'>
                {entity.description}
              </p>
              <br />
              <p className='flex items-center truncate text-xs leading-5 text-slate-500'>
                Created by {entity.author ? entity.author : 'OSINTBuddy'}
              </p>
            </div>
          </div>
        </div>
      </li>
    </>
  )
}

interface OverlayMenusProps {
  positionMode: PositionMode
  graph: Graph | null
  setElkLayout: Function
  toggleForceLayout: Function
  fitView: Function
  clearGraph: Function
}

const ResponsiveGridLayout = WidthProvider(Responsive)

export default function OverlayMenus({
  positionMode,
  setElkLayout,
  graph,
  toggleForceLayout,
  fitView,
  clearGraph,
}: OverlayMenusProps) {
  // Use the entities store to fetch plugin entities
  const [searchFilter, setSearchFilter] = useState('')
  const { plugins } = useEntitiesStore()

  const filteredPlugins = useMemo(
    () =>
      searchFilter
        ? plugins.filter(
            (entity) =>
              entity.label.toLowerCase().includes(searchFilter.toLowerCase()) ||
              entity.description
                .toLowerCase()
                .includes(searchFilter.toLowerCase())
          )
        : plugins,
    [searchFilter, plugins]
  )
  const onDragStart = (event: DragEvent, nodeType: string) => {
    if (event?.dataTransfer) {
      event.dataTransfer.setData('application/reactflow', nodeType)
      event.dataTransfer.effectAllowed = 'move'
    }
    event.stopPropagation()
  }
  const [isEntitiesDraggable, setIsEntitiesDraggable] = useState(false)
  const [isPositionsDraggable, setIsPositionDraggable] = useState(false)

  const [entitiesLayout, setEntitiesLayout] = useState<Layout>({
    i: 'entities',
    w: 7,
    h: 57,
    x: 0,
    y: 4,
    minW: 2,
    maxW: 44,
    minH: 3,
    maxH: 60,
    isDraggable: false,
    isBounded: true,
  })

  const [appbarLayout, setAppbarLayout] = useState<Layout>({
    i: 'positions',
    w: 44,
    h: 4,
    x: 0,
    y: 0,
    minW: 10,
    maxW: 44,
    minH: 4,
    maxH: 4,
    isDraggable: false,
    isBounded: true,
  })

  const { setPositionMode } = useGraphFlowStore()
  const [isForceActive, setIsForceActive] = useState(false)
  const navigate = useNavigate()

  return (
    <ResponsiveGridLayout
      allowOverlap={false}
      preventCollision={true}
      compactType={null}
      className='pointer-events-none absolute inset-0 z-10'
      style={{ width: '100%', height: '100%' }}
      rowHeight={4}
      resizeHandles={['se']}
      breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
      cols={{ lg: 40, md: 40, sm: 28, xs: 22, xxs: 18 }}
      isDraggable={true}
      isResizable={true}
      isBounded={true}
      layouts={{
        lg: [
          { ...appbarLayout, isDraggable: isPositionsDraggable },
          { ...entitiesLayout, isDraggable: isEntitiesDraggable },
        ],
      }}
      onLayoutChange={(layout, layouts) => {
        setAppbarLayout({
          ...(layouts.lg.find((layout) => layout.i === 'positions') as Layout),
          isDraggable: isPositionsDraggable,
          isBounded: true,
        })
        setEntitiesLayout({
          ...(layouts.lg.find((layout) => layout.i === 'entities') as Layout),
          isDraggable: isEntitiesDraggable,
          isBounded: true,
        })
      }}
    >
      <div
        key='positions'
        className='pointer-events-auto flex w-full flex-col rounded-md border-black/10 bg-gradient-to-tr from-black/40 to-black/50 py-px shadow-2xl shadow-black/25 backdrop-blur-md'
      >
        <div className='flex w-full items-center justify-center'>
          <button
            className='hover:to-mirage-500/30 hover:border-primary-400/50 hover:text-primary-300/80 focus:bg-mirage-800 from-mirage-950/20 to-mirage-600/10 hover:shadow-primary-950/50 shadow-cod-800/20 iflex relative z-0 shrink -translate-x-px items-center justify-center overflow-hidden rounded-md border border-slate-950 bg-transparent bg-gradient-to-br from-10% p-2 text-sm text-slate-500 shadow-2xs outline-hidden hover:bg-gradient-to-tl hover:from-black/20 hover:from-40% hover:shadow focus:outline-hidden'
            onClick={() => {
              clearGraph()
              navigate('/dashboard', { replace: true })
            }}
          >
            <Icon icon='home' className='h-6 w-6' />
          </button>
          <button
            onClick={() => setIsPositionDraggable(!isPositionsDraggable)}
            className='hover:text-alert-700 font-display whitespace-nowrap text-slate-800'
          >
            {isPositionsDraggable ? (
              <Icon icon='lock-open' className='h-5 w-5 text-inherit' />
            ) : (
              <Icon icon='lock' className='h-5 w-5 text-inherit' />
            )}
          </button>
          <h5
            title={graph?.description ?? ''}
            className='mr-auto w-72 justify-between truncate pl-3 font-sans font-bold whitespace-nowrap'
          >
            <span className='text-slate-400'>{graph?.label}</span>
          </h5>
          <div className='flex items-center'>
            <button
              className='hover:to-mirage-500/30 hover:border-primary-400/50 hover:text-primary-300/80 focus:bg-mirage-800 from-mirage-950/20 to-mirage-600/10 hover:shadow-primary-950/50 shadow-cod-800/20 iflex relative z-0 shrink -translate-x-px items-center justify-center overflow-hidden rounded-md border border-slate-950 bg-transparent bg-gradient-to-br from-10% p-2 text-sm text-slate-500 shadow-2xs outline-hidden hover:bg-gradient-to-tl hover:from-black/20 hover:from-40% hover:shadow focus:outline-hidden'
              onClick={() => fitView({ duration: 300 })}
            >
              <Icon icon='viewfinder' className='h-6 w-6' />
            </button>
          </div>
          <button
            onClick={() => {
              setIsForceActive(false)
              toggleForceLayout && toggleForceLayout(false)
              setPositionMode('manual')
            }}
            type='button'
            className={`hover:to-mirage-500/30 hover:border-primary-400/50 hover:text-primary-300/80 focus:bg-mirage-800 from-mirage-950/20 to-mirage-600/10 hover:shadow-primary-950/50 shadow-cod-800/20 iflex relative z-0 shrink -translate-x-px items-center justify-center overflow-hidden rounded-md border border-slate-950 bg-transparent bg-gradient-to-br from-10% p-2 text-sm text-slate-500 shadow-2xs outline-hidden hover:bg-gradient-to-tl hover:from-black/20 hover:from-40% hover:shadow focus:outline-hidden ${
              positionMode === 'manual'
                ? 'bg-mirage-800/80 hover:bg-mirage-800 border-primary-400/50 hover:border-primary-400/50'
                : ''
            }`}
          >
            <Icon
              icon='hand-three-fingers'
              className={`h-6 w-6 ${positionMode === 'manual' ? 'text-primary-300' : ''}`}
              aria-hidden='true'
            />
          </button>
          <button
            onClick={() => {
              setPositionMode('force')
              toggleForceLayout && toggleForceLayout(!isForceActive)
              setIsForceActive(!isForceActive)
            }}
            type='button'
            className={`hover:to-mirage-500/30 hover:border-primary-400/50 hover:text-primary-300/80 focus:bg-mirage-800 from-mirage-950/20 to-mirage-600/10 hover:shadow-primary-950/50 shadow-cod-800/20 iflex relative z-0 shrink -translate-x-px items-center justify-center overflow-hidden rounded-md border border-slate-950 bg-transparent bg-gradient-to-br from-10% p-2 text-sm text-slate-500 shadow-2xs outline-hidden hover:bg-gradient-to-tl hover:from-black/20 hover:from-40% hover:shadow focus:outline-hidden ${
              positionMode === 'force'
                ? 'bg-mirage-800/80 hover:bg-mirage-800 border-primary-400/50 hover:border-primary-400/50'
                : ''
            }`}
          >
            <Icon
              icon={
                isForceActive !== undefined && isForceActive
                  ? 'cube-3d-sphere'
                  : 'cube-3d-sphere-off'
              }
              className={`h-6 w-6 text-inherit ${positionMode === 'force' ? 'text-primary-300' : ''}`}
            />
          </button>
          <button
            onClick={() => {
              toggleForceLayout && toggleForceLayout(false)
              // setElkLayout({ 'elk.algorithm': 'org.eclipse.elk.radial', })
              // setElkLayout({ 'elk.algorithm': 'layered', 'elk.direction': 'DOWN' })
              // setElkLayout({ 'elk.algorithm': 'layered', 'elk.direction': 'RIGHT' })
              setIsForceActive(false)
              setPositionMode('elk')
              setElkLayout({
                'elk.algorithm': 'layered',
                'elk.direction': 'RIGHT',
              })
            }}
            type='button'
            className={`hover:to-mirage-500/30 hover:border-primary-400/50 hover:text-primary-300/80 focus:bg-mirage-800 from-mirage-950/20 to-mirage-600/10 hover:shadow-primary-950/50 shadow-cod-800/20 iflex relative z-0 shrink -translate-x-px items-center justify-center overflow-hidden rounded-md border border-slate-950 bg-transparent bg-gradient-to-br from-10% p-2 text-sm text-slate-500 shadow-2xs outline-hidden hover:bg-gradient-to-tl hover:from-black/20 hover:from-40% hover:shadow focus:outline-hidden ${
              positionMode === 'right tree'
                ? 'bg-mirage-800/80 hover:bg-mirage-800 border-primary-400/50 hover:border-primary-400/50'
                : ''
            }`}
          >
            <Icon
              icon='binary-tree-2'
              className={`h-6 w-6 origin-center -rotate-90 text-inherit ${positionMode === 'right tree' ? 'text-primary-300' : ''}`}
            />
          </button>
          <button
            onClick={() => {
              setIsForceActive(false)
              toggleForceLayout && toggleForceLayout(false)
              setPositionMode('elk')
              setElkLayout({
                'elk.algorithm': 'layered',
                'elk.direction': 'DOWN',
              })
            }}
            type='button'
            className={`hover:to-mirage-500/30 hover:border-primary-400/50 hover:text-primary-300/80 focus:bg-mirage-800 from-mirage-950/20 to-mirage-600/10 hover:shadow-primary-950/50 shadow-cod-800/20 iflex relative z-0 shrink -translate-x-px items-center justify-center overflow-hidden rounded-md border border-slate-950 bg-transparent bg-gradient-to-br from-10% p-2 text-sm text-slate-500 shadow-2xs outline-hidden hover:bg-gradient-to-tl hover:from-black/20 hover:from-40% hover:shadow focus:outline-hidden ${
              positionMode === 'tree'
                ? 'bg-mirage-800/80 hover:bg-mirage-800 border-primary-400/50 hover:border-primary-400/50'
                : ''
            }`}
          >
            <Icon
              icon='binary-tree'
              className={`h-6 w-6 text-inherit ${positionMode === 'tree' ? 'text-primary-300' : ''}`}
            />
          </button>
        </div>

        <ul className='isolate inline-flex shadow-sm'></ul>
      </div>

      <div
        className='pointer-events-auto z-10 flex h-min w-full flex-col overflow-hidden rounded-md border border-black/10 bg-gradient-to-br from-black/40 to-black/30 py-px shadow-2xl shadow-black/25 backdrop-blur-md'
        key='entities'
        id='node-options-tour'
      >
        <ol className='relative flex px-4 pt-2 text-sm select-none'>
          <li className='mr-auto flex'>
            <h5 className='font-display flex w-full items-center justify-between truncate whitespace-nowrap text-inherit'>
              <Link
                title='View all graphs'
                className='text-slate-500'
                to='/dashboard/entity'
                replace
              >
                Entities
              </Link>
            </h5>
          </li>
          <li className='flex'>
            <div className='flex w-full items-center justify-between'>
              <button
                onClick={() => setIsEntitiesDraggable(!isEntitiesDraggable)}
                className='hover:text-alert-700 font-display t whitespace-nowrap text-slate-800'
              >
                {isEntitiesDraggable ? (
                  <Icon icon='lock-open' className='h-5 w-5 text-inherit' />
                ) : (
                  <Icon icon='lock' className='h-5 w-5 text-inherit' />
                )}
              </button>
            </div>
          </li>
        </ol>
        <div className='hover:border-mirage-200/40 to-mirage-400/70 from-mirage-300/60 focus-within:!border-primary/40 border-mirage-400/20 ring-light-900/10 focus-within:from-mirage-400/20 focus-within:to-mirage-400/30 mx-4 mt-2.5 mb-2 block items-center justify-between rounded border bg-gradient-to-br px-3.5 py-1 text-slate-100 shadow-sm transition-colors duration-200 ease-in-out focus-within:bg-gradient-to-l'>
          <input
            onChange={(e) => setSearchFilter(e.currentTarget.value)}
            className='block w-full bg-transparent outline-hidden backdrop-blur-md placeholder:text-slate-700 sm:text-sm'
            placeholder='Search entities...'
          />
        </div>
        <ul className='relative ml-4 h-full overflow-y-scroll pr-4'>
          {filteredPlugins?.length === 0 && (
            <li className='flex w-full items-center justify-center py-8'>
              <div className='text-sm text-slate-500'>No entities found!</div>
            </li>
          )}
          {filteredPlugins.map((entity) => (
            <EntityOption
              onDragStart={onDragStart}
              key={entity.label}
              entity={entity}
            />
          ))}
        </ul>
      </div>
    </ResponsiveGridLayout>
  )
}
