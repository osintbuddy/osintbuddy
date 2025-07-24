import { useCallback } from 'react'
import { getEdgeParams } from './utils'
import {
  BaseEdge,
  EdgeLabelRenderer,
  useStore,
  getBezierPath,
  Edge,
} from '@xyflow/react'

export default function FloatingEdge({
  id,
  source,
  target,
  markerEnd,
  style,
  label,
  selected,
  data,
}: Edge) {
  const sourceNode = useStore(
    useCallback((store) => store.nodeLookup.get(source), [source])
  )
  const targetNode = useStore(
    useCallback((store) => store.nodeLookup.get(target), [target])
  )

  if (!sourceNode || !targetNode) {
    return null
  }

  const {
    sx,
    sy,
    tx,
    ty,
    sourcePos: sourcePosition,
    targetPos: targetPosition,
  } = getEdgeParams(sourceNode, targetNode)

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX: sx,
    sourceY: sy,
    targetX: tx,
    targetY: ty,
    sourcePosition,
    targetPosition,
  })

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd as string}
        style={style}
        class='react-flow__edge-path'
      />

      <EdgeLabelRenderer>
        {/* data.isHighlighted will be true if the edge should be highlighted. */}

        <EdgeLabel
          label={(label as string)?.replace('_', ' ')}
          transform={`translate(-50%, -50%) translate(${labelX}px,${labelY}px)`}
        />
        {/* <div
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            borderRadius: 5,
            fontSize: 12,
            fontWeight: 700,
          }}
          className="nodrag nopan absolute  text-slate-400/95 p-1"
        >
          {label}
        </div> */}
      </EdgeLabelRenderer>
      {/* <path */}
      {/* /> */}
    </>
  )
}

function EdgeLabel({ transform, label }: { transform: string; label: string }) {
  // TODO: On select show edge toolbar (view/edit properties panel)
  // TODO: Implement draggable edge labels
  return (
    <>
      {label && (
        <div
          style={{ transform }}
          className='font-display pointer-events-auto absolute flex cursor-grab items-center justify-between rounded-xs bg-slate-950/30 p-px text-[0.6rem] leading-none font-semibold text-slate-400/50 backdrop-blur-xs hover:text-slate-400'
        >
          <p className='flex cursor-pointer items-center justify-between'>
            {label}
          </p>
        </div>
      )}
    </>
  )
}
