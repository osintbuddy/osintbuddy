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
} from '@xyflow/react'
import EditEntityNode from './EntityEditNode'
import { toast } from 'react-toastify'
import ViewEntityNode from './EntityViewNode'
import { useParams } from 'react-router-dom'
import NewConnectionLine from './ConnectionLine'
import SimpleFloatingEdge from './SimpleFloatingEdge'
import { useGraphFlowStore } from '@/app/store'

const viewOptions: FitViewOptions = {
  padding: 50,
}

// im lazy so im extending the generic JSONObject for now, feel free to fix...
interface ProjectGraphProps extends JSONObject {
  graphInstance?: ReactFlowInstance
  onNodesChange?: (changes: any) => void
  onEdgesChange?: (changes: any) => void
  onConnect?: (connection: any) => void
}

export default function Graph({
  onSelectionCtxMenu,
  onMultiSelectionCtxMenu,
  onPaneCtxMenu,
  onPaneClick,
  graphRef,
  nodes,
  edges,
  graphInstance,
  setGraphInstance,
  sendJsonMessage,
  fitView,
  positionMode,
  editState,
  onNodesChange: onNodesChangeProp,
  onEdgesChange: onEdgesChangeProp,
  onConnect: onConnectProp,
}: ProjectGraphProps) {
  const { setEditState, enableEntityEdit, disableEntityEdit } =
    useGraphFlowStore()
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
    console.log('createGraphEntity')

    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
  }, [])

  const [isCreateEntityError, setIsCreateEntityError] = useState(false)
  const [isLoadingCreateEntity, setIsLoadingCreateEntity] = useState(false)

  const createGraphEntity = useCallback(
    async (entityData: any) => {
      console.log('createGraphEntity')
      setIsLoadingCreateEntity(true)
      setIsCreateEntityError(false)
      try {
        sendJsonMessage({
          action: 'create:entity',
          entity: entityData,
        })
        setIsLoadingCreateEntity(false)
      } catch (error) {
        setIsCreateEntityError(true)
        setIsLoadingCreateEntity(false)
      }
    },
    [sendJsonMessage]
  )

  const onDrop: DragEventHandler<HTMLDivElement> = useCallback(
    async (event) => {
      console.log('onDrop')

      const label =
        event.dataTransfer &&
        event.dataTransfer.getData('application/reactflow')
      if (typeof label === 'undefined' || !label) return

      const graphBounds = graphRef.current.getBoundingClientRect()
      const position = graphInstance?.screenToFlowPosition({
        x: event.clientX - graphBounds.left,
        y: event.clientY - graphBounds.top,
      })
      if (label && position && hid) {
        const createNode = { label, position }
        try {
          createGraphEntity({ createNode, hid })
          setEditState({
            label: 'createEntity',
            id: null,
          })
        } catch (error: any) {
          console.error(error)
          toast.error(
            `We ran into a problem creating the ${label} entity. Please try again`
          )
        }
      }
    },
    [graphInstance, createGraphEntity, hid, setEditState]
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
  const [isDragging, setIsDragging] = useState(false)
  const [isDoubleClick, setIsDoubleClick] = useState(false)
  const [entityPosition, setEntityPosition] = useState<any>({
    x: null,
    y: null,
  })
  const [clickDelta, setClickDelta] = useState(0)

  const onNodeDragStop: OnNodeDrag = (_, node) => {
    console.log('stop drag', node)

    if (
      positionMode === 'manual' &&
      (entityPosition.x !== node.position.x ||
        entityPosition.y !== node.position.y)
    ) {
      sendJsonMessage({
        action: 'update:node',
        node: { id: node.id, x: node.position.x, y: node.position.y },
      })
      setEntityPosition({ x: node.position.x, y: node.position.y })
    }
    if (editState.label !== 'dragEntity' && !isDoubleClick) {
      setEditState({
        label: 'dragEntity',
        id: node.id,
      })
    }
  }

  const handleGraphRead = (readType: string = 'read') => {
    const viewport: any = graphInstance?.getViewport()
    console.log('read Viewport')
    if (viewport) {
      sendJsonMessage({
        action: `${readType}:graph`,
        viewport,
      })
    }
  }

  useEffect(() => {
    if (graphInstance) {
      console.log('setViewport')
      graphInstance.setViewport({ x: 0, y: 0, zoom: 0.22 })
      handleGraphRead('initial')
    }
  }, [graphInstance])

  const onConnect = useCallback(
    (connection: any) => {
      console.log(connection)
      // Use the store handler if provided, otherwise fallback to WebSocket
      if (onConnectProp) {
        onConnectProp(connection)
      } else {
        sendJsonMessage({
          action: 'create:edge',
          connection,
        })
      }
    },
    [onConnectProp, sendJsonMessage]
  )

  const onEdgeChange = useCallback(
    (changes: any) => {
      console.log(changes)
      // Use the store handler if provided, otherwise fallback to WebSocket
      if (onEdgesChangeProp) {
        onEdgesChangeProp(changes)
      } else {
        sendJsonMessage({
          action: 'update:edges',
          changes,
        })
      }
    },
    [onEdgesChangeProp, sendJsonMessage]
  )

  const onNodesChange = useCallback(
    (changes: any) => {
      console.log(changes)
      // Use the store handler if provided, otherwise fallback to WebSocket
      if (onNodesChangeProp) {
        onNodesChangeProp(changes)
      } else {
        sendJsonMessage({
          action: 'update:nodes',
          changes,
        })
      }
    },
    [onNodesChangeProp, sendJsonMessage]
  )

  return (
    <ReactFlow
      className='h-full w-full'
      onlyRenderVisibleElements={true}
      nodeDragThreshold={2}
      minZoom={0}
      maxZoom={1.5}
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
      onNodeClick={(x: any, node: any) => {
        const newDelta = new Date().getTime()
        const isDouble = newDelta - clickDelta < doubleClickThreshold
        if (isDouble) {
          if (node.type === 'view') {
            console.log('IS DOUBLE', node.type, node.id, x)
            enableEntityEdit(node.id)
          } else {
            disableEntityEdit(node.id)
            console.log('IS DOUBLE')
          }
        }
        setClickDelta(newDelta)
        setIsDoubleClick(isDouble)
      }}
      fitViewOptions={viewOptions}
      nodeTypes={nodeTypes}
      // onDragStart={onDragStart}
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
    </ReactFlow>
  )
}
