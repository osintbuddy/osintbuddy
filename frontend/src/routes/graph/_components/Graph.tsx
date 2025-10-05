import { useCallback, useState, useMemo, useRef, useEffect } from 'preact/hooks'
import { DragEventHandler } from 'preact/compat'
import {
  Edge,
  Node,
  Background,
  BackgroundVariant,
  FitViewOptions,
  Connection,
  ReactFlowInstance,
  ReactFlow,
  OnNodeDrag,
  NodeMouseHandler,
  ConnectionMode,
  IsValidConnection,
  reconnectEdge,
  Panel,
  ReactFlowProps,
  OnReconnect,
  XYPosition,
  OnConnectEnd,
  OnConnect,
  addEdge,
  FinalConnectionState,
} from '@xyflow/react'
import { Excalidraw } from '@excalidraw/excalidraw'
import "@excalidraw/excalidraw/index.css";
import EditEntityNode from './EntityEditNode'
import { toast } from 'react-toastify'
import { ViewEntityNode } from './EntityViewNode'
import { useParams } from 'react-router-dom'
import NewConnectionLine from './ConnectionLine'
import FloatingEdge from './FloatingEdge'
import { useEntitiesStore, useFlowStore } from '@/app/store'
import ContextMenu from './ContextMenu'
import OverlayMenus from './OverlayMenus'
import { SendJsonMessage } from 'react-use-websocket/dist/lib/types'
import { ReadyState } from 'react-use-websocket'
import { Graph as GraphState } from '@/app/api'
import { ElkLayoutArguments } from 'elkjs/lib/elk-api'
import { toSnakeCase } from '../utils'
import { Icon } from '@/components/icons'

export interface CtxPosition {
  top: number
  left: number
  right: number
  bottom: number
}

export interface CtxMenu {
  entity?: Node | null
  position?: CtxPosition
}

interface Blueprint {
  [any: string]: {
    [any: string]: any
    value?: string
  }
}

interface ProjectGraphProps {
  graphInstance?: ReactFlowInstance
  setGraphInstance: (value: ReactFlowInstance) => void
  sendJsonMessage: SendJsonMessage
  setElkLayout: (args: ElkLayoutArguments) => void
  readyState: ReadyState
  graph: GraphState | null
  fitView: (fitViewOptions?: FitViewOptions | undefined) => void
  blueprints: { [any: string]: Blueprint }
}

const DBL_CLICK_THRESHOLD = 340

const MIN_ZOOM = 0.1
const MAX_ZOOM = 2.0
const viewOptions: FitViewOptions = {
  padding: 50,
}

