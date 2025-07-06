import { useState, useEffect, useCallback, useMemo } from 'preact/hooks'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Responsive, WidthProvider, Layout } from 'react-grid-layout'
import { Icon } from '@/components/icons'
import { useGraphVisualizationStore, useEntitiesStore } from '@/app/store'

type UseResizeProps = {
  minWidth: number
}

type UseResizeReturn = {
  width: number
  enableResize: () => void
}

export const useResize = ({ minWidth }: UseResizeProps): UseResizeReturn => {
  const [isResizing, setIsResizing] = useState(false)
  const [width, setWidth] = useState(minWidth)

  const enableResize = useCallback(() => {
    setIsResizing(true)
  }, [setIsResizing])

  const disableResize = useCallback(() => {
    setIsResizing(false)
  }, [setIsResizing])

  const resize = useCallback(
    (e: MouseEvent) => {
      if (isResizing) {
        const newWidth = e.clientX // You may want to add some offset here from props
        if (newWidth >= minWidth) {
          setWidth(newWidth)
        }
      }
    },
    [minWidth, isResizing, setWidth]
  )

  useEffect(() => {
    document.addEventListener('mousemove', resize)
    document.addEventListener('mouseup', disableResize)

    return () => {
      document.removeEventListener('mousemove', resize)
      document.removeEventListener('mouseup', disableResize)
    }
  }, [disableResize, resize])

  return { width, enableResize }
}

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
          className='from-mirage-400/50 to-mirage-400/40 hover:from-mirage-500/40 hover:to-mirage-400/60 border-mirage-300/20 border-l-primary-300/50 hover:border-primary-400 flex max-h-[160px] w-full min-w-[12rem] justify-between overflow-x-hidden rounded-md border border-l-[6px] bg-gradient-to-br p-2 backdrop-blur-md transition-colors duration-100 ease-out hover:border-l-[6px] hover:from-40%'
        >
          <div className='flex w-full flex-col select-none'>
            <div className='relative flex w-full items-start justify-between gap-x-3'>
              <p className='text-sm leading-6 font-semibold whitespace-nowrap text-slate-300/80'>
                {entity.label}
              </p>
            </div>
            <div className='flex flex-wrap items-center gap-x-2 text-xs leading-5 text-slate-500'>
              <p className='line-clamp-2 truncate leading-5 whitespace-normal text-slate-500'>
                {entity.description}
              </p>
              <br />
              <p className='flex items-center truncate text-xs leading-5 text-slate-500'>
                <svg
                  viewBox='0 0 2 2'
                  className='mr-1.5 ml-0 h-0.5 w-0.5 fill-current'
                >
                  <circle cx={1} cy={1} r={1} />
                </svg>
                Created by {entity.author ? entity.author : 'OSINTBuddy'}
              </p>
            </div>
          </div>
        </div>
      </li>
    </>
  )
}

const ResponsiveGridLayout = WidthProvider(Responsive)

const MAX_GRAPH_LABEL_LENGTH = 22

