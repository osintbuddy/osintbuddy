import { useState, useRef, useEffect, useMemo, useCallback } from 'preact/hooks'
import { FitViewOptions, Node, ReactFlowInstance } from '@xyflow/react'
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
  useGraphFlowStore,
  useEntitiesStore,
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

interface SocketActions {
  authenticated: (data: any) => void
  read: (data: any) => void
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
  const { setPlugins } = useEntitiesStore()
  const { access_token } = useAuthStore()

  const {
    nodes,
    edges,
    setNodes,
    setEdges,
    addNode,
    addEdge,
    clearGraph,
    setPositionMode,
    positionMode,
  } = useGraphFlowStore()
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

  // Handle any actions the websocket sends
  const socketActions: SocketActions = {
    authenticated: (data) => {
      setPlugins(data.plugins)
      sendJsonMessage({ action: 'read:graph' })
      toast.dismiss('connection-lost')
    },
    read: (data) => {
      console.log('REAAAADING TIME', data)
      setNodes(data.nodes || [])
      setEdges(data.edges || [])
      toast.dismiss('graph')
      fitView()
    },
    remove: () => {},
    created: (data) => {
      addNode(data.entity)
      if (data.edge) {
        addEdge(data.edge)
      } else {
      }
      const notification = data.notification
      if (notification) {
        const { message, ...notificationProps } = notification
        toast.success(notification.message, notificationProps)
      }
    },
    loading: (data) => {
      const { toastId, type, isLoading, autoClose, ...notification } =
        data?.notification
      // Update existing loading toast to success
      if (isLoading) {
        // Create new loading toast
        toast.loading(notification.message ?? 'Loading...', {
          closeButton: true,
          isLoading: true,
          toastId: toastId,
          autoClose: 1600,
        })
      } else
        toast.update(toastId, {
          render: notification.message,
          type: 'success',
          isLoading: false,
          autoClose: 5000,
          ...notification,
        })
    },
    error: (data) => {
      const notification = data.notification
      if (notification?.toastId) {
        // Update existing loading toast to error
        toast.update(notification.toastId, {
          render: notification.message,
          type: 'error',
          isLoading: false,
          autoClose: 5000,
        })
      } else {
        // Create new error toast if no toastId
        toast.error(notification?.message || 'An error occurred')
      }
    },
  }

  const [nodesBeforeLayout, setNodesBeforeLayout] = useState(nodes)
  const [edgesBeforeLayout, setEdgesBeforeLayout] = useState(edges)

  // TODO: Also implement d3-hierarchy, entitree-flex, dagre, webcola, and graphology layout modes
  //       Once implemented measure performance and deprecate whatever performs worse
  // tree layouts toggle found in top right
  const elk = new ELK()
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
          setNodes(layoutedNodes)
          setEdges(edges)
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
    console.log('SOCKET MSG', action, socketActions[action])
    if (action && socketActions[action]) socketActions[action](lastJsonMessage)
  }, [lastJsonMessage])

  const handlePositionChange = useCallback(() => {
    if (positionMode === 'manual') {
      setNodesBeforeLayout(nodes)
      setEdgesBeforeLayout(edges)
    }
  }, [positionMode, setNodesBeforeLayout, setEdgesBeforeLayout, nodes, edges])

  useEffect(() => {
    handlePositionChange()
  }, [handlePositionChange])

  return (
    <>
      {/* TODO: Add screen fade in transition on load */}
      <>
        {isError && <h2>Error</h2>}
        {isLoading && <RoundLoader />}
      </>
      <div className='h-screen w-screen bg-slate-950/40' ref={graphRef}>
        <Graph
          nodes={nodes}
          edges={edges}
          graphInstance={graphInstance}
          setGraphInstance={setGraphInstance}
          sendJsonMessage={sendJsonMessage}
          readyState={readyState}
          graph={graph}
          setElkLayout={setElkLayout}
          fitView={fitView}
        />
      </div>
    </>
  )
}
