import { useState, useRef, useEffect, useMemo, useCallback } from 'preact/hooks'
import {
  XYPosition,
  Node,
  ReactFlowInstance,
  FitView,
  Edge,
} from '@xyflow/react'
import { useParams, useLocation, useBlocker } from 'react-router-dom'
import useWebSocket, { ReadyState } from 'react-use-websocket'
import { SendJsonMessage } from 'react-use-websocket/dist/lib/types'
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceX,
  forceY,
} from 'd3-force'
import OverlayMenus from './_components/EntityOptions'
import ContextMenu from './_components/ContextMenu'
import { toast } from 'react-toastify'
import Graph from './_components/Graph'
import ELK from 'elkjs/lib/elk.bundled.js'

import { WS_URL } from '@/app/baseApi'
import RoundLoader from '@/components/loaders'
import { useTour } from '@reactour/tour'
import { useGraphStore, useAuthStore, useGraphFlowStore } from '@/app/store'

interface UseWebsocket {
  lastJsonMessage: JSONObject
  readyState: ReadyState
  sendJsonMessage: SendJsonMessage
  lastMessage: MessageEvent<any> | null
}

interface GraphInquiryProps {}

let edgeId = 0

export const getEdgeId = () => {
  edgeId = edgeId + 1
  return `e-tmp-${edgeId}`
}

interface SocketNotification {
  message: string | null
  id: string | null
  autoClose: boolean | null
}

type ActionTypes =
  | 'authenticated'
  | 'read'
  | 'remove'
  | 'created'
  | 'loading'
  | 'error'

interface SocketActions {
  authenticated: Function
  read: Function
  remove: Function
  created: Function
  loading: Function
  error: Function
}

