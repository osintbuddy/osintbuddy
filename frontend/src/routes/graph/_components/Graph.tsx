import { useCallback, useState, useMemo, useEffect } from 'preact/hooks'
import { DragEventHandler } from 'preact/compat'
import {
  Edge,
  Background,
  BackgroundVariant,
  FitViewOptions,
  Connection,
  ReactFlowInstance,
  ReactFlow,
  OnNodeDrag,
  XYPosition,
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

const viewOptions: FitViewOptions = {
  padding: 50,
}

// im lazy so im extending the generic JSONObject for now, feel free to fix...
interface ProjectGraphProps {
  graphInstance?: ReactFlowInstance
  onNodesChange?: (changes: any) => void
  onEdgesChange?: (changes: any) => void
  onConnect?: (connection: any) => void
  setPendingEntityPosition?: (position: XYPosition | null) => void
}

export default function Graph({
  onSelectionCtxMenu,
  onMultiSelectionCtxMenu,
  onPaneCtxMenu,
  onPaneClick,
  nodes,
  edges,
  graphInstance,
  setGraphInstance,
  sendJsonMessage,
  onNodesChange,
  onEdgesChange,
  onConnect,
  setPendingEntityPosition,
  ctxProps,
}: ProjectGraphProps) {
  const { enableEntityEdit, disableEntityEdit } = useGraphFlowStore()
  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      // Handle edge update through websocket or API call
      sendJsonMessage({
        action: 'update:edge',
        oldEdge,
        newConnection,
      })
    },
    [sendJsonMessage]
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
    [graphInstance, createGraphEntity, hid, setPendingEntityPosition]
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
  const { showCtx, ctxSelection, ctxPosition, setShowCtx } = ctxProps
  return (
    <ReactFlow
      className='h-full w-full'
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
      onNodeDragStop={onNodeDragStop}
      onPaneClick={onPaneClick}
      onPaneContextMenu={onPaneCtxMenu}
      onNodeContextMenu={onSelectionCtxMenu}
      onSelectionContextMenu={onMultiSelectionCtxMenu}
      connectionLineComponent={NewConnectionLine}
      elevateNodesOnSelect={true}
    >
      <Background
        color='#394778'
        bgColor='#0D101A30'
        variant={BackgroundVariant.Dots}
      />

      {showCtx && (
        <ContextMenu
          sendJsonMessage={sendJsonMessage}
          selection={ctxSelection}
          position={ctxPosition}
          closeMenu={() => setShowCtx(false)}
        />
      )}
    </ReactFlow>
  )
}