export default function EntityOptions({
  positionMode,
  activeGraph,
  setElkLayout,
  toggleForceLayout,
  fitView,
}: JSONObject) {
  const { hid = '' } = useParams()

  // Use the entities store to fetch plugin entities
  const { pluginEntities, isLoadingPlugins, error, fetchPluginEntities } =
    useEntitiesStore()

  const [showEntities, setShowEntities] = useState(true)
  const [searchFilter, setSearchFilter] = useState('')

  // Fetch plugin entities on component mount
  useEffect(() => {
    fetchPluginEntities()
  }, [])

  const entities = useMemo(
    () =>
      searchFilter
        ? pluginEntities.filter((entity) =>
            entity.label.toLowerCase().includes(searchFilter.toLowerCase())
          )
        : pluginEntities,
    [searchFilter, pluginEntities]
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
    minH: 2.4,
    maxH: 60,
    isDraggable: false,
    isBounded: true,
  })

  const [positionsLayout, setPositionsLayout] = useState<Layout>({
    i: 'positions',
    w: 44,
    h: 1.4,
    x: 0,
    y: 0,
    minW: 10,
    maxW: 44,
    minH: 1.4,
    maxH: 1.4,
    isDraggable: false,
    isBounded: true,
  })

  const { setPositionMode, setEditState } = useGraphVisualizationStore()
  const [isForceActive, setIsForceActive] = useState(false)
  const navigate = useNavigate()

  console.log('pluginEntities', pluginEntities)

  return (
    <ResponsiveGridLayout
      allowOverlap={false}
      preventCollision={true}
      compactType={null}
      className='absolute z-50'
      rowHeight={4}
      resizeHandles={['ne']}
      breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
      cols={{ lg: 40, md: 40, sm: 28, xs: 22, xxs: 18 }}
      isDraggable={true}
      isResizable={true}
      layouts={{
        lg: [
          { ...positionsLayout, isDraggable: isPositionsDraggable },
          { ...entitiesLayout, isDraggable: isEntitiesDraggable },
        ],
      }}
      onLayoutChange={(layout, layouts) => {
        setPositionsLayout({
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
      <div key='positions' className='flex w-full flex-col'>
        <section className='border-mirage-800/40 from-mirage-800/40 to-mirage-800/50 relative flex h-min justify-between rounded-lg rounded-b-sm border bg-gradient-to-r shadow-md backdrop-blur-md'>
          <div className='flex items-center'>
            <button
              className='from-mirage-400/30 to-mirage-400/40 hover:from-mirage-500/20 hover:to-mirage-500/30 border-mirage-300/20 hover:border-primary-400/50 hover:text-primary-300/80 focus:bg-mirage-800 relative inline-flex grow items-center justify-center rounded-sm border bg-gradient-to-br px-2 py-2 text-slate-500 outline-hidden transition-colors duration-100 ease-in-out hover:from-40% focus:z-10'
              onClick={() => navigate('/dashboard', { replace: true })}
            >
              <Icon icon='home' className='h-6' />
            </button>
            <h5
              title={activeGraph?.description ?? ''}
              className='w-72 justify-between truncate pl-3 font-sans font-bold whitespace-nowrap text-inherit text-slate-600'
            >
              <span className='text-slate-400'>{activeGraph?.label}</span>
            </h5>
            <ul className='isolate inline-flex shadow-sm'>
              <div className='flex items-center'>
                <button
                  className='from-mirage-400/30 to-mirage-400/40 hover:from-mirage-500/20 hover:to-mirage-500/30 border-mirage-300/20 hover:border-primary-400/50 hover:text-primary-300/80 focus:bg-mirage-800 relative inline-flex grow items-center justify-center rounded-sm border bg-gradient-to-br px-2 py-2 text-slate-500 outline-hidden transition-colors duration-100 ease-in-out hover:from-40% focus:z-10'
                  onClick={() => fitView({ duration: 300 })}
                >
                  <Icon icon='viewfinder' className='h-6' />
                </button>
              </div>
            </ul>
          </div>

          <ul className='isolate inline-flex shadow-sm'>
            <button
              onClick={() => {
                setIsForceActive(false)
                toggleForceLayout && toggleForceLayout(false)
                setPositionMode('manual')
                setEditState('layoutChangeM', '')
              }}
              type='button'
              className={`from-mirage-300/10 to-mirage-300/20 hover:from-mirage-500/20 hover:to-mirage-300/30 border-mirage-300/60 hover:border-primary-400/50 hover:text-primary-300/80 focus:bg-mirage-800 hover:bg-mirage-600 relative inline-flex grow items-center justify-center rounded-sm border bg-gradient-to-br px-2 text-slate-500 outline-hidden transition-colors duration-100 ease-in-out hover:from-40% focus:z-10 ${
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
              className={`from-mirage-300/10 to-mirage-300/20 hover:from-mirage-500/20 hover:to-mirage-300/30 border-mirage-300/20 hover:border-primary-400/50 hover:text-primary-300/80 focus:bg-mirage-800 hover:bg-mirage-600 relative inline-flex grow items-center justify-center rounded-sm border bg-gradient-to-br px-2 py-2 text-slate-500 outline-hidden transition-colors duration-100 ease-in-out hover:from-40% focus:z-10 ${
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
                setEditState('layoutChangeRT', '')
              }}
              type='button'
              className={`from-mirage-300/10 to-mirage-300/20 hover:from-mirage-500/20 hover:to-mirage-300/30 border-mirage-300/20 hover:border-primary-400/50 hover:text-primary-300/80 focus:bg-mirage-800 hover:bg-mirage-600 relative inline-flex grow items-center justify-center rounded-sm border bg-gradient-to-br px-2 py-2 text-slate-500 outline-hidden transition-colors duration-100 ease-in-out hover:from-40% focus:z-10 ${
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
                setEditState('layoutChangeDT', '')
              }}
              type='button'
              className={`from-mirage-300/10 to-mirage-300/20 hover:from-mirage-500/20 hover:to-mirage-300/30 border-mirage-300/20 hover:border-primary-400/50 hover:text-primary-300/80 focus:bg-mirage-800 hover:bg-mirage-600 relative inline-flex grow items-center justify-center rounded-sm border bg-gradient-to-br px-2 py-2 text-slate-500 outline-hidden transition-colors duration-100 ease-in-out hover:from-40% focus:z-10 ${
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
          </ul>
        </section>
      </div>

      <div
        className='border-mirage-800/40 from-mirage-800/30 to-mirage-800/60 z-10 flex h-min flex-col overflow-hidden rounded-md border bg-gradient-to-br'
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
                className='hover:text-alert-700 font-display whitespace-nowrap text-inherit text-slate-600'
                title={activeGraph.name}
                aria-current={activeGraph.description}
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
        {showEntities && (
          <>
            <div className='hover:border-mirage-200/40 to-mirage-400/70 from-mirage-300/60 focus-within:!border-primary/40 border-mirage-400/20 ring-light-900/10 focus-within:from-mirage-400/20 focus-within:to-mirage-400/30 mx-4 mt-2.5 mb-2 block items-center justify-between rounded border bg-gradient-to-br px-3.5 py-1 text-slate-100 shadow-sm transition-colors duration-200 ease-in-out focus-within:bg-gradient-to-l'>
              <input
                onChange={(e) => setSearchFilter(e.currentTarget.value)}
                className='block w-full bg-transparent outline-hidden backdrop-blur-md placeholder:text-slate-700 sm:text-sm'
                placeholder='Search entities...'
              />
            </div>
            <ul className='relative ml-4 h-full overflow-y-scroll pr-4'>
              {isLoadingPlugins ? (
                <li className='flex w-full items-center justify-center py-8'>
                  <div className='text-sm text-slate-500'>
                    Loading entities...
                  </div>
                </li>
              ) : error ? (
                <li className='flex w-full items-center justify-center py-8'>
                  <div className='text-sm text-red-400'>
                    Error loading entities: {error}
                  </div>
                </li>
              ) : entities.length === 0 ? (
                <li className='flex w-full items-center justify-center py-8'>
                  <div className='text-sm text-slate-500'>
                    No entities found
                  </div>
                </li>
              ) : (
                entities.map((entity) => (
                  <EntityOption
                    onDragStart={onDragStart}
                    key={entity.label}
                    entity={entity}
                  />
                ))
              )}
            </ul>
          </>
        )}
      </div>
    </ResponsiveGridLayout>
  )
}
