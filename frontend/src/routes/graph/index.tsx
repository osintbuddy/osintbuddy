import { useState, useRef, useEffect, useMemo, useCallback } from 'preact/hooks'
import { FitViewOptions, Node, ReactFlowInstance } from '@xyflow/react'
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
import OverlayMenus from './_components/OverlayMenus'
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

export default function GraphInquiry() {
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
    clearGraph()
    getGraph(hid as string)
  }, [])

  const isSuccess = !isLoading && !isError && graph

  useEffect(() => {
    setPositionMode('manual')
  }, [graph?.id])

  const graphRef = useRef<HTMLDivElement>(null)
  const [graphInstance, setGraphInstance] = useState<ReactFlowInstance>()
  const { lastJsonMessage, sendJsonMessage }: UseWebsocket = useWebSocket(
    `ws://${WS_URL}/graph/${hid}/ws`,
    {
      shouldReconnect: () => true,
      retryOnError: true,
      onOpen: () =>
        sendJsonMessage({
          action: 'auth',
          token: access_token,
        }),
      onClose: () => {
        clearGraph()
        toast.update('loadingToast', {
          render: `The connection was lost! Attempting to reconnect...'}`,
          type: 'warning',
          isLoading: false,
          autoClose: 1400,
        })
      },
    }
  )

  const fitView = useCallback(
    (fitViewOptions?: FitViewOptions) => {
      if (graphInstance?.fitView) graphInstance.fitView(fitViewOptions)
    },
    [graphInstance]
  )

  // Handle any actions the websocket sends
  const socketActions: SocketActions = {
    authenticated: (data) => {
      toast.loading('Please wait while we load your graph...', {
        closeButton: true,
        isLoading: true,
        toastId: 'graph',
      })
      setPlugins(data.plugins)
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
    },
    loading: (data) => {
      const notification = data?.notification
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
    },
    error: (data) => toast.error(`${data.message}`),
  }

  useEffect(() => {
    let action: ActionTypes = lastJsonMessage?.action
    if (action && socketActions[action]) socketActions[action](lastJsonMessage)
  }, [lastJsonMessage])

  const [nodesBeforeLayout, setNodesBeforeLayout] = useState(nodes)
  const [edgesBeforeLayout, setEdgesBeforeLayout] = useState(edges)
  const [ctxMenu, setCtxMenu] = useState<CtxMenu | null>(null)

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

  const [, { toggleForceLayout }] = useForceLayoutElements()

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
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            graphInstance={graphInstance}
            setGraphInstance={setGraphInstance}
            sendJsonMessage={sendJsonMessage}
            ctxMenu={ctxMenu}
            setCtxMenu={setCtxMenu}
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
