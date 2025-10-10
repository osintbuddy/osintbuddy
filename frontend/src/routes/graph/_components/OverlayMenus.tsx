import { useEffect, useMemo, useState } from 'preact/hooks'
import { Link, useNavigate } from 'react-router-dom'
import { Responsive, WidthProvider, Layout, Layouts } from 'react-grid-layout'
import { Icon } from '@/components/icons'
import {
  PositionMode,
  useAttachmentsStore,
  useAuthStore,
  useEntitiesStore,
  useFlowStore,
  usePdfViewerStore,
  useAudioViewerStore,
  usePropertiesStore,
} from '@/app/store'
import { AttachmentItem, Graph, entitiesApi } from '@/app/api'
import { BASE_URL } from '@/app/baseApi'
import { ReadyState } from 'react-use-websocket'
import { toast } from 'react-toastify'
import { useParams } from 'react-router-dom'
import PdfViewerPanel from './PdfViewerPanel'
import AudioViewerPanel from './AudioViewerPanel'
import PropertiesViewer from './PropertiesViewer'
import { SendJsonMessage } from 'react-use-websocket/dist/lib/types'

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
            <div className='flex flex-col text-xs leading-5 text-slate-500'>
              <p className='line-clamp-2 gap-x-2 truncate leading-5 whitespace-normal text-slate-400'>
                {entity.description}
              </p>
              <br />
              <p className='flex items-center truncate text-xs leading-5 text-slate-500'>
                Created by {entity.author ? entity.author : 'unknown'}
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
  fitView: Function
  clearGraph: Function
  readyState: ReadyState
  setShowEdges: (value: boolean) => void
  showEdges: boolean
  sendJsonMessage: SendJsonMessage
}

const ResponsiveGridLayout = WidthProvider(Responsive)

