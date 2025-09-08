import { useCallback, useState, useMemo, useRef } from 'preact/hooks'
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
} from '@xyflow/react'
import EditEntityNode from './EntityEditNode'
import { toast } from 'react-toastify'
import { ViewEntityNode } from './EntityViewNode'
import { useParams } from 'react-router-dom'
import NewConnectionLine from './ConnectionLine'
import FloatingEdge from './FloatingEdge'
import { useEntitiesStore, useGraphFlowStore } from '@/app/store'
import ContextMenu from './ContextMenu'
import OverlayMenus from './OverlayMenus'
import { SendJsonMessage } from 'react-use-websocket/dist/lib/types'
import { ReadyState } from 'react-use-websocket'
import { Graph as GraphState } from '@/app/api'
import { ElkLayoutArguments } from 'elkjs/lib/elk-api'
import { toSnakeCase } from '../utils'

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
  blueprints: Blueprint
}

const DBL_CLICK_THRESHOLD = 340

const MIN_ZOOM = 0.1
const MAX_ZOOM = 2.0
const viewOptions: FitViewOptions = {
  padding: 50,
}

// Remove the React Flow auto prefix from an ID string.
export function stripXYEdge(id: string) {
  return id.replace('xy-edge__', '')
}

// Deep copy + sanitize: fixes all object fields named "id".
export function stripXYEdgeInIds(payload: any): any {
  if (Array.isArray(payload)) return payload.map(stripXYEdgeInIds)
  if (payload && typeof payload === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(payload)) {
      if (k === 'id' && typeof v === 'string') out[k] = stripXYEdge(v)
      else out[k] = stripXYEdgeInIds(v)
    }
    return out
  }
  return payload
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
    enableEntityEdit,
    disableEntityEdit,
    removeEdge,
    setEdges,
    onConnect,
    handleEdgesChange,
    handleNodesChange,
    positionMode,
    clearGraph,
    nodes,
    edges,
  } = useGraphFlowStore()

  const ref = useRef<HTMLDivElement>(null)
  const [ctxMenu, setCtxMenu] = useState<CtxMenu | null>(null)

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
            blueprint={blueprints[label]}
            sendJsonMessage={sendJsonMessage}
          />
        )
      },
      view: (entity: JSONObject) => {
        const { label } = entity.data
        return <ViewEntityNode ctx={entity} blueprint={blueprints[label]} />
      },
    }),
    [sendJsonMessage, Object.keys(blueprints).length !== 0]
  )
  const [showEdges, setShowEdges] = useState(false)
  const edgeTypes = useMemo(
    () => ({
      sfloat: (edge: Edge) => (
        <FloatingEdge
          {...edge}
          showEdges={showEdges}
          setShowEdges={setShowEdges}
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

  const onEdgeChange = useCallback(
    (changes: any) => {
      // Use the store handler if provided, otherwise fallback to WebSocket
      handleEdgesChange(changes)
      sendJsonMessage({
        action: 'create:edge',
        edge: stripXYEdgeInIds(changes),
      })
    },
    [handleEdgesChange, showEdges]
  )

  // on double click toggle between entity types
  // (rectangular editable entity vs circlular view entity)
  const onNodeClick: NodeMouseHandler = (
    _: TouchEvent | MouseEvent,
    node: Node
  ) => {
    const newDelta = new Date().getTime()
    setClickDelta(newDelta)
    // if double click, toggle entity/node type
    if (newDelta - clickDelta < DBL_CLICK_THRESHOLD) {
      if (node.type === 'view') enableEntityEdit(node.id)
      else disableEntityEdit(node.id)
    }
  }

  // used for handling edge deletions. e.g. when a user
  // selects and drags  an existing connectionline/edge
  // to a blank spot on the graph, the edge will be removed
  const edgeReconnectSuccessful = useRef(true)
  const onReconnectStart: ReactFlowProps['onReconnectStart'] =
    useCallback(() => {
      edgeReconnectSuccessful.current = false
    }, [])
  const onReconnect: OnReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      edgeReconnectSuccessful.current = true
      setEdges(reconnectEdge(oldEdge, newConnection, edges))
      sendJsonMessage({
        action: 'update:edge',
        oldEdge: stripXYEdgeInIds(oldEdge),
        newConnection: stripXYEdgeInIds(newConnection),
      })
    },
    [setEdges, reconnectEdge, edges, sendJsonMessage]
  )
  const onReconnectEnd: ReactFlowProps['onReconnectEnd'] = useCallback(
    (_: MouseEvent | TouchEvent, edge: Edge) => {
      if (!edgeReconnectSuccessful.current) {
        const id = edge.id
        removeEdge(id)
        sendJsonMessage({
          action: 'delete:edge',
          edge: { id: stripXYEdge(id) },
        })
      }
      edgeReconnectSuccessful.current = true
    },
    []
  )

  // depending on where the valid entity connection handle is positioned
  // the connecting edges handle  will be either red, green, or the primary color
  const isValidConnection: IsValidConnection = (connection) =>
    connection.target !== connection.source

  console.log(nodes, edges)
  return (
    <ReactFlow
      ref={ref}
      zoomOnScroll={true}
      zoomOnPinch={true}
      nodeDragThreshold={2}
      zoomOnDoubleClick={false}
      minZoom={MIN_ZOOM}
      maxZoom={MAX_ZOOM}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      nodes={nodes}
      edges={edges}
      onDrop={onDrop}
      onConnect={onConnect}
      onEdgesChange={onEdgeChange}
      onDragOver={onDragOver}
      isValidConnection={isValidConnection}
      onReconnectStart={onReconnectStart}
      onReconnect={onReconnect}
      onReconnectEnd={onReconnectEnd}
      onInit={setGraphInstance}
      onNodesChange={handleNodesChange}
      onNodeClick={onNodeClick}
      fitViewOptions={viewOptions}
      panActivationKeyCode='Space'
      onMoveStart={() => setCtxMenu(null)}
      onNodeDragStop={onNodeDragStop}
      onPaneClick={onPaneClick}
      onPaneContextMenu={(event) => onNodeContextMenu(event, null)}
      onNodeContextMenu={onNodeContextMenu}
      onSelectionContextMenu={onMultiSelectionCtxMenu}
      connectionLineComponent={NewConnectionLine}
      elevateNodesOnSelect={true}
      connectionMode={ConnectionMode.Loose}
      proOptions={{ hideAttribution: true }} // TODO: If osib makes $$$, subscribe2reactflow :)
      defaultMarkerColor='#3b419eee'
      onlyRenderVisibleElements={true}
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
      <ContextMenu
        sendJsonMessage={sendJsonMessage}
        selection={ctxMenu?.entity}
        position={ctxMenu?.position as CtxPosition}
        closeMenu={() => setCtxMenu(null)}
      />
    </ReactFlow>
  )
}
