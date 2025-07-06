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
  NodeDragHandler,
} from '@xyflow/react'
import EditEntityNode from './EntityEditNode'
import { toast } from 'react-toastify'
import ViewEntityNode from './EntityViewNode'
import { useParams } from 'react-router-dom'
import NewConnectionLine from './ConnectionLine'
import SimpleFloatingEdge from './SimpleFloatingEdge'
import { useGraphVisualizationStore } from '@/app/store'

const viewOptions: FitViewOptions = {
  padding: 50,
}

// im lazy so im extending the generic JSONObject for now, feel free to fix...
interface ProjectGraphProps extends JSONObject {
  graphInstance?: ReactFlowInstance
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
}: ProjectGraphProps) {
  const { setEditState } = useGraphVisualizationStore()
  const onEdgeUpdate = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      // Handle edge update through websocket or API call
      sendJsonMessage({
        action: 'update:edge',
        oldEdge,
        newConnection
      })
    },
    [sendJsonMessage]
  )
  const { hid } = useParams()

  const onDragOver: DragEventHandler<HTMLDivElement> = useCallback((event) => {
    event.preventDefault()
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
  }, [])

  const [blankNode, setBlankNode] = useState<any>({
    label: null,
    position: null,
  })
  const [isCreateEntityError, setIsCreateEntityError] = useState(false)
  const [isLoadingCreateEntity, setIsLoadingCreateEntity] = useState(false)
  
  const createGraphEntity = useCallback(async (entityData: any) => {
    setIsLoadingCreateEntity(true)
    setIsCreateEntityError(false)
    try {
      sendJsonMessage({
        action: 'create:entity',
        entity: entityData
      })
      setIsLoadingCreateEntity(false)
    } catch (error) {
      setIsCreateEntityError(true)
      setIsLoadingCreateEntity(false)
    }
  }, [sendJsonMessage])

  const onDrop: DragEventHandler<HTMLDivElement> = useCallback(
    async (event) => {
      event.preventDefault()
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
          setEditState('createEntity', '')
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
      view: (data: JSONObject) => (
        <ViewEntityNode ctx={data} />
      ),
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

  const onNodeDragStop: NodeDragHandler = (_, node) => {
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
    if (editState.editLabel !== 'dragEntity' && !isDoubleClick) {
      setEditState('dragEntity', node.id)
    }
  }

  const handleGraphRead = (readType: string = 'read') => {
    const viewport: any = graphInstance?.getViewport()
    if (viewport) {
      sendJsonMessage({
        action: `${readType}:graph`,
        viewport,
      })
    }
  }

  useEffect(() => {
    graphInstance?.setViewport({ x: 0, y: 0, zoom: 0.22 })
    handleGraphRead('initial')
  }, [graphInstance?.getViewport])

  const onConnect = useCallback(
    (connection: any) => {
      sendJsonMessage({
        action: 'create:edge',
        connection
      })
    },
    [sendJsonMessage]
  )
  const onEdgeChange = useCallback(
    (changes: any) => {
      sendJsonMessage({
        action: 'update:edges',
        changes
      })
    },
    [sendJsonMessage]
  )
  const onNodesChange = useCallback(
    (changes: any) => {
      sendJsonMessage({
        action: 'update:nodes',
        changes
      })
    },
    [sendJsonMessage]
  )

  const onMoveStart = useCallback(() => !isDragging && setIsDragging(true), [])
  const onMoveEnd = useCallback(() => setIsDragging(false), [])
  const onDragStart = useCallback(() => setIsDragging(true), [])
  return (
    <ReactFlow
      onlyRenderVisibleElements={true}
      nodeDragThreshold={2}
      minZoom={0.2}
      maxZoom={1.5}
      nodes={nodes}
      edges={edges}
      onDrop={onDrop}
      onConnect={onConnect}
      onEdgesChange={onEdgeChange}
      edgeTypes={edgeTypes}
      onDragOver={onDragOver}
      onEdgeUpdate={onEdgeUpdate}
      onInit={setGraphInstance}
      onNodesChange={onNodesChange}
      onNodeClick={(_: any, node: any) => {
        const newDelta = new Date().getTime()
        const isDouble = newDelta - clickDelta < doubleClickThreshold
        if (isDouble) {
          if (node.type === 'view') {
            setEditState('enableEditMode', node.id)
          } else {
            setEditState('disableEditMode', node.id)
          }
        }
        setClickDelta(newDelta)
        setIsDoubleClick(isDouble)
      }}
      onMoveStart={onMoveStart}
      onMoveEnd={onMoveEnd}
      fitViewOptions={viewOptions}
      nodeTypes={nodeTypes}
      onDragStart={onDragStart}
      onDragEnd={onMoveEnd}
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
        size={2.5}
        variant={BackgroundVariant.Dots}
        className='bg-transparent'
        color='#334155e6'
      />
    </ReactFlow>
  )
}