export default function OverlayMenus({
  positionMode,
  setElkLayout,
  graph,
  fitView,
  clearGraph,
  readyState,
  setShowEdges,
  showEdges,
  sendJsonMessage,
}: OverlayMenusProps) {
  const { setPositionMode } = useFlowStore()
  const [isForceActive, setIsForceActive] = useState(false)
  const navigate = useNavigate()
  const { hid } = useParams()
  const attachments = useAttachmentsStore()
  const pdfViewer = usePdfViewerStore()
  const audioViewer = useAudioViewerStore()
  const properties = usePropertiesStore()
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

  // entities panel
  const [isEntitiesDraggable, setIsEntitiesDraggable] = useState(false)
  const [entitiesLayout, setEntitiesLayout] = useState({
    i: 'entities',
    w: 2,
    h: 57,
    x: 34,
    y: 4,
    minW: 2,
    maxW: 44,
    minH: 3,
    maxH: 60,
    isDraggable: isEntitiesDraggable,
    isBounded: true,
  })

  // appbar panel
  const [isAppbarDraggable, setIsAppbarDraggable] = useState(false)
  const [appbarLayout, setAppbarLayout] = useState({
    i: 'appbar',
    w: 44,
    h: 4,
    x: 0,
    y: 0,
    minW: 3,
    maxW: 44,
    minH: 4,
    maxH: 4,
    isDraggable: isAppbarDraggable,
    isBounded: true,
  })

  // pdf preview panel
  const [isPdfDraggable, setIsPdfDraggable] = useState(false)
  const [pdfLayout, setPdfLayout] = useState({
    i: 'pdfviewer',
    w: 3.5,
    h: 56,
    x: 0,
    y: 4,
    minW: 12,
    maxW: 24,
    minH: 12,
    maxH: 84,
  })
  useEffect(() => {
    if (pdfViewer.open)
      setPdfLayout({
        i: 'pdfviewer',
        w: 3.5,
        h: 60,
        x: 0,
        y: 4,
        minW: 1,
        maxW: 50,
        minH: 4,
        maxH: 64,
      })
    else
      setPdfLayout({
        i: 'pdfviewer',
        w: 3.5,
        h: 0,
        x: 0,
        y: 80,
        minW: 3.5,
        maxW: 0,
        minH: 0,
        maxH: 0,
      })
  }, [pdfViewer.open])

  // audio preview panel
  const [isAudioDraggable, setIsAudioDraggable] = useState(false)
  const [audioLayout, setAudioLayout] = useState({
    i: 'audioviewer',
    w: 14,
    h: 18,
    x: 0,
    y: 4,
    minW: 12,
    maxW: 24,
    minH: 10,
    maxH: 40,
  })
  useEffect(() => {
    if (audioViewer.open)
      setAudioLayout({
        i: 'audioviewer',
        w: 4,
        h: 18,
        x: 0,
        y: 4,
        minW: 2,
        maxW: 100,
        minH: 4,
        maxH: 100,
      })
    else
      setAudioLayout({
        i: 'audioviewer',
        w: 2,
        h: 4,
        x: 0,
        y: 80,
        minW: 0,
        maxW: 0,
        minH: 0,
        maxH: 0,
      })
  }, [audioViewer.open])

  // Attachments panel
  const [isAttachmentsDraggable, setIsAttachmentsDraggable] = useState(false)
  const [attachmentsLayout, setAttachmentsLayout] = useState({
    i: 'attachments',
    w: 0,
    h: 0,
    x: 900,
    y: 500,
    minW: 0,
    maxW: 20,
    minH: 0,
    maxH: 200,
  })
  useEffect(() => {
    if (attachments.open)
      setAttachmentsLayout({
        i: 'attachments',
        w: 2,
        h: 26,
        x: 0,
        y: 4,
        minW: 2,
        maxW: 64,
        minH: 2,
        maxH: 72,
      })
    else
      setAttachmentsLayout({
        i: 'attachments',
        w: 2,
        h: 0,
        x: 0,
        y: 80,
        minW: 0,
        maxW: 0,
        minH: 0,
        maxH: 0,
      })
  }, [attachments.open])

  const [itemsCache, setItemsCache] = useState<
    Record<string, AttachmentItem[]>
  >({})
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    const load = async () => {
      if (!attachments.open || !attachments.active) return
      const entityId = attachments.active
      // Only fetch if not cached
      if (itemsCache[entityId]) return
      try {
        setLoading(true)
        const token = useAuthStore.getState().access_token as string
        const data = await entitiesApi.listAttachments(
          String(hid),
          entityId,
          token
        )
        setItemsCache((prev) => ({ ...prev, [entityId]: data }))
      } catch (_) {
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [attachments.open, attachments.active, hid])

  // Properties panel
  const [isPropertiesDraggable, setIsPropertiesDraggable] = useState(false)
  const [propertiesLayout, setPropertiesLayout] = useState({
    i: 'properties',
    w: 0,
    h: 0,
    x: 900,
    y: 500,
    minW: 0,
    maxW: 44,
    minH: 0,
    maxH: 60,
  })
  useEffect(() => {
    if (properties.open)
      setPropertiesLayout({
        i: 'properties',
        w: 4,
        h: 16,
        x: 0,
        y: 56,
        minW: 1,
        maxW: 60,
        minH: 3,
        maxH: 60,
      })
    else
      setPropertiesLayout({
        i: 'properties',
        w: 0,
        h: 0,
        x: 900,
        y: 500,
        minW: 0,
        maxW: 44,
        minH: 0,
        maxH: 60,
      })
  }, [properties.open])

  return (
    <ResponsiveGridLayout
      allowOverlap={true}
      preventCollision={false}
      compactType={null}
      className='!pointer-events-none absolute inset-0 z-10'
      style={{ width: '100vw', height: '100vh', display: 'absolute' }}
      rowHeight={4}
      resizeHandles={['se']}
      onLayoutChange={(currentLayout: any, _) => {
        setEntitiesLayout(currentLayout.find((l: Layout) => l.i === 'entities'))
        setAppbarLayout(currentLayout.find((l: Layout) => l.i === 'appbar'))
        setAttachmentsLayout(
          currentLayout.find((l: Layout) => l.i === 'attachments')
        )
        setPropertiesLayout(
          currentLayout.find((l: Layout) => l.i === 'properties')
        )
        setPdfLayout(currentLayout.find((l: Layout) => l.i === 'pdfviewer'))
        setAudioLayout(currentLayout.find((l: Layout) => l.i === 'audioviewer'))
      }}
      isResizable={true}
    >
      <div
        key='appbar'
        data-grid={{ ...appbarLayout, isDraggable: isAppbarDraggable }}
        className='pointer-events-auto flex w-full flex-col rounded-md border-black/10 bg-gradient-to-tr from-black/40 to-black/50 py-px shadow-2xl shadow-black/25 backdrop-blur-md'
      >
        <div className='flex w-full items-center justify-center'>
          <button
            className='hover:to-mirage-500/30 hover:border-primary-400/50 hover:text-primary-300/80 focus:bg-mirage-800 from-mirage-950/20 to-mirage-600/10 hover:shadow-primary-950/50 shadow-cod-800/20 iflex relative z-0 shrink -translate-x-px items-center justify-center overflow-hidden rounded-md border border-slate-950 bg-transparent bg-gradient-to-br from-10% p-2 text-sm text-slate-500 shadow-2xs outline-hidden hover:bg-gradient-to-tl hover:from-black/20 hover:from-40% hover:shadow focus:outline-hidden'
            onClick={() => {
              clearGraph()
              navigate(`/dashboard/case/${graph?.id}`, { replace: true })
            }}
          >
            <Icon icon='home' className='h-6 w-6' />
          </button>

          <button
            onClick={() => setIsAppbarDraggable(!isAppbarDraggable)}
            className='hover:text-alert-700 font-display whitespace-nowrap text-slate-800'
          >
            {isAppbarDraggable ? (
              <Icon icon='lock-open' className='h-5 w-5 text-inherit' />
            ) : (
              <Icon icon='lock' className='h-5 w-5 text-inherit' />
            )}
          </button>
          <div
            title={graph?.description ?? ''}
            className='relative w-96 justify-between truncate overflow-hidden pl-3 font-sans font-bold overflow-ellipsis whitespace-nowrap'
          >
            <h4 className='relative max-w-72 overflow-hidden overflow-ellipsis text-slate-400'>
              {graph?.label}
            </h4>
            <button
              title={
                readyState === ReadyState.OPEN
                  ? 'You have an active graph connection!'
                  : 'Refresh the active case'
              }
              disabled={readyState === ReadyState.OPEN}
              onClick={() => window.location.reload()}
              className={`absolute top-0.5 right-1.5 rounded-sm px-2 py-0.5 pr-5 text-xs lowercase ${
                readyState === ReadyState.OPEN
                  ? 'bg-success-700/20 text-green-400/80'
                  : readyState === ReadyState.CONNECTING
                    ? 'animate-pulse bg-yellow-500/20 text-yellow-400/80'
                    : 'bg-danger-500/20 text-red-500/80'
              }`}
            >
              <span
                className={`absolute top-1 right-1 z-20 h-3 w-3 rounded-full text-slate-400 ${
                  readyState === ReadyState.OPEN
                    ? 'bg-green-400'
                    : readyState === ReadyState.CONNECTING
                      ? 'animate-pulse bg-yellow-500'
                      : 'bg-danger-500'
                }`}
              />
              {readyState === ReadyState.OPEN
                ? 'Online'
                : readyState === ReadyState.CONNECTING
                  ? 'Loading'
                  : 'Offline'}
            </button>
          </div>
          {/* TODO: Fix all these shitty styles, maybe abstract into a css file too, sheesh, this is a mess */}
          <div className='mr-auto flex items-center'>
            <button
              title='Fit the graph view'
              className='hover:border-primary-400/50 hover:text-primary-300/80 from-mirage-950/20 to-mirage-900/10 hover:shadow-primary-950/50 shadow-cod-800/20 relative z-0 flex shrink -translate-x-px items-center justify-center overflow-hidden rounded-md border border-slate-950 bg-transparent bg-gradient-to-br from-10% p-2 text-sm text-slate-500 shadow-2xs outline-hidden hover:bg-gradient-to-tl hover:from-black/20 hover:from-40% hover:to-black/20 hover:shadow focus:bg-black/70 focus:outline-hidden'
              onClick={() => fitView({ duration: 200 })}
            >
              <Icon icon='viewfinder' className='h-6 w-6' />
            </button>
            <button
              className='hover:border-primary-400/50 hover:text-primary-300/80 from-mirage-950/20 to-mirage-900/10 hover:shadow-primary-950/50 shadow-cod-800/20 relative z-0 flex shrink -translate-x-px items-center justify-center overflow-hidden rounded-md border border-slate-950 bg-transparent bg-gradient-to-br from-10% p-2 text-sm text-slate-500 shadow-2xs outline-hidden hover:bg-gradient-to-tl hover:from-black/20 hover:from-40% hover:to-black/20 hover:shadow focus:bg-black/70 focus:outline-hidden'
              onClick={() => setShowEdges(!showEdges)}
            >
              <Icon icon='ruler-2-off' className='h-6 w-6' />
            </button>
          </div>
          <button
            onClick={() => {
              setIsForceActive(false)

              // toggleForceLayout && toggleForceLayout(false)
              setPositionMode('manual')
            }}
            title='Set entities to your manual layout'
            type='button'
            className={`hover:to-mirage-900/30 hover:border-primary-400/50 hover:text-primary-300/80 from-mirage-950/20 to-mirage-600/10 hover:shadow-primary-950/50 shadow-cod-800/20 relative z-0 flex shrink -translate-x-px items-center justify-center overflow-hidden rounded-md border border-slate-950 bg-transparent bg-gradient-to-br from-10% p-2 text-sm text-slate-500 shadow-2xs outline-hidden hover:bg-gradient-to-tl hover:from-black/20 hover:from-40% hover:shadow focus:bg-slate-900/30 focus:outline-hidden ${
              positionMode === 'manual'
                ? 'bg-mirage-800/80 hover:bg-mirage-950 border-primary-400/50 hover:border-primary-400/50'
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
            title='Toggle entities to a force layout'
            onClick={() => {
              setPositionMode('force')
              toast.warn(
                'Force layout mode is currently disabled until we find a more performant solution. Sorry!'
              )
              setIsForceActive(!isForceActive)
            }}
            type='button'
            className={`hover:to-mirage-500/30 hover:border-primary-400/50 hover:text-primary-300/80 focus:bg-mirage-800 from-mirage-950/20 to-mirage-600/10 hover:shadow-primary-950/50 shadow-cod-800/20 relative z-0 flex shrink -translate-x-px items-center justify-center overflow-hidden rounded-md border border-slate-950 bg-transparent bg-gradient-to-br from-10% p-2 text-sm text-slate-500 shadow-2xs outline-hidden hover:bg-gradient-to-tl hover:from-black/20 hover:from-40% hover:shadow focus:outline-hidden ${
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
            title='Set entities to an elk right tree layout'
            onClick={() => {
              // toggleForceLayout && toggleForceLayout(false)
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
            className={`hover:to-mirage-500/30 hover:border-primary-400/50 hover:text-primary-300/80 focus:bg-mirage-800 from-mirage-950/20 to-mirage-600/10 hover:shadow-primary-950/50 shadow-cod-800/20 relative z-0 flex shrink -translate-x-px items-center justify-center overflow-hidden rounded-md border border-slate-950 bg-transparent bg-gradient-to-br from-10% p-2 text-sm text-slate-500 shadow-2xs outline-hidden hover:bg-gradient-to-tl hover:from-black/20 hover:from-40% hover:shadow focus:outline-hidden ${
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
            title='Set entities to an elk down tree layout'
            onClick={() => {
              setIsForceActive(false)
              // toggleForceLayout && toggleForceLayout(false)
              setPositionMode('elk')
              setElkLayout({
                'elk.algorithm': 'layered',
                'elk.direction': 'DOWN',
              })
            }}
            type='button'
            className={`hover:to-mirage-500/30 hover:border-primary-400/50 hover:text-primary-300/80 focus:bg-mirage-800 from-mirage-950/20 to-mirage-600/10 hover:shadow-primary-950/50 shadow-cod-800/20 relative z-0 flex shrink -translate-x-px items-center justify-center overflow-hidden rounded-md border border-slate-950 bg-transparent bg-gradient-to-br from-10% p-2 text-sm text-slate-500 shadow-2xs outline-hidden hover:bg-gradient-to-tl hover:from-black/20 hover:from-40% hover:shadow focus:outline-hidden ${
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
      </div>

      <div
        className='pointer-events-auto z-10 flex h-min w-full flex-col overflow-hidden rounded-md border border-black/10 bg-gradient-to-br from-black/40 to-black/30 py-px shadow-2xl shadow-black/25 backdrop-blur-md'
        key='entities'
        data-grid={{ ...entitiesLayout, isDraggable: isEntitiesDraggable }}
        id='node-options-tour'
      >
        <ol className='relative flex px-4 pt-2 text-sm select-none'>
          <li className='mr-auto flex'>
            <h5 className='font-display flex w-full grow items-center justify-between truncate whitespace-nowrap text-inherit'>
              <Link
                className='font-display flex w-full items-center justify-between font-medium text-slate-500'
                to='/dashboard/entities'
                replace
              >
                <Icon icon='ghost-3 ' />
                <span className='ml-1'>Entities</span>
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

      <div
        className='pointer-events-auto z-10 flex h-min w-full flex-col rounded-md border border-black/10 bg-gradient-to-br from-black/40 to-black/30 py-px shadow-2xl shadow-black/25 backdrop-blur-md'
        key='attachments'
        data-grid={{
          ...attachmentsLayout,
          isDraggable: isAttachmentsDraggable,
        }}
        id='attachments-panel'
      >
        <ol className='relative flex px-4 pt-2 text-sm select-none'>
          <li className='mr-auto flex'>
            <h5 className='font-display flex w-full grow items-center justify-between truncate whitespace-nowrap text-inherit'>
              <span className='font-display flex w-full items-center justify-between font-medium text-slate-500'>
                <Icon icon='folder' />
                <span className='ml-1'>Attachments</span>
              </span>
            </h5>
          </li>
          <li className='flex'>
            <div className='flex w-full items-center justify-between'>
              <button
                onClick={() =>
                  setIsAttachmentsDraggable(!isAttachmentsDraggable)
                }
                className='hover:text-alert-700 font-display whitespace-nowrap text-slate-800'
              >
                {isAttachmentsDraggable ? (
                  <Icon icon='lock-open' className='h-5 w-5 text-inherit' />
                ) : (
                  <Icon icon='lock' className='h-5 w-5 text-inherit' />
                )}
              </button>
            </div>
            <div className='flex w-full items-center justify-between'>
              <button
                onClick={() => attachments.closePanel()}
                className='hover:text-alert-700 font-display whitespace-nowrap text-slate-800'
                title='Close attachments'
              >
                <Icon icon='x' className='h-5 w-5 text-inherit' />
              </button>
            </div>
          </li>
        </ol>
        <div
          className='mx-2 flex flex-nowrap gap-1 overflow-x-hidden border-b border-slate-800/60 pb-1'
          onWheel={(e) => {
            const el = e.currentTarget as HTMLDivElement
            if (e.deltaY !== 0) {
              el.scrollLeft += e.deltaY
              e.preventDefault()
            }
          }}
        >
          {attachments.tabs.map((t) => (
            <div
              key={t.entityId}
              className={`flex items-center gap-2 rounded-t border border-slate-800/60 px-2 py-1 text-xs ${
                attachments.active === t.entityId
                  ? 'bg-slate-900/60 text-slate-200'
                  : 'bg-slate-925/40 text-slate-400'
              }`}
            >
              <button
                className='w-full text-left whitespace-nowrap'
                onClick={() => attachments.setActive(t.entityId)}
              >
                {t.title} - {t.entityId.toUpperCase().substring(0, 8)}
              </button>
              <button
                title='Close tab'
                onClick={() => attachments.removeTab(t.entityId)}
                className='text-slate-500 hover:text-slate-300'
              >
                <Icon icon='x' className='h-3 w-3' />
              </button>
            </div>
          ))}
        </div>
        <div className='max-h-64 overflow-y-auto px-3 pr-4'>
          {(!attachments.active || loading) && (
            <p className='p-2 text-sm text-slate-400'>
              {loading ? (
                <>
                  Loading selected attachments
                  <span class='dot-flashing !top-[3px] ml-2.5' />
                </>
              ) : (
                'Select an entity and click the tab to view your attachments.'
              )}
            </p>
          )}
          {attachments.active && !loading && (
            <ul className='space-y-1'>
              {(itemsCache[attachments.active] || []).map((a) => (
                <li
                  key={a.attachment_id}
                  className='bg-slate-925/60 flex items-center justify-between rounded border border-slate-800/70 px-2 py-1 text-xs text-slate-300'
                >
                  <div className='flex min-w-0 items-center gap-2'>
                    <Icon icon='file' className='h-3.5 w-3.5 text-slate-400' />
                    <div className='min-w-0'>
                      <div className='truncate'>{a.filename}</div>
                      <div className='text-[10px] text-slate-500'>
                        {a.media_type} • {(a.size / 1024).toFixed(1)} KB
                      </div>
                    </div>
                  </div>
                  <div className='ml-2 flex shrink-0 items-center gap-2'>
                    <div className='text-[10px] text-slate-500'>
                      {new Date(a.created_at).toLocaleString()}
                    </div>
                    <button
                      title='Download'
                      className='rounded border border-slate-800 px-1 py-0.5 text-slate-400 hover:text-slate-200'
                      onClick={async () => {
                        try {
                          const resp = await fetch(
                            `${BASE_URL}/entities/attachments/${a.attachment_id}`,
                            {
                              headers: {
                                Authorization: `Bearer ${useAuthStore.getState().access_token}`,
                              },
                            }
                          )
                          if (!resp.ok) throw new Error('Failed to download')
                          const blob = await resp.blob()
                          const url = URL.createObjectURL(blob)
                          const link = document.createElement('a')
                          link.href = url
                          link.download = a.filename
                          document.body.appendChild(link)
                          link.click()
                          link.remove()
                          setTimeout(() => URL.revokeObjectURL(url), 60_000)
                        } catch (_) {
                          // toast errors handled elsewhere if desired
                        }
                      }}
                    >
                      <Icon icon='download' className='h-3.5 w-3.5' />
                    </button>
                    <button
                      title='Delete'
                      className='rounded border border-slate-800 px-1 py-0.5 text-red-400 hover:text-red-200'
                      onClick={async () => {
                        try {
                          const resp = await fetch(
                            `${BASE_URL}/entities/attachments/${a.attachment_id}`,
                            {
                              method: 'DELETE',
                              headers: {
                                Authorization: `Bearer ${useAuthStore.getState().access_token}`,
                              },
                            }
                          )
                          if (!resp.ok) throw new Error('Failed to delete')
                          // Update cache locally
                          setItemsCache((prev) => ({
                            ...prev,
                            [attachments.active as string]: (
                              prev[attachments.active as string] || []
                            ).filter(
                              (x) => x.attachment_id !== a.attachment_id
                            ),
                          }))
                        } catch (_) {
                          // Optional: toast.error('Failed to delete attachment')
                        }
                      }}
                    >
                      <Icon icon='trash' className='h-3.5 w-3.5' />
                    </button>
                  </div>
                </li>
              ))}
              {attachments.active &&
                (itemsCache[attachments.active] || []).length === 0 && (
                  <div className='p-2 text-xs text-slate-500'>
                    No attachments found.
                  </div>
                )}
            </ul>
          )}
        </div>
      </div>

      <div
        className='pointer-events-auto z-10 flex h-min w-full flex-col rounded-md border border-black/10 bg-gradient-to-br from-black/40 to-black/30 py-px shadow-2xl shadow-black/25 backdrop-blur-md'
        key='properties'
        data-grid={{
          ...propertiesLayout,
          isDraggable: isPropertiesDraggable,
        }}
        id='properties-panel'
      >
        <ol className='relative flex px-2 pt-2 text-sm select-none'>
          <li className='mr-auto flex'>
            <h5 className='font-display flex w-full grow items-center justify-between truncate whitespace-nowrap text-inherit'>
              <span className='font-display flex w-full items-center justify-between font-medium text-slate-500'>
                <Icon icon='file-code' />
                <span className='ml-1'>Properties</span>
              </span>
            </h5>
          </li>
          <li className='flex'>
            <div className='flex w-full items-center justify-between'>
              <button
                onClick={() => setIsPropertiesDraggable(!isPropertiesDraggable)}
                className='hover:text-alert-700 font-display whitespace-nowrap text-slate-800'
              >
                {isPropertiesDraggable ? (
                  <Icon icon='lock-open' className='h-5 w-5 text-inherit' />
                ) : (
                  <Icon icon='lock' className='h-5 w-5 text-inherit' />
                )}
              </button>
            </div>
            <div className='flex w-full items-center justify-between'>
              <button
                onClick={() => properties.closePanel()}
                className='hover:text-alert-700 font-display whitespace-nowrap text-slate-800'
                title='Close properties'
              >
                <Icon icon='x' className='h-5 w-5 text-inherit' />
              </button>
            </div>
          </li>
        </ol>
        <div className='px-3 pb-3 text-sm text-slate-200 overflow-y-scroll'>
          <div
            className='flex flex-nowrap gap-1 overflow-x-hidden border-b border-slate-800/60'
            onWheel={(e) => {
              const el = e.currentTarget as HTMLDivElement
              if (e.deltaY !== 0) {
                el.scrollLeft += e.deltaY
                e.preventDefault()
              }
            }}
          >
            {properties.tabs.map((t) => (
              <div
                key={t.entityId}
                className={`flex items-center gap-2 rounded-t border border-slate-800/60 px-2 py-1 text-xs ${
                  properties.active === t.entityId
                    ? 'bg-slate-900/60 text-slate-200'
                    : 'bg-slate-925/40 text-slate-400'
                }`}
              >
                <button
                  className='w-full text-left whitespace-nowrap'
                  onClick={() => properties.setActive(t.entityId)}
                >
                  {t.title} - {t.entityId.toUpperCase().substring(0, 8)}
                </button>
                <button
                  title='Close tab'
                  onClick={() => properties.closeTab(t.entityId)}
                  className='text-slate-500 hover:text-slate-300'
                >
                  <Icon icon='x' className='h-3 w-3' />
                </button>
              </div>
            ))}
          </div>
          {properties.active ? (
            <PropertiesViewer
              src={
                properties.tabs.find((t) => t.entityId === properties.active)
                  ?.data ?? {}
              }
              sendJsonMessage={sendJsonMessage}
            />
          ) : (
            <div className='p-2 text-xs text-slate-500'>
              Open a node’s properties to view/edit JSON.
            </div>
          )}
        </div>
      </div>

      <div
        key='pdfviewer'
        data-grid={{ ...pdfLayout, isDraggable: isPdfDraggable }}
        className='pointer-events-auto z-10 flex h-full w-full flex-col overflow-hidden rounded-md border border-black/10 bg-gradient-to-br from-black/40 to-black/30 py-px shadow-2xl shadow-black/25 backdrop-blur-md'
      >
        <PdfViewerPanel
          draggable={isPdfDraggable}
          onToggleDrag={() => setIsPdfDraggable((v) => !v)}
        />
      </div>
      <div
        data-grid={{ ...audioLayout, isDraggable: isAudioDraggable }}
        key='audioviewer'
        className='pointer-events-auto z-10 flex h-full w-full flex-col overflow-hidden rounded-md border border-black/10 bg-gradient-to-br from-black/40 to-black/30 py-px shadow-2xl shadow-black/25 backdrop-blur-md'
      >
        <AudioViewerPanel
          draggable={isAudioDraggable}
          onToggleDrag={() => setIsAudioDraggable((v) => !v)}
        />
      </div>
    </ResponsiveGridLayout>
  )
}
