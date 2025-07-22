import { useCallback } from 'react'

import { getEdgeParams } from './utils'
import { Icon } from '@/components/icons'
import {
  BaseEdge,
  EdgeLabelRenderer,
  useStore,
  getBezierPath,
} from '@xyflow/react'

function EdgeLabel({ transform, label }: { transform: string; label: string }) {
  // TODO: On click open properties panel the edge can be updated by
  return (
    <>
      {label && (
        <div
          style={{ transform }}
          className='font-display pointer-events-auto absolute flex cursor-grab items-center justify-between rounded-xs bg-slate-950/30 p-px text-[0.6rem] leading-none font-semibold text-slate-400/50 backdrop-blur-xs hover:text-slate-400'
        >
          <p className='flex cursor-pointer items-center justify-between'>
            {label}{' '}
          </p>
        </div>
      )}
    </>
  )
}

function SimpleFloatingEdge({
  id,
  source,
  target,
  markerEnd,
  style,
  label,
}: JSONObject) {
  const sourceNode = useStore(
    useCallback((store) => store.nodeLookup.get(source), [source])
  )
  const targetNode = useStore(
    useCallback((store) => store.nodeLookup.get(target), [target])
  )

  if (!sourceNode || !targetNode) {
    return null
  }

  const { sx, sy, tx, ty, sourcePos, targetPos } = getEdgeParams(
    sourceNode,
    targetNode
  )

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX: sx,
    sourceY: sy,
    sourcePosition: sourcePos,
    targetPosition: targetPos,
    targetX: tx,
    targetY: ty,
  })
  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          cursor: 'grab',
        }}
      />

      <EdgeLabelRenderer>
        <EdgeLabel
          label={label?.replace('_', ' ')}
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

export default SimpleFloatingEdge
