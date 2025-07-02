import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Responsive, WidthProvider, Layout } from 'react-grid-layout';
import { Icon } from '@/components/icons';

type UseResizeProps = {
  minWidth: number;
};

type UseResizeReturn = {
  width: number;
  enableResize: () => void;
};

export const useResize = ({ minWidth }: UseResizeProps): UseResizeReturn => {
  const [isResizing, setIsResizing] = useState(false);
  const [width, setWidth] = useState(minWidth);

  const enableResize = useCallback(() => {
    setIsResizing(true);
  }, [setIsResizing]);

  const disableResize = useCallback(() => {
    setIsResizing(false);
  }, [setIsResizing]);

  const resize = useCallback(
    (e: MouseEvent) => {
      if (isResizing) {
        const newWidth = e.clientX; // You may want to add some offset here from props
        if (newWidth >= minWidth) {
          setWidth(newWidth);
        }
      }
    },
    [minWidth, isResizing, setWidth]
  );

  useEffect(() => {
    document.addEventListener('mousemove', resize);
    document.addEventListener('mouseup', disableResize);

    return () => {
      document.removeEventListener('mousemove', resize);
      document.removeEventListener('mouseup', disableResize);
    };
  }, [disableResize, resize]);

  return { width, enableResize };
};


export function EntityOption({ entity, onDragStart }: JSONObject) {
  return (
    <>
      <li key={entity.label} className='flex items-center w-full justify-between pb-2.5'>
        <div
          draggable
          onDragStart={(event) => onDragStart(event, entity.label)}
          className='flex min-w-[12rem] p-2 justify-between overflow-x-hidden from-mirage-400/50 to-mirage-400/40 hover:from-mirage-500/40 hover:to-mirage-400/60 bg-gradient-to-br  hover:from-40%  border-mirage-300/20 border max-h-[160px] border-l-primary-300/50 hover:border-primary-400 transition-colors duration-100 ease-out border-l-[6px] hover:border-l-[6px] rounded-md w-full backdrop-blur-md'
        >
          <div className='flex flex-col w-full select-none'>
            <div className='flex items-start justify-between gap-x-3 w-full relative'>
              <p className='text-sm font-semibold leading-6 text-slate-300/80 whitespace-nowrap'>{entity.label}</p>
            </div>
            <div className='flex flex-wrap items-center gap-x-2 text-xs leading-5 text-slate-500'>
              <p className='truncate whitespace-normal leading-5 line-clamp-2 text-slate-500'>
                {entity.description}
              </p>
              <br />
              <p className='truncate flex items-center leading-5 text-slate-500 text-xs'>
                <svg viewBox='0 0 2 2' className='h-0.5 w-0.5 fill-current mr-1.5 ml-0'>
                  <circle cx={1} cy={1} r={1} />
                </svg>
                Created by {entity.author ? entity.author : 'OSINTBuddy'}
              </p>
            </div>
          </div>
        </div>
      </li>
    </>
  );
}

const ResponsiveGridLayout = WidthProvider(Responsive);

const MAX_GRAPH_LABEL_LENGTH = 22;