export default function Graph({
  graphInstance,
  setGraphInstance,
  sendJsonMessage,
  readyState,
  graph,
  setElkLayout,
  fitView,
  blueprints,
}: ProjectGraphProps) {
  const {
    setEntityEdit,
    setEntityView,
    removeRelationship,
    setRelationships,
    onRelationshipConnect,
    handleRelationshipsChange,
    handleEntityChange,
    positionMode,
    clearGraph,
    nodes,
    edges,
  } = useFlowStore()

  const ref = useRef<HTMLDivElement>(null)
  const [ctxMenu, setCtxMenu] = useState<CtxMenu | null>(null)
  const [mode, setMode] = useState<'select' | 'draw'>('select')
  const drawRef = useRef<HTMLDivElement>(null)
  const [drawSize, setDrawSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 })
  const spaceDownRef = useRef(false)
  const panningRef = useRef(false)

  // Observe overlay container size and clamp canvas dimensions to viewport bounds
  useEffect(() => {
    if (mode !== 'draw') return
    const el = drawRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cr = entry.contentRect
        // Clamp to viewport to prevent exceeding canvas size limits on some browsers
        const maxW = Math.min(window.innerWidth, 1920)
        const maxH = Math.min(window.innerHeight, 1080)
        const w = Math.max(1, Math.min(Math.floor(cr.width), maxW))
        const h = Math.max(1, Math.min(Math.floor(cr.height), maxH))
        setDrawSize({ w, h })
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [mode])

  // Track space key state for Excalidraw pan gesture
  useEffect(() => {
    if (mode !== 'draw') return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') spaceDownRef.current = true
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') spaceDownRef.current = false
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [mode])

  const handleDrawPointerDownCapture = useCallback((e: PointerEvent) => {
    // Start syncing pan when Excalidraw pan gesture starts (Space + primary button)
    if (spaceDownRef.current && e.isPrimary && (e.buttons & 1) === 1) {
      panningRef.current = true
    }
  }, [])

  const handleDrawPointerMoveCapture = useCallback(
    (e: PointerEvent) => {
      if (!panningRef.current || !graphInstance) return
      const vp = graphInstance.getViewport?.()
      if (!vp) return
      // movementX/Y are deltas in screen pixels; adjust viewport translate accordingly
      const nx = vp.x + (e as any).movementX
      const ny = vp.y + (e as any).movementY
      graphInstance.setViewport?.({ x: nx, y: ny, zoom: vp.zoom })
    },
    [graphInstance]
  )

  const stopPanning = useCallback(() => {
    panningRef.current = false
  }, [])

  // @todo implement support for multi-select transforms -
  // hm, actually, how will the transforms work if different plugin types/nodes are in the selection?
  // just delete/save position on drag/etc?
  const onMultiSelectionCtxMenu = useCallback(
    (event: MouseEvent, _: Node[]) => event.preventDefault(),
    []
  )

  const onNodeContextMenu = useCallback(
    (event: MouseEvent, node: Node | null) => {
      event.preventDefault()
      // Calculate position of the context menu. We want to make sure it
      // doesn't get positioned off-screen.
      const pane = ref.current as HTMLDivElement
      const bounds = pane.getBoundingClientRect()
      setCtxMenu({
        entity: node,
        position: {
          top:
            ((event.clientY < bounds.height - 250) as unknown as number) &&
            event.clientY,
          left:
            ((event.clientX < bounds.width - 250) as unknown as number) &&
            event.clientX,
          right:
            ((event.clientX >= bounds.width - 250) as unknown as number) &&
            bounds.width - event.clientX,
          bottom:
            ((event.clientY >= bounds.height - 250) as unknown as number) &&
            bounds.height - event.clientY + 180,
        },
      })
    },
    []
  )

  const onPaneClick = useCallback(() => setCtxMenu({ entity: null }), [])

  const { hid } = useParams()

  const onDragOver: DragEventHandler<HTMLDivElement> = useCallback((event) => {
    event.preventDefault()
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
  }, [])

  const createGraphEntity = useCallback(
    async (data: any) => {
      sendJsonMessage({
        action: 'create:entity',
        entity: data,
      })
    },
    [sendJsonMessage]
  )

  const onDrop: DragEventHandler<HTMLDivElement> = useCallback(
    async (event) => {
      const label =
        event.dataTransfer &&
        event.dataTransfer.getData('application/reactflow')
      if (typeof label === 'undefined' || !label) return

      const position = graphInstance?.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      }) as XYPosition
      const createEntity = { label, x: position.x, y: position.y }
      createGraphEntity(createEntity).catch((error) => {
        console.error(error)
        toast.error(
          `We ran into a problem creating the ${label} entity. Please try again`
        )
      })
    },
    [graphInstance, createGraphEntity, hid]
  )

  const nodeTypes = useMemo(
    () => ({
      edit: (entity: JSONObject) => {
        const { label } = entity.data
        return (
          <EditEntityNode
            ctx={entity}
            blueprint={structuredClone(blueprints[toSnakeCase(label)])}
            sendJsonMessage={sendJsonMessage}
          />
        )
      },
      view: (entity: JSONObject) => {
        const { label } = entity.data
        return (
          <ViewEntityNode
            ctx={entity}
            blueprint={structuredClone(blueprints[toSnakeCase(label)])}
          />
        )
      },
    }),
    [blueprints]
  )
  const [showEdges, setShowEdges] = useState(false)
  const edgeTypes = useMemo(
    () => ({
      sfloat: (edge: Edge) => (
        <FloatingEdge
          {...edge}
          showEdges={showEdges}
          setShowEdges={setShowEdges}
          sendJsonMessage={sendJsonMessage}
        />
      ),
    }),
    [showEdges]
  )

  const [clickDelta, setClickDelta] = useState(0)

  const onNodeDragStop: OnNodeDrag = useCallback(
    (_, node) => {
      sendJsonMessage({
        action: 'update:entity',
        entity: {
          id: node.id,
          x: node.position.x,
          y: node.position.y,
        },
      })
    },
    [sendJsonMessage]
  )

  const onEdgesChange = useCallback(
    (changes: any) => {
      // Use the store handler if provided, otherwise fallback to WebSocket
      handleRelationshipsChange(changes)
    },
    [handleRelationshipsChange, showEdges]
  )

  // on double click toggle between entity types
  // (rectangular editable entity vs circlular view entity)
  const onNodeClick: NodeMouseHandler = useCallback(
    (_: TouchEvent | MouseEvent, node: Node) => {
      const newDelta = new Date().getTime()
      setClickDelta(newDelta)
      // if double click, toggle entity/node type
      if (newDelta - clickDelta < DBL_CLICK_THRESHOLD) {
        if (node.type === 'view') setEntityEdit(node.id)
        else setEntityView(node.id)
      }
    },
    [clickDelta, setEntityEdit, setEntityView]
  )

  const onConnect: OnConnect = useCallback((connection) => {
    onRelationshipConnect(connection)
    sendJsonMessage({
      action: 'create:edge',
      edge: {
        temp_id: `xy-edge__${connection.source}${connection.sourceHandle}-${connection.target}${connection.targetHandle}`,
        source: connection.source,
        target: connection.target,
        data: {},
      },
    })
  }, [])
  // used for handling edge deletions. e.g. when a user
  // selects and drags  an existing connection line/edge
  // to a blank spot on the graph, the edge will be removed
  const edgeReconnectSuccessful = useRef(true)
  const onReconnectStart: ReactFlowProps['onReconnectStart'] =
    useCallback(() => {
      edgeReconnectSuccessful.current = false
    }, [])
  const onReconnect: OnReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      edgeReconnectSuccessful.current = true
      setRelationships(
        reconnectEdge(oldEdge, newConnection, edges, { shouldReplaceId: false })
      )
      const { id, data = {} } = oldEdge
      const { source, target } = newConnection
      sendJsonMessage({
        action: 'update:edge',
        edge: { id, data, source, target },
      })
    },
    [setRelationships, reconnectEdge, edges, sendJsonMessage]
  )
  const onReconnectEnd: ReactFlowProps['onReconnectEnd'] = useCallback(
    (
      _: MouseEvent | TouchEvent,
      edge: Edge,
      connectionState: FinalConnectionState
    ) => {
      if (!edgeReconnectSuccessful.current) {
        removeRelationship(edge.id)
        sendJsonMessage({
          action: 'delete:edge',
          edge: { id: edge.id },
        })
      }
      edgeReconnectSuccessful.current = true
    },
    []
  )

  // depending on where the valid entity connection handle is positioned
  // the connecting edges handle  will be either red, green, or the primary color
  const isValidConnection: IsValidConnection = useCallback(
    (connection) => connection.target !== connection.source,
    []
  )

  const onPaneCtxMenu = useCallback(
    (event) => onNodeContextMenu(event, null),
    [onNodeContextMenu]
  )

  return (
    <div className='relative h-full w-full'>
      <ReactFlow
        ref={ref}
        zoomOnScroll={mode !== 'draw'}
        zoomOnPinch={mode !== 'draw'}
      zoomOnDoubleClick={false}
      minZoom={MIN_ZOOM}
      nodeDragThreshold={2}
      maxZoom={MAX_ZOOM}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      nodes={nodes}
      edges={edges}
      onDrop={onDrop}
      onConnect={onConnect}
      onEdgesChange={onEdgesChange}
      onDragOver={onDragOver}
      isValidConnection={isValidConnection}
      onReconnectStart={onReconnectStart}
      onReconnect={onReconnect}
      onReconnectEnd={onReconnectEnd}
      onInit={setGraphInstance}
      onNodesChange={handleEntityChange}
      onNodeClick={onNodeClick}
      fitViewOptions={viewOptions}
      panActivationKeyCode='Space'
      onMoveStart={() => setCtxMenu(null)}
      onNodeDragStop={onNodeDragStop}
      onPaneClick={onPaneClick}
      onPaneContextMenu={onPaneCtxMenu}
      onNodeContextMenu={onNodeContextMenu}
      onSelectionContextMenu={onMultiSelectionCtxMenu}
      connectionLineComponent={NewConnectionLine}
      elevateNodesOnSelect={true}
      connectionMode={ConnectionMode.Loose}
      proOptions={{ hideAttribution: true }} // TODO: If osib makes $$$, subscribe2reactflow :)
      defaultMarkerColor='#3b419eee'
      onlyRenderVisibleElements={false}
      nodesDraggable={mode !== 'draw'}
      nodesConnectable={mode !== 'draw'}
      elementsSelectable={mode !== 'draw'}
      selectionOnDrag={mode !== 'draw'}
      panOnDrag={mode !== 'draw'}
      >
        <Background color='#5b609bee' variant={BackgroundVariant.Dots} />
        <Panel position='top-left' style={{ margin: 0, pointerEvents: 'none' }}>
          <OverlayMenus
            readyState={readyState}
            positionMode={positionMode}
            graph={graph}
            setElkLayout={setElkLayout}
            fitView={fitView}
            clearGraph={clearGraph}
          />
        </Panel>
        {/* Mode toggle controls */}
        <Panel position='top-right' style={{ pointerEvents: 'auto' }}>
          <div className='flex gap-1 rounded-md border border-slate-900/50 bg-black/30 p-1 backdrop-blur-md'>
            <button
              className={`flex items-center gap-1 rounded px-2 py-1 text-xs ${
                mode === 'select'
                  ? 'bg-slate-800/70 text-slate-200'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
              onClick={() => setMode('select')}
              title='Selection mode'
            >
              <Icon icon='cursor' className='h-4 w-4' />
              Select
            </button>
            <button
              className={`flex items-center gap-1 rounded px-2 py-1 text-xs ${
                mode === 'draw'
                  ? 'bg-slate-800/70 text-slate-200'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
              onClick={() => setMode('draw')}
              title='Drawing mode'
            >
              <Icon icon='pencil' className='h-4 w-4' />
              Draw
            </button>
          </div>
        </Panel>
        <ContextMenu
          sendJsonMessage={sendJsonMessage}
          selection={ctxMenu?.entity}
          position={ctxMenu?.position as CtxPosition}
          closeMenu={() => setCtxMenu(null)}
        />
      </ReactFlow>
      {/* Excalidraw overlay for freehand drawings, rendered as sibling to avoid RF transforms */}
      {mode === 'draw' && (
        <div className='pointer-events-none absolute inset-0 z-20'>
          <div
            ref={drawRef}
            className='pointer-events-auto absolute inset-0'
            style={{
              // Ensure no transforms affect canvas size calculations
              transform: 'none',
              overflow: 'hidden',
              contain: 'layout size style',
            }}
            onPointerDownCapture={handleDrawPointerDownCapture as any}
            onPointerMoveCapture={handleDrawPointerMoveCapture as any}
            onPointerUpCapture={stopPanning as any}
            onPointerCancelCapture={stopPanning as any}
            onPointerLeaveCapture={stopPanning as any}
          >
            <Excalidraw
              gridModeEnabled={false}
              theme='dark'
              viewModeEnabled={false}
              width={drawSize.w || undefined}
              height={drawSize.h || undefined}
              initialData={{ appState: { viewBackgroundColor: 'transparent' } }}
              UIOptions={{ canvasActions: { toggleGrid: false } } as any}
              style={{ background: 'transparent' }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
