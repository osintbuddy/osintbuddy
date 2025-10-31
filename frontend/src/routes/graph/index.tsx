import { useState, useRef, useEffect, useMemo, useCallback } from 'preact/hooks'
import { Edge, FitViewOptions, Node, ReactFlowInstance } from '@xyflow/react'
import { useParams, useLocation, useBlocker } from 'react-router-dom'
import useWebSocket, { ReadyState } from 'react-use-websocket'
import { SendJsonMessage } from 'react-use-websocket/dist/lib/types'
import { toast } from 'react-toastify'
import Graph from './_components/Graph'
import ELK from 'elkjs/lib/elk.bundled.js'
import { WS_URL } from '@/app/baseApi'
import RoundLoader from '@/components/loaders'
import { useTour } from '@reactour/tour'
import {
  useGraphStore,
  useAuthStore,
  useFlowStore,
  useEntitiesStore,
  usePropertiesStore,
} from '@/app/store'
import '@xyflow/react/dist/style.css'

interface UseWebsocket {
  lastJsonMessage: JSONObject
  readyState: ReadyState
  sendJsonMessage: SendJsonMessage
}

type ActionTypes =
  | 'authenticated'
  | 'read'
  | 'remove'
  | 'created'
  | 'loading'
  | 'error'
  | 'transform:completed'

interface SocketActions {
  authenticated: (data: any) => void
  read: (data: any) => void
  update: (data: any) => void
  remove: (data: any) => void
  created: (data: any) => void
  loading: (data: any) => void
  error: (data: any) => void
}

