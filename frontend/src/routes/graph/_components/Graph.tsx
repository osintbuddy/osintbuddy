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
  OnConnectEnd,
  OnConnect,
  addEdge,
  FinalConnectionState,
  NodeChange,
  getConnectedEdges,
  EdgeChange,
  NodeSelectionChange,
  EdgeReplaceChange,
} from '@xyflow/react'
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

  /*
   * Unhighlights edges
   *
   * @returns {EdgeChange[]} - edge changes to be applied
   **/
  const unhighlightEdges = useCallback(
    (edges: Edge[]): EdgeChange[] => {
      const edgeChanges: EdgeChange[] = []

      for (const edge of edges) {
        const newEdge = {
          ...edge,
          data: {
            ...edge.data,
            isActivated: false,
          },
        }

        edgeChanges.push({
          id: newEdge.id,
          type: 'replace',
          item: newEdge,
        } as EdgeChange)
      }

      return edgeChanges
    }, 
    []
  )

  /*
   * Highlights edges
   *
   * @returns {EdgeChange[]} - edge changes to be applied
   **/
  const highlightEdges = useCallback(
    (edges: Edge[]) => {
      const edgeChanges: EdgeChange[] = []

      for (const edge of edges) {
        const newEdge = {
          ...edge,
          data: {
            ...edge.data,
            isActivated: true,
          },
        }

        edgeChanges.push({
          id: newEdge.id,
          type: 'replace',
          item: newEdge,
        } as EdgeChange)
      }

      return edgeChanges
    }, 
    []
  )

  /*
   * Handles edge highlighting when a node is selected/unselected
   **/
  const handleEdgeHighlightingOnNodeSelection = useCallback(
    (changes: NodeSelectionChange[]) => {

      // Make sure the first change is selection
      if (changes.length > 0 && changes[0].type !== 'select') return

      // Sort node changes so that unselected nodes go first to avoid highlighting overlaps
      const sortedNodeChanges = changes.sort(
        (a, b) => {
          if (!a.selected && b.selected) return -1
          if (a.selected && !b.selected) return 1
          else return -1
        })

      // Highlight/Unhighlight edges connected to the node
      for (const change of sortedNodeChanges) {
        if (change.type === 'select') {
          const changedNode = nodes.find((node) => node.id === change.id)
          if (changedNode) {
            const connectedEdges = getConnectedEdges([changedNode], edges)

            if (change.selected) {
              const edgeChanges: EdgeChange[] = highlightEdges(connectedEdges)
              handleRelationshipsChange(edgeChanges)
            } else {
              const edgeChanges: EdgeChange[] = unhighlightEdges(connectedEdges)
              handleRelationshipsChange(edgeChanges)
            }
          }
        }
      }
    },
    [nodes, edges]
  )

  /*
   * Handles edge highlighting when edges are connected/disconnected
   **/
  const handleEdgeHighlightingOnEdgeChange = useCallback(
    (changes: EdgeReplaceChange[]): EdgeChange[] => {
      const newChanges: EdgeChange[] = [];
      for (const change of changes) {
        const targetNode = nodes.find((node) => node.id === (change.item?.target ?? ""))
        const sourceNode = nodes.find((node) => node.id === (change.item?.source ?? ""))

        if (targetNode?.selected || sourceNode?.selected) {
          newChanges.push(...highlightEdges([change.item]))
        }
        else {
          newChanges.push(change)
        }
      }
      return newChanges
    },
    [nodes, edges]
  )

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      handleEdgeHighlightingOnNodeSelection(changes as NodeSelectionChange[])
      handleEntityChange(changes)
    },
    [nodes, edges]
  )

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
  const renderMissingBlueprint = useCallback((entity: JSONObject) => {
    return (
      <div className='rounded-md border border-rose-900 bg-rose-950/60 p-2 text-rose-200 text-xs shadow-lg shadow-rose-900/20'>
        <p className='font-semibold text-rose-100'>Missing blueprint</p>
        <p className='mt-1 break-all'>Unable to render entity type: {entity?.data?.label ?? entity?.label ?? 'unknown'}</p>
      </div>
    )
  }, [])

  const nodeTypes = useMemo(
    () => ({
      edit: (entity: JSONObject) => {
        const label = entity?.data?.label ?? entity?.label
        const blueprint = label ? blueprints[label] : undefined
        if (!label || !blueprint) {
          console.warn('Missing blueprint for entity', { label, entity })
          return renderMissingBlueprint(entity)
        }
        return (
          <EditEntityNode
            ctx={entity}
            label={label}
            blueprint={structuredClone(blueprint)}
            sendJsonMessage={sendJsonMessage}
          />
        )
      },
      view: (entity: JSONObject) => {
        const label = entity?.data?.label ?? entity?.label
        const blueprint = label ? blueprints[label] : undefined
        if (!label || !blueprint) {
          console.warn('Missing blueprint for entity', { label, entity })
          return renderMissingBlueprint(entity)
        }
        return (
          <ViewEntityNode
            ctx={entity}
            label={label}
            blueprint={structuredClone(blueprint)}
          />
        )
      },
    }),
    [blueprints, renderMissingBlueprint]
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
      const newChanges = handleEdgeHighlightingOnEdgeChange(changes)
      handleRelationshipsChange(newChanges)
    },
    [nodes, edges, handleRelationshipsChange, showEdges]
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

  const onConnect: OnConnect = useCallback(
    (connection) => {
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
    },
    []
  )
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

  const onReconnectEnd = useCallback(
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

  const onError = useCallback(
    (msgId: string, msg: string) => {
      // Get rid of the unnecessary warning
      if (msgId === '002') {
        return
      }

      console.warn(msg)
    },
    []
  )

  return (
    <ReactFlow
      ref={ref}
      zoomOnScroll={true}
      zoomOnPinch={true}
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
      onNodesChange={onNodesChange}
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
      onError={onError}
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
          sendJsonMessage={sendJsonMessage}
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
