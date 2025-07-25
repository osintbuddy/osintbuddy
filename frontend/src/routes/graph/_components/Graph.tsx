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
} from '@xyflow/react'
import EditEntityNode from './EntityEditNode'
import { toast } from 'react-toastify'
import ViewEntityNode from './EntityViewNode'
import { useParams } from 'react-router-dom'
import NewConnectionLine from './ConnectionLine'
import FloatingEdge from './FloatingEdge'
import { useGraphFlowStore } from '@/app/store'
import ContextMenu from './ContextMenu'
import { CtxMenu, CtxPosition } from '..'

const MIN_ZOOM = 0.1
const MAX_ZOOM = 2.0
const viewOptions: FitViewOptions = {
  padding: 50,
}

interface ProjectGraphProps {
  nodes: Node[]
  edges: Edge[]
  graphInstance?: ReactFlowInstance
  ctxMenu: CtxMenu | null
  setGraphInstance: (flow: ReactFlowInstance) => void
  sendJsonMessage: (message: any) => void
  onNodesChange?: (changes: any) => void
  onEdgesChange?: (changes: any) => void
  setCtxMenu: (ctx: CtxMenu | null) => void
}

export default function Graph({
  nodes,
  edges,
  graphInstance,
  setGraphInstance,
  sendJsonMessage,
  onNodesChange,
  onEdgesChange,
  ctxMenu,
  setCtxMenu,
}: ProjectGraphProps) {
  const {
    enableEntityEdit,
    disableEntityEdit,
    removeEdge,
    setEdges,
    setNodes,
    onConnect,
  } = useGraphFlowStore()
  const ref = useRef<HTMLDivElement>(null)
  // @todo implement support for multi-select transforms -
  // hm, actually, how will the transforms work if different plugin types/nodes are in the selection?
  // just delete/save position on drag/etc?
  const onMultiSelectionCtxMenu = useCallback(
    (event: MouseEvent, nodes: Node[]) => {
      event.preventDefault()
    },
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
          top: event.clientY < bounds.height - 250 && event.clientY,
          left: event.clientX < bounds.width - 250 && event.clientX,
          right:
            event.clientX >= bounds.width - 250 && bounds.width - event.clientX,
          bottom:
            event.clientY >= bounds.height - 250 &&
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
      })
      const createEntity = { label, position }
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
      edit: (data: JSONObject) => (
        <EditEntityNode ctx={data} sendJsonMessage={sendJsonMessage} />
      ),
      view: (data: JSONObject) => <ViewEntityNode ctx={data} />,
    }),
    [sendJsonMessage]
  )

  const edgeTypes = useMemo(
    () => ({
      sfloat: FloatingEdge,
    }),
    []
  )

  const doubleClickThreshold = 320
  const [clickDelta, setClickDelta] = useState(0)

  const onNodeDragStop: OnNodeDrag = useCallback(
    (_, node) => {
      // Debounce position updates to reduce WebSocket traffic
      setTimeout(() => {
        sendJsonMessage({
          action: 'update:entity',
          entity: {
            id: Number(node.id),
            x: node.position.x,
            y: node.position.y,
          },
        })
      }, 100)
    },
    [sendJsonMessage]
  )

  const onEdgeChange = useCallback(
    (changes: any) => {
      // Use the store handler if provided, otherwise fallback to WebSocket
      if (onEdgesChange) {
        onEdgesChange(changes)
      } else {
        sendJsonMessage({
          action: 'update:edges',
          changes,
        })
      }
    },
    [onEdgesChange]
  )

  const onNodeClick: NodeMouseHandler = (_, node) => {
    const newDelta = new Date().getTime()
    const isDouble = newDelta - clickDelta < doubleClickThreshold
    if (isDouble) {
      if (node.type === 'view') enableEntityEdit(node.id)
      else disableEntityEdit(node.id)
    }
    setClickDelta(newDelta)
  }

  // used for handling edge deletions. e.g. when a user
  // selects and drags  an existing connectionline/edge
  // to a blank spot on the graph the edge is removed
  const edgeReconnectSuccessful = useRef(true)
  const onReconnectStart = useCallback(() => {
    edgeReconnectSuccessful.current = false
  }, [])
  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      edgeReconnectSuccessful.current = true
      setEdges(reconnectEdge(oldEdge, newConnection, edges))
      sendJsonMessage({
        action: 'update:edge',
        oldEdge,
        newConnection,
      })
    },
    [setEdges, reconnectEdge, edges, sendJsonMessage]
  )
  const onReconnectEnd = useCallback((_, edge) => {
    if (!edgeReconnectSuccessful.current) {
      removeEdge(edge.id)
    }
    edgeReconnectSuccessful.current = true
  }, [])
  const isValidConnection: IsValidConnection = (connection) =>
    connection.target !== connection.source

  const onNodeMouseEnter: NodeMouseHandler<Node> = useCallback((_, { id }) => {
    // const { nodes: updatedNodes, edges: updatedEdges } =
    //   highlightNodesAndEdges(nodes, edges, {
    //     activeEntityId: undefined,
    //     hoverEntityId: id,
    //   })
    // setEdges(updatedEdges)
    // setNodes(updatedNodes)
  }, [])
  const onNodeMouseLeave: NodeMouseHandler<Node> = useCallback((_, { id }) => {
    // const { nodes: updatedNodes, edges: updatedEdges } =
    //   highlightNodesAndEdges(nodes, edges, {
    //     activeEntityId: undefined,
    //     hoverEntityId: undefined,
    //   })
    // setEdges(updatedEdges)
    // setNodes(updatedNodes)
  }, [])

  return (
    <ReactFlow
      defaultMarkerColor='#3b419eee'
      ref={ref}
      onlyRenderVisibleElements={true}
      nodeDragThreshold={2}
      minZoom={MIN_ZOOM}
      maxZoom={MAX_ZOOM}
      zoomOnScroll={true}
      zoomOnPinch={true}
      zoomOnDoubleClick={false}
      nodes={nodes}
      edges={edges}
      onDrop={onDrop}
      onConnect={onConnect}
      onEdgesChange={onEdgeChange}
      edgeTypes={edgeTypes}
      onDragOver={onDragOver}
      isValidConnection={isValidConnection}
      onReconnectStart={onReconnectStart}
      onReconnect={onReconnect}
      onReconnectEnd={onReconnectEnd}
      onInit={setGraphInstance}
      onNodesChange={onNodesChange}
      onNodeClick={onNodeClick}
      fitViewOptions={viewOptions}
      nodeTypes={nodeTypes}
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
      onNodeMouseEnter={onNodeMouseEnter}
      onNodeMouseLeave={onNodeMouseLeave}
      // TODO: If osintbuddy makes enough $$$ for a reactflow sub, subscribe :)
      proOptions={{ hideAttribution: true }}
    >
      <Background
        id='BGTIME'
        color='#5b609bee'
        variant={BackgroundVariant.Dots}
      />

      {ctxMenu && (
        <ContextMenu
          sendJsonMessage={sendJsonMessage}
          selection={ctxMenu.entity}
          position={ctxMenu.position as CtxPosition}
          closeMenu={() => setCtxMenu(null)}
        />
      )}
    </ReactFlow>
  )
}