export default function GraphInquiry({}: GraphInquiryProps) {
  const { hid } = useParams()
  const location = useLocation()
  const {
    setIsOpen: setIsTourOpen,
    steps,
    setCurrentStep: setCurrentTourStep,
  } = useTour()

  const { graph, getGraph, isLoading, isError } = useGraphStore()

  const { access_token } = useAuthStore()

  // Use the new ReactFlow-specific store
  const {
    nodes,
    edges,
    setNodes,
    setEdges,
    addNode,
    clearGraph,
    onNodesChange,
    onEdgesChange,
    onConnect,
    setPositionMode,
    positionMode,
  } = useGraphFlowStore()

  useEffect(() => {
    if (location.state?.showGuide) {
      setCurrentTourStep(0)
      setIsTourOpen(true)
    }
  }, [])

  useEffect(() => {
    if (hid) {
      clearGraph()
      getGraph(hid)
    }
  }, [hid])

  const WS_GRAPH_INQUIRE = `ws://${WS_URL}/graph/${hid}/ws`

  const isSuccess = !isLoading && !isError && graph

  useEffect(() => {
    setPositionMode('manual')
  }, [graph?.id])

  const graphRef = useRef<HTMLDivElement>(null)
  const [graphInstance, setGraphInstance] = useState<ReactFlowInstance>()

  const [socketUrl, setSocketUrl] = useState(`${WS_GRAPH_INQUIRE}`)
  const [shouldConnect, setShouldConnect] = useState(false)
  const [dropPosition, setDropPosition] = useState<XYPosition | null>(null)

  const { lastJsonMessage, readyState, sendJsonMessage }: UseWebsocket =
    useWebSocket(socketUrl, {
      shouldReconnect: () => shouldConnect,
      onOpen: () => {
        // Send auth token as first message
        if (access_token) {
          sendJsonMessage({
            action: 'auth',
            token: access_token,
          })
        }
      },
      onClose: () => {
        clearGraph()
        toast.update('loadingToast', {
          render: `The connection was lost! ${shouldConnect ? 'Attempting to reconnect...' : ''}`,
          type: 'warning',
          isLoading: false,
          autoClose: 1400,
        })
      },
    })

  const socketStatus = {
    [ReadyState.CONNECTING]: 'connecting',
    [ReadyState.OPEN]: 'open',
    [ReadyState.CLOSING]: 'closing',
    [ReadyState.CLOSED]: 'closed',
    [ReadyState.UNINSTANTIATED]: 'uninstantiated',
  }[readyState]

  useEffect(() => {
    if (graph && !socketUrl.includes(graph?.id)) {
      clearGraph()
      setSocketUrl(`${WS_GRAPH_INQUIRE}/${graph.id}`)
      setShouldConnect(true)
    }
  }, [graph?.id, socketStatus[readyState]])

  const handleNotification = (notification: null | SocketNotification) => {
    if (notification && notification?.id) {
      !notification.autoClose
        ? toast.update(lastJsonMessage.notification.id)
        : toast.loading(notification.message ?? 'Loading...', {
            closeButton: true,
            isLoading: true,
            toastId: notification.id,
            autoClose: 1600,
          })
    }
  }

  const fitView = useCallback(() => {
    if (graphInstance?.fitView) graphInstance.fitView()
  }, [graphInstance])

  // Handle any actions the websocket sends
  const socketActions: SocketActions = {
    authenticated: (_) => {
      toast.loading('Please wait while we load your graph...', {
        closeButton: true,
        isLoading: true,
        toastId: 'graph',
      })
      sendJsonMessage({ action: 'read:graph' })
    },
    read: (data) => {
      setNodes(data.nodes || [])
      setEdges(data.edges || [])
      toast.dismiss('graph')
      fitView()
    },
    remove: (data) => {},
    created: (data) => {
      addNode({
        ...data.entity,
      })
      toast.success(
        `Successfully created a new ${data.entity.data?.label.toLowerCase()} entity!`
      )
      // Clear the pending position
      setDropPosition(null)
    },
    loading: (data) => handleNotification(data?.notification),
    error: (data) => toast.error(`${data.message}`),
  }

  useEffect(() => {
    let action: ActionTypes = lastJsonMessage?.action
    if (action && socketActions[action]) socketActions[action](lastJsonMessage)
  }, [lastJsonMessage])

  const [nodesBeforeLayout, setNodesBeforeLayout] = useState(nodes)
  const [edgesBeforeLayout, setEdgesBeforeLayout] = useState(edges)
  const [ctxPosition, setCtxPosition] = useState<XYPosition>({ x: 0, y: 0 })
  const [ctxSelection, setCtxSelection] = useState<JSONObject | null>(null)
  const [showMenu, setShowMenu] = useState(false)
  const [activeTransformLabel, setActiveTransformLabel] = useState<
    string | null
  >(null)

  // @todo implement support for multi-select transforms -
  // hm, actually, how will the transforms work if different plugin types/nodes are in the selection?
  // just delete/save position on drag/etc?
  const onMultiSelectionCtxMenu = (event: MouseEvent, nodes: Node[]) => {
    event.preventDefault()
  }

  const onSelectionCtxMenu = (event: MouseEvent, node: Node) => {
    event.preventDefault()
    setCtxPosition({
      y: event.clientY - 20,
      x: event.clientX - 20,
    })
    setCtxSelection(node)
    setActiveTransformLabel(node.data.label)
    setShowMenu(true)
  }

  const onPaneCtxMenu = (event: MouseEvent) => {
    event.preventDefault()
    setCtxSelection(null)
    setShowMenu(true)
    setCtxPosition({
      x: event.clientX - 25,
      y: event.clientY - 25,
    })
  }

  const onPaneClick = () => {
    setShowMenu(false)
    setCtxSelection(null)
  }

  useEffect(() => {
    if (positionMode === 'manual') {
      setNodesBeforeLayout(nodes)
      setEdgesBeforeLayout(edges)
    }
  }, [nodes, edges, positionMode])

  useEffect(() => {
    if (positionMode === 'manual') {
      setNodes(nodesBeforeLayout)
      setEdges(edgesBeforeLayout)
    }
  }, [positionMode])

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

  // force layout hook/toggle found in top right
  const useForceLayoutElements = () => {
    const nodesInitialized = nodes.every(
      (node: any) => node.measured?.width && node.measured?.height
    )

    return useMemo(() => {
      const simulation = forceSimulation()
        .force('charge', forceManyBody().strength(-4000))
        .force('x', forceX().x(0).strength(0.05))
        .force('y', forceY().y(0).strength(0.05))
        .alphaTarget(0.01)
        .stop()

      let forceNodes = nodes.map((node: any) => ({
        ...node,
        x: node.position.x,
        y: node.position.y,
      }))
      let forceEdges = structuredClone(edges)

      const forceSimOff = [
        false,
        { toggleForceLayout: (setForce?: boolean) => null } as any,
      ]
      // if no width or height or no nodes in the flow, can't run the simulation!
      if (!nodesInitialized || forceNodes.length === 0) return forceSimOff
      let running = false
      try {
        simulation.nodes(forceNodes).force(
          'link',
          forceLink(forceEdges)
            .id((d: any) => d.id)
            .strength(0.05)
            .distance(42)
        )

        // The tick function is called every animation frame while the simulation is
        // running and progresses the simulation one step forward each time.
        const tick = () => {
          simulation.tick()
          setNodes(
            forceNodes.map((node: any) => ({
              ...node,
              position: { x: node.x, y: node.y },
            }))
          )
          window.requestAnimationFrame(() => {
            if (running) {
              tick()
            }
          })
        }

        const toggleForceLayout = (setForce?: boolean) => {
          if (typeof setForce === 'boolean') {
            running = setForce
          } else {
            running = !running
          }
          running && window.requestAnimationFrame(tick)
        }
        return [true, { toggleForceLayout, isForceRunning: running }]
      } catch (e) {
        console.warn(e)
      }
      return forceSimOff
    }, [nodesBeforeLayout])
  }

  const [forceInitialized, { toggleForceLayout, isForceRunning }] =
    useForceLayoutElements()

  // Prevents layout bugs from occurring on navigate away and returning to a graph
  // https://reactrouter.com/en/main/hooks/use-blocker
  useBlocker(
    useCallback(
      (tx: any) => tx.historyAction && toggleForceLayout(false),
      [toggleForceLayout]
    )
  )
  return (
    <>
      {/* TODO: Add loading screen fade out transition */}
      {!isSuccess && <h2 class='text-4xl text-slate-400'>LOADING...</h2>}
      {isSuccess && (
        <div className='h-screen w-screen' ref={graphRef}>
          <Graph
            onSelectionCtxMenu={onSelectionCtxMenu}
            onMultiSelectionCtxMenu={onMultiSelectionCtxMenu}
            onPaneCtxMenu={onPaneCtxMenu}
            onPaneClick={onPaneClick}
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            graphInstance={graphInstance}
            setGraphInstance={setGraphInstance}
            sendJsonMessage={sendJsonMessage}
            setPendingEntityPosition={setDropPosition}
          />

          {/* Overlay EntityOptions on top of the ReactFlow graph */}
          <div className='pointer-events-none absolute top-0 right-0 h-screen w-screen'>
            <OverlayMenus
              positionMode={positionMode}
              toggleForceLayout={toggleForceLayout}
              graph={graph}
              setElkLayout={setElkLayout}
              fitView={fitView}
              clearGraph={clearGraph}
            />

            <ContextMenu
              activeTransformLabel={activeTransformLabel}
              sendJsonMessage={sendJsonMessage}
              ctxSelection={ctxSelection}
              showMenu={showMenu}
              ctxPosition={ctxPosition}
              closeMenu={() => setShowMenu(false)}
            />
          </div>
        </div>
      )}
      {isSuccess && (
        <>
          {isError && <h2>Error</h2>}
          {isLoading && <RoundLoader />}
        </>
      )}
    </>
  )
}