export default function EntityOptions({ positionMode, activeGraph, setElkLayout, toggleForceLayout, fitView }: JSONObject) {
  const { hid = "" } = useParams()
  const {
    data: entitiesData = { plugins: [], },
    isLoading,
    isSuccess,
    isError
  } = useRefreshEntityPluginsQuery()

  const [showEntities, setShowEntities] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');

  const entities = useMemo(() => searchFilter
    ? [...entitiesData?.plugins.filter((entity: JSONObject) => entity.label.toLowerCase().includes(searchFilter.toLowerCase()))]
    : [...entitiesData?.plugins], [searchFilter, entitiesData])

  const onDragStart = (event: DragEvent, nodeType: string) => {
    if (event?.dataTransfer) {
      event.dataTransfer.setData('application/reactflow', nodeType);
      event.dataTransfer.effectAllowed = 'move';
    }
    event.stopPropagation();
  };
  const [isEntitiesDraggable, setIsEntitiesDraggable] = useState(false);
  const [isPositionsDraggable, setIsPositionDraggable] = useState(false);

  const [entitiesLayout, setEntitiesLayout] = useState<Layout>({
    i: "entities",
    w: 7,
    h: 57,
    x: 0,
    y: 4,
    minW: 2,
    maxW: 44,
    minH: 2.4,
    maxH: 60,
    isDraggable: false,
    isBounded: true
  })

  const [positionsLayout, setPositionsLayout] = useState<Layout>({
    i: "positions",
    w: 44,
    h: 1.4,
    x: 0,
    y: 0,
    minW: 10,
    maxW: 44,
    minH: 1.4,
    maxH: 1.4,
    isDraggable: false,
    isBounded: true
  })

  const dispatch = useAppDispatch();
  const [isForceActive, setIsForceActive] = useState(false);
  const navigate = useNavigate()

  const [isGrayscale, setisGrayscale] = useState(false);

  return (
    <ResponsiveGridLayout
      allowOverlap={false}
      preventCollision={true}
      compactType={null}
      className='z-50 absolute'
      rowHeight={4}
      resizeHandles={['ne']}
      breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
      cols={{ lg: 40, md: 40, sm: 28, xs: 22, xxs: 18 }}
      isDraggable={true}
      isResizable={true}
      layouts={{
        lg: [
          { ...positionsLayout, isDraggable: isPositionsDraggable },
          { ...entitiesLayout, isDraggable: isEntitiesDraggable }
        ]
      }}
      onLayoutChange={(layout, layouts) => {
        setPositionsLayout({
          ...layouts.lg.find((layout) => layout.i === 'positions') as Layout,
          isDraggable: isPositionsDraggable,
          isBounded: true
        })
        setEntitiesLayout({
          ...layouts.lg.find((layout) => layout.i === 'entities') as Layout,
          isDraggable: isEntitiesDraggable,
          isBounded: true
        })
      }}
    >
      <div key='positions' className="flex flex-col w-full">
        <section className="flex shadow-md relative rounded-lg border  backdrop-blur-md border-mirage-800/40 from-mirage-800/40 to-mirage-800/50 bg-gradient-to-r h-min rounded-b-sm justify-between">
          <div className='flex items-center'>
            <button className='justify-center grow rounded-sm from-mirage-400/30 to-mirage-400/40 bg-gradient-to-br hover:from-mirage-500/20 hover:from-40% hover:to-mirage-500/30  border-mirage-300/20 relative py-2 inline-flex items-center  border transition-colors duration-100 ease-in-out hover:border-primary-400/50 outline-hidden px-2 text-slate-500 hover:text-primary-300/80 focus:bg-mirage-800  focus:z-10' onClick={() => navigate('/dashboard', { replace: true })}>
              <Icon icon='home' className='h-6' />
            </button>
            <h5
              title={activeGraph?.description ?? ''}
              className='w-72 pl-3 whitespace-nowrap truncate justify-between text-slate-600 text-inherit font-sans font-bold'>
              <span className="text-slate-400">
                {activeGraph?.label}
              </span>
            </h5>
            <ul className='isolate inline-flex shadow-sm'>
              <div className='flex items-center'>
                <button className='justify-center grow rounded-sm from-mirage-400/30 to-mirage-400/40 bg-gradient-to-br hover:from-mirage-500/20 hover:from-40% hover:to-mirage-500/30  border-mirage-300/20 relative py-2 inline-flex items-center  border transition-colors duration-100 ease-in-out hover:border-primary-400/50 outline-hidden px-2 text-slate-500 hover:text-primary-300/80 focus:bg-mirage-800  focus:z-10' onClick={() => fitView({ duration: 300 })}>
                  <Icon icon='viewfinder' className='h-6' />
                </button>

              </div>
            </ul>
          </div>

          <ul className='isolate inline-flex shadow-sm '>
            <button
              onClick={() => {
                setIsForceActive(false)
                toggleForceLayout && toggleForceLayout(false)
                dispatch(setPositionMode('manual'))
                dispatch(setEditState({ editId: "", editLabel: "layoutChangeM" }))

              }}
              type='button'
              className={classNames(
                'justify-center grow rounded-sm border  from-mirage-300/10 to-mirage-300/20 bg-gradient-to-br hover:from-mirage-500/20 hover:from-40% hover:to-mirage-300/30  border-mirage-300/60 relative 2 inline-flex items-center transition-colors duration-100 ease-in-out hover:border-primary-400/50 outline-hidden px-2 text-slate-500 hover:text-primary-300/80 focus:bg-mirage-800 hover:bg-mirage-600 focus:z-10',
                positionMode === 'manual' && 'bg-mirage-800/80 hover:bg-mirage-800 border-primary-400/50 hover:border-primary-400/50 '
              )}
            >
              <Icon icon='hand-three-fingers'
                className={classNames('h-6 w-6 ', positionMode === 'manual' && 'text-primary-300')}
                aria-hidden='true'
              />
            </button>
            <button
              onClick={() => {
                dispatch(setPositionMode('force'))
                toggleForceLayout && toggleForceLayout(!isForceActive)
                setIsForceActive(!isForceActive)
              }}
              type='button'
              className={classNames(
                'justify-center rounded-sm grow from-mirage-300/10 to-mirage-300/20 bg-gradient-to-br hover:from-mirage-500/20 hover:from-40% hover:to-mirage-300/30  border-mirage-300/20 relative py-2 inline-flex items-center  border transition-colors duration-100 ease-in-out hover:border-primary-400/50 outline-hidden px-2 text-slate-500 hover:text-primary-300/80 focus:bg-mirage-800 hover:bg-mirage-600 focus:z-10',
                positionMode === 'force' && 'bg-mirage-800/80 hover:bg-mirage-800 border-primary-400/50 hover:border-primary-400/50 '
              )}
            >
              <Icon
                icon={isForceActive !== undefined && isForceActive ? "cube-3d-sphere" : "cube-3d-sphere-off"}
                className={classNames('h-6 w-6 text-inherit', positionMode === 'force' && 'text-primary-300')}
              />
            </button>
            <button
              onClick={() => {
                toggleForceLayout && toggleForceLayout(false)
                // setElkLayout({ 'elk.algorithm': 'org.eclipse.elk.radial', })
                // setElkLayout({ 'elk.algorithm': 'layered', 'elk.direction': 'DOWN' })
                // setElkLayout({ 'elk.algorithm': 'layered', 'elk.direction': 'RIGHT' })
                setIsForceActive(false)
                dispatch(setPositionMode('right tree'))
                setElkLayout({
                  'elk.algorithm': 'layered',
                  'elk.direction': 'RIGHT'
                })
                dispatch(setEditState({ editId: "", editLabel: "layoutChangeRT" }))
              }}
              type='button'
              className={classNames(
                'justify-center rounded-sm grow from-mirage-300/10 to-mirage-300/20 bg-gradient-to-br hover:from-mirage-500/20 hover:from-40% hover:to-mirage-300/30  border-mirage-300/20 relative py-2 inline-flex items-center  border transition-colors duration-100 ease-in-out hover:border-primary-400/50 outline-hidden px-2 text-slate-500 hover:text-primary-300/80 focus:bg-mirage-800 hover:bg-mirage-600 focus:z-10',
                positionMode === 'right tree' && 'bg-mirage-800/80 hover:bg-mirage-800 border-primary-400/50 hover:border-primary-400/50 '
              )}
            >
              <Icon
                icon="binary-tree-2"
                className={classNames('h-6 w-6 -rotate-90 origin-center text-inherit', positionMode === 'right tree' && 'text-primary-300')}
              />
            </button>
            <button
              onClick={() => {
                setIsForceActive(false)
                toggleForceLayout && toggleForceLayout(false)
                dispatch(setPositionMode('tree'))
                setElkLayout({
                  'elk.algorithm': 'layered',
                  'elk.direction': 'DOWN'
                })
                dispatch(setEditState({ editId: "", editLabel: "layoutChangeDT" }))
              }}
              type='button'
              className={classNames(
                'justify-center rounded-sm grow from-mirage-300/10 to-mirage-300/20 bg-gradient-to-br hover:from-mirage-500/20 hover:from-40% hover:to-mirage-300/30  border-mirage-300/20 relative py-2 inline-flex items-center  border transition-colors duration-100 ease-in-out hover:border-primary-400/50 outline-hidden px-2 text-slate-500 hover:text-primary-300/80 focus:bg-mirage-800 hover:bg-mirage-600 focus:z-10',
                positionMode === 'tree' && 'bg-mirage-800/80 hover:bg-mirage-800 border-primary-400/50 hover:border-primary-400/50 '
              )}
            >
              <Icon
                icon="binary-tree"
                className={classNames('h-6 w-6 text-inherit', positionMode === 'tree' && 'text-primary-300')}
              />
            </button>
          </ul>
        </section>
      </div>

      <div
        className=' overflow-hidden rounded-md z-10 border border-mirage-800/40  from-mirage-800/30 to-mirage-800/60 bg-gradient-to-br flex flex-col h-min'
        key='entities'
        id='node-options-tour'
      >
        <ol className='text-sm flex select-none relative px-4 pt-2'>
          <li className='flex mr-auto'>
            <h5
              className='flex whitespace-nowrap truncate justify-between items-center w-full  text-inherit font-display '>
              <Link title='View all graphs' className='text-slate-500' to='/dashboard/entity' replace>
                Entities
              </Link>
            </h5>
          </li>
          <li className='flex'>
            <div className='flex justify-between items-center w-full '>
              <button
                onClick={() => setIsEntitiesDraggable(!isEntitiesDraggable)}
                className='text-slate-600 hover:text-alert-700 text-inherit whitespace-nowrap font-display'
                title={activeGraph.name}
                aria-current={activeGraph.description}
              >
                {isEntitiesDraggable ? <LockOpenIcon className='w-5 h-5 text-inherit' /> : <LockClosedIcon className='w-5 h-5 text-inherit' />}
              </button>
            </div>
          </li>
        </ol>
        {showEntities && (
          <>
            <div className='mt-2.5 hover:border-mirage-200/40 transition-colors duration-200 ease-in-out block justify-between items-center to-mirage-400/70 from-mirage-300/60 bg-gradient-to-br rounded border mb-2 mx-4 focus-within:!border-primary/40  px-3.5 py-1 text-slate-100 shadow-sm border-mirage-400/20 ring-light-900/10 focus-within:from-mirage-400/20 focus-within:to-mirage-400/30 focus-within:bg-gradient-to-l'>
              <input
                onChange={(e) => setSearchFilter(e.target.value)}
                className='block backdrop-blur-md w-full placeholder:text-slate-700 bg-transparent outline-hidden  sm:text-sm'
                placeholder='Search entities...'
              />
            </div>
            <ul className='overflow-y-scroll ml-4 pr-4 h-full relative'>
              {entities.map((entity) => (
                <EntityOption onDragStart={onDragStart} key={entity.label} entity={entity} />
              ))}
            </ul>
          </>
        )}
      </div>
    </ResponsiveGridLayout>
  );
}