export default function Graphing() {
  const { hid } = useParams()
  const location = useLocation()

  const { setIsOpen: setIsTourOpen, setCurrentStep: setCurrentTourStep } =
    useTour()
  const { graph, getGraph, isLoading, isError } = useGraphStore()
  const { setPlugins, setBlueprints, blueprints } = useEntitiesStore()
  const { access_token } = useAuthStore()
  console.log('blueprints', blueprints)
  const {
    nodes,
    edges,
    setEntities,
    setRelationships,
    addEntity,
    addRelationship,
    updateEntity,
    updateRelationship,
    clearGraph,
    setPositionMode,
    positionMode,
    removeTempRelationshipId,
    addEntities,
    addRelationships,
  } = useFlowStore()
  const { clearTransforms } = useEntitiesStore()
  // handle initial graph loading
  useEffect(() => {
    toast.loading('Please wait while we load your graph...', {
      closeButton: true,
      isLoading: true,
      toastId: 'graph',
    })
    getGraph(hid as string)
    if (location.state?.showGuide) {
      setCurrentTourStep(0)
      setIsTourOpen(true)
    }
    setPositionMode('manual')
    return () => {
      // Dismiss any connection-related toasts on navigation
      toast.dismiss('connection-lost')
      toast.dismiss('connection-error')
      toast.dismiss('reconnect-failed')
      clearGraph()
      clearTransforms()
    }
  }, [])

  const graphRef = useRef<HTMLDivElement>(null)
  const [graphInstance, setGraphInstance] = useState<ReactFlowInstance>()
  const { lastJsonMessage, sendJsonMessage, readyState }: UseWebsocket =
    useWebSocket(`ws://${WS_URL}/graph/${hid}/ws`, {
      share: true,
      // Always try to reconnect unless it's an intentional close
      shouldReconnect: (closeEvent) => closeEvent?.code !== 1000,
      retryOnError: false,
      reconnectAttempts: 10,
      reconnectInterval: (attemptNumber) =>
        Math.min(1000 + attemptNumber * 1000, 1000),
      onOpen: () => {
        toast.dismiss('connection-lost')
        toast.dismiss('connection-error')
        sendJsonMessage({
          action: 'auth',
          token: access_token,
        })
      },
      onReconnectStop: (numAttempts) => {
        console.error(
          'WebSocket failed to reconnect after',
          numAttempts,
          'attempts'
        )
        toast.error('Failed to reconnect. Please refresh the page.', {
          toastId: 'reconnect-failed',
          autoClose: false,
        })
      },
    })

  const fitView = useCallback(
    (fitViewOptions?: FitViewOptions) => {
      if (graphInstance?.fitView) graphInstance.fitView(fitViewOptions)
    },
    [graphInstance]
  )
  const handleNotification = (data: any) => {
    const notification = data.notification
    if (notification) {
      const { message, isLoading, toastId, ...notificationProps } = notification
      if (toastId) {
        toast.update(toastId, {
          render: notification.message,
          type: 'success',
          isLoading: false,
          autoClose: 5000,
          ...notification,
        })
      } else {
        toast.success(notification.message, notificationProps)
      }
    } else if (data?.job) {
      toast.success('Transform completed successfully.', {
        toastId: data.job.job_id || data.notification?.toastId,
      })
    }
  }

  // Handle any actions the websocket sends
  const socketActions: SocketActions = {
    authenticated: (data) => {
      setPlugins(data.plugins)
      setBlueprints(data.blueprints)
      sendJsonMessage({ action: 'read:graph' })
      toast.dismiss('connection-lost')
    },
    read: (data) => {
      setEntities(data.nodes || [])
      setNodesBeforeLayout(data.nodes || [])
      setRelationships(data.edges || [])
      setEdgesBeforeLayout(data.edges || [])
      // Sync open Properties tabs with fresh node data from server
      try {
        const props = usePropertiesStore.getState()
        if (props.tabs.length) {
          for (const t of props.tabs) {
            const node = (data.nodes || []).find(
              (n: any) => n.id === t.entityId
            )
            if (node?.data) {
              const currStr = JSON.stringify(t.data ?? {})
              const nextStr = JSON.stringify(node.data)
              if (currStr !== nextStr) props.setData(t.entityId, node.data)
            }
          }
        }
      } catch (_) {}
      toast.dismiss('graph')
      fitView()
    },
    remove: (data) => {
      handleNotification(data)
    },
    update: (data) => {
      if (data?.entity) {
        updateEntity(data.entity.id, data.entity)
        // Keep properties preview in sync when an entity's data changes
        const props = usePropertiesStore.getState()
        if (
          props.tabs.find((t) => t.entityId === data.entity.id) &&
          data.entity &&
          'data' in data.entity &&
          data.entity.data
        ) {
          const { label, ...propsData } = (data.entity.data as any) ?? {}
          props.setData(data.entity.id, propsData)
        }
      }
      if (data.edge) {
        const { id, ...update } = data.edge
        updateRelationship(id, update)
      }
      handleNotification(data)
    },
    created: (data) => {
      const { entity, edge, entities, edges } = data
      if (entity) addEntity({ ...entity, type: 'edit' })
      // If this edge originated from this client, remap temp -> id to avoid duplicates
      if (edge?.temp_id && edge?.id) {
        removeTempRelationshipId(edge.temp_id, edge.id)
      } else if (edge?.id && edge?.source && edge?.target) {
        // Otherwise, add a new edge created by another client/process
        addRelationship(edge)
      }
      if (entities) addEntities(entities)
      if (edges) addRelationships(edges)
      handleNotification(data)
    },
    loading: (data) => {
      const { toastId, type, isLoading, autoClose, ...notification } =
        data?.notification
      if (isLoading) {
        toast.loading(notification.message ?? 'Loading...', {
          closeButton: true,
          isLoading: true,
          toastId: toastId,
          autoClose: 1600,
        })
      }
    },
    error: (data) => {
      const notification = data.notification
      if (notification?.id) {
        // Update existing loading toast to error
        toast.update(notification.id, {
          render: notification.message,
          type: 'error',
          isLoading: false,
          autoClose: notification.autoClose ?? 5000,
        })
      } else {
        // Create new error toast if no toastId
        toast.error(notification?.message || 'An error occurred')
      }
    },
    'transform:completed': (data) => {
      socketActions.created(data)
    },
  }

  const [nodesBeforeLayout, setNodesBeforeLayout] = useState(nodes)
  const [edgesBeforeLayout, setEdgesBeforeLayout] = useState(edges)

  // TODO: Also implement d3-hierarchy, entitree-flex, dagre, webcola, and graphology layout modes
  //       Once implemented measure performance and deprecate whatever performs worse
  // tree layouts toggle found in top right
  const elk = useMemo(() => new ELK(), [])
  const useElkLayoutElements = () => {
    const defaultOptions = {
      'elk.algorithm': 'layered',
      'elk.layered.spacing.nodeNodeBetweenLayers': 420,
      'elk.spacing.nodeNode': 180,
    }

    const setElkLayout = useCallback(
      (options: any) => {
        const layoutOptions = { ...defaultOptions, ...options }
        // Prepare nodes with measured dimensions for ELK
        const elkNodes = structuredClone(nodesBeforeLayout).map(
          (node: any) => ({
            ...node,
            width: node.measured?.width || node.width || 150,
            height: node.measured?.height || node.height || 50,
          })
        )
        const graph = {
          id: 'root',
          layoutOptions: layoutOptions,
          children: elkNodes,
          edges: structuredClone(edgesBeforeLayout),
        }
        elk.layout(graph as any).then(({ children, edges }: any) => {
          // Create new node objects instead of mutating
          const layoutedNodes = children.map((node: any) => ({
            ...node,
            position: { x: node.x, y: node.y },
            // Remove ELK-specific width/height to let ReactFlow handle sizing
            width: undefined,
            height: undefined,
          }))
          clearGraph()
          setEntities(layoutedNodes)
          setRelationships(edges)
          window.requestAnimationFrame(() => {
            fitView && fitView({ padding: 0.25 })
          })
        })
      },
      [nodesBeforeLayout]
    )

    return { setElkLayout }
  }

  const { setElkLayout } = useElkLayoutElements()

  useEffect(() => {
    let action: ActionTypes = lastJsonMessage?.action
    if (action && socketActions[action]) socketActions[action](lastJsonMessage)
  }, [lastJsonMessage])

  const handlePositionChange = useCallback(() => {
    if (positionMode === 'manual') {
      setEntities(nodesBeforeLayout)
      setRelationships(edgesBeforeLayout)
    }
    fitView({ duration: 300 })
  }, [positionMode, setEntities, setRelationships])

  useEffect(() => {
    if (positionMode === 'manual') {
      handlePositionChange()
    }
  }, [handlePositionChange, positionMode])

  return (
    <>
      {/* TODO: Add screen fade in transition on load */}
      <>
        {isError && <h2>Error</h2>}
        {isLoading && <RoundLoader />}
      </>
      <div className='h-screen w-screen bg-slate-950/40' ref={graphRef}>
        <Graph
          graphInstance={graphInstance}
          setGraphInstance={setGraphInstance}
          sendJsonMessage={sendJsonMessage}
          readyState={readyState}
          graph={graph}
          setElkLayout={setElkLayout}
          fitView={fitView}
          blueprints={blueprints}
        />
      </div>
    </>
  )
}
