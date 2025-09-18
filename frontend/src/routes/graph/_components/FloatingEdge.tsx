import { useCallback, useEffect, useMemo, useState, memo } from 'react'
import { getEdgeParams } from '../utils'
import {
  EdgeLabelRenderer,
  useStore,
  getBezierPath,
  Edge,
  useReactFlow,
} from '@xyflow/react'
import { Icon } from '@/components/icons'

const EMPTY_LABEL_SIZE = 10
const MAX_LABEL_SIZE = 26
interface EdgeProps extends Edge {
  setShowEdges: (set: boolean) => void
  showEdges: boolean
}
interface FloatingEdgeProps extends EdgeProps {
  sendJsonMessage: (data: any) => void
}
const zoomSelector = (s: any) => s.transform[2] >= 0.75

function FloatingEdge({
  id,
  source,
  target,
  markerEnd,
  style,
  sourceHandle,
  targetHandle,
  showEdges = false,
  data,
  sendJsonMessage,
}: FloatingEdgeProps) {
  if (showEdges) return null
  const { updateEdge } = useReactFlow()
  const showEdgeLabel = useStore(zoomSelector)
  const [showEdgePanel, setShowEdgePanel] = useState(false)
  const [edgeLabel, setEdgeLabel] = useState((data?.label ?? '') as string)
  const edgeInputSize =
    edgeLabel.length <= MAX_LABEL_SIZE
      ? edgeLabel.length === 0
        ? EMPTY_LABEL_SIZE
        : edgeLabel.length + 2
          ? edgeLabel.length
          : 10
      : MAX_LABEL_SIZE
  const sourceNode = useStore(
    useCallback((store) => store.nodeLookup.get(source), [source])
  )
  const targetNode = useStore(
    useCallback((store) => store.nodeLookup.get(target), [target])
  )

  const edgeParams = useMemo(() => {
    if (!sourceNode || !targetNode) return null
    return getEdgeParams(sourceNode, targetNode)
  }, [sourceNode, targetNode])

  const pathData = useMemo(() => {
    if (!edgeParams) return null
    const { sx, sy, tx, ty, sourcePos, targetPos } = edgeParams
    const [edgePath, labelX, labelY] = getBezierPath({
      sourceX: sx,
      sourceY: sy,
      targetX: tx,
      targetY: ty,
      sourcePosition: sourcePos,
      targetPosition: targetPos,
    })
    return { edgePath, labelX, labelY, sourcePos, targetPos }
  }, [edgeParams])

  if (!edgeParams || !pathData) {
    return null
  }

  const { edgePath, labelX, labelY, sourcePos, targetPos } = pathData

  useEffect(() => {
    const sourceNodeHandle = sourceNode?.internals?.handleBounds?.source?.find(
      ({ position }) => position === sourcePos
    )
    const targetNodeHandle = targetNode?.internals?.handleBounds?.source?.find(
      ({ position }) => position === targetPos
    )
    if (
      sourceNodeHandle &&
      targetNodeHandle &&
      (sourceNodeHandle.id !== sourceHandle ||
        targetNodeHandle.id !== targetHandle)
    ) {
      updateEdge(id, {
        sourceHandle: sourceNodeHandle.id,
        targetHandle: targetNodeHandle.id,
      })
    }
  }, [
    id,
    sourcePos,
    sourceNode,
    sourceHandle,
    targetPos,
    targetNode,
    targetHandle,
    updateEdge,
  ])

  const pathStyle = useMemo(
    () => ({
      ...style,
      strokeWidth: 2,
      stroke: '#373c8300',
    }),
    [style]
  )

  const handleOnBlur = useCallback(
    (event: any) => {
      const label = event.currentTarget?.value
      updateEdge(id, { data: { label } })
      sendJsonMessage({
        action: 'update:edge',
        edge: {
          id,
          source,
          target,
          data: { ...data, label },
        },
      })
    },
    [updateEdge]
  )
  return (
    <>
      <path
        markerEnd={markerEnd as string}
        class='react-flow__edge-path'
        d={edgePath}
        style={pathStyle}
      />
      {showEdgeLabel && (
        <EdgeLabelRenderer>
          <div
            className='relative flex max-w-32'
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            }}
          >
            <div class='group relative'>
              <input
                tabIndex={-1}
                value={edgeLabel}
                onBlur={handleOnBlur}
                onChange={(event) => setEdgeLabel(event.currentTarget.value)}
                onFocus={() => setShowEdgePanel(true)}
                onMouseDown={() => setShowEdgePanel(true)}
                placeholder='No label found'
                size={edgeInputSize}
                type='text'
                class='nopan nodrag hover:outline-mirage-500/70 focus:outline-primary-400 outline-mirage-600/10 pointer-events-auto absolute flex field-sizing-content max-w-44 !cursor-text items-center justify-center rounded-xs bg-slate-950/20 bg-gradient-to-br p-px px-1 text-sm leading-none overflow-ellipsis text-slate-500 outline backdrop-blur-lg backdrop-brightness-95 ease-in placeholder:text-slate-800 hover:from-black/30 hover:to-black/25 hover:text-slate-400 hover:placeholder:text-slate-800 focus:bg-black/30 focus:from-black/30 focus:to-black/35 focus:text-slate-400 focus:placeholder:text-slate-800'
              />
              {showEdgePanel && (
                <div
                  title='View and edit this edges properties'
                  className={`nopan pointer-events-auto absolute -mt-8 items-end`}
                >
                  <button
                    onClick={() => setShowEdgePanel(false)}
                    class='bg-slate-925/10 hover:outline-primary/70 outline-mirage-950/70 focus:outline-mirage-500 ocus:text-danger-600 pointer-events-auto flex max-w-44 cursor-grab items-center justify-center rounded-xs bg-gradient-to-br from-black/10 to-black/15 p-1 leading-none overflow-ellipsis text-slate-600 outline backdrop-blur-xs ease-in placeholder:text-slate-800 hover:bg-slate-950/70 hover:text-blue-600/90 hover:placeholder:text-slate-800 focus:bg-black/30 focus:from-black/30 focus:to-black/35 focus:text-blue-600/80 focus:placeholder:text-slate-800'
                  >
                    <Icon
                      icon='braces'
                      className='h-4.5 w-4.5 p-px text-inherit'
                    />
                  </button>
                </div>
              )}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

export default memo(FloatingEdge)
