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
} from '@xyflow/react'
import EditEntityNode from './EntityEditNode'
import { toast } from 'react-toastify'
import ViewEntityNode from './EntityViewNode'
import { useParams } from 'react-router-dom'
import NewConnectionLine from './ConnectionLine'
import SimpleFloatingEdge from './SimpleFloatingEdge'
import { useGraphFlowStore } from '@/app/store'
import ContextMenu from './ContextMenu'
import { CtxMenu, CtxPosition } from '..'

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
  onConnect?: (connection: any) => void
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
  onConnect,
  ctxMenu,
  setCtxMenu,
}: ProjectGraphProps) {
  const { enableEntityEdit, disableEntityEdit } = useGraphFlowStore()
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
          top: event.clientY < bounds.height - 200 && event.clientY,
          left: event.clientX < bounds.width - 200 && event.clientX,
          right:
            event.clientX >= bounds.width - 200 && bounds.width - event.clientX,
          bottom:
            event.clientY >= bounds.height - 200 &&
            bounds.height - event.clientY + 100,
        },
      })
    },
    []
  )

  const onPaneClick = useCallback(() => setCtxMenu({ entity: null }), [])

  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      // Handle edge update through websocket or API call
      sendJsonMessage({
        action: 'update:edge',
        oldEdge,
        newConnection,
      })
    },
    []
  )
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
    []
  )

  const edgeTypes = useMemo(
    () => ({
      float: SimpleFloatingEdge,
    }),
    []
  )

  const doubleClickThreshold = 320
  const [clickDelta, setClickDelta] = useState(0)

  const onNodeDragStop: OnNodeDrag = (_, node) => {
    sendJsonMessage({
      action: 'update:entity',
      entity: { id: Number(node.id), x: node.position.x, y: node.position.y },
    })
  }

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
  return (
    <ReactFlow
      ref={ref}
      onlyRenderVisibleElements={true}
      nodeDragThreshold={2}
      minZoom={0.1}
      maxZoom={2.0}
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
      onReconnect={onReconnect}
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
    >
      <Background
        color='#394778'
        bgColor='#0D101A30'
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
