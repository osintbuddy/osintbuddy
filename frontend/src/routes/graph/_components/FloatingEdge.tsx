import { useCallback, useEffect, useMemo, useState } from 'react'
import { getEdgeParams } from './utils'
import {
  BaseEdge,
  EdgeLabelRenderer,
  useStore,
  getBezierPath,
  Edge,
  useReactFlow,
} from '@xyflow/react'
import { Icon } from '@/components/icons'
import { useGraphFlowStore } from '@/app/store'

export default function FloatingEdge({
  id,
  source,
  target,
  markerEnd,
  style,
  label,
  sourceHandle,
  targetHandle,
  data,
}: Edge) {
  const { removeEdge } = useGraphFlowStore()
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
  const { updateEdge } = useReactFlow()

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
      (sourceNodeHandle?.id !== sourceHandle ||
        targetNodeHandle.id !== targetHandle)
    ) {
      updateEdge(id, {
        sourceHandle: sourceNodeHandle?.id,
        targetHandle: targetNodeHandle?.id,
        label: 'new',
      })
    }
  }, [sourcePos, sourceNode, sourceHandle, targetPos, targetNode, targetHandle])
  // console.log('FE sN tN', sourceNode, targetNode)
  // console.log('FE s t', sourceHandle, targetHandle)
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX: sx,
    sourceY: sy,
    targetX: tx,
    targetY: ty,
    sourcePosition: sourcePos,
    targetPosition: targetPos,
  })

  const [edgeLabel, setEdgeLabel] = useState((label as string) ?? '')
  const inputSize = useMemo(
    () =>
      edgeLabel.length <= 18
        ? edgeLabel.length === 0
          ? 10
          : edgeLabel.length
        : 20,
    [edgeLabel]
  )

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd as string}
        style={style}
        class='react-flow__edge-path'
      >
        <EdgeLabelRenderer>
          <div class='group pointer-events-auto relative flex items-center justify-between'>
            <input
              value={edgeLabel}
              onBlur={(event) =>
                updateEdge(id, { label: event.currentTarget.value })
              }
              onChange={(event) => {
                setEdgeLabel(event.currentTarget.value)
              }}
              placeholder='No label found'
              size={inputSize}
              type='text'
              class='nopan hover:outline-mirage-500/70 outline-mirage-600/45 focus-visible:outline-primary pointer-events-auto absolute flex field-sizing-content max-w-30 cursor-grab items-center justify-center rounded-xs bg-slate-950/20 bg-gradient-to-br p-px px-1 text-[0.6rem] leading-none overflow-ellipsis text-slate-600 outline backdrop-blur-sm transition-colors duration-200 ease-in placeholder:text-slate-800 hover:from-black/30 hover:to-black/40 hover:text-slate-400 hover:placeholder:text-slate-800 focus:bg-black/30 focus:from-black/30 focus:to-black/40 focus:text-slate-400 focus:placeholder:text-slate-800'
              style={{
                transform: `translate(-50%, 0%) translate(${labelX}px,${labelY}px)`,
              }}
            />
            <button
              style={{
                transform: `translate(-50%, -105%) translate(${labelX}px,${labelY}px)`,
              }}
              onClick={() => removeEdge(id)}
              class='hover:text-danger bg-slate-925/60 hover:border-danger pointer-events-auto absolute flex items-center justify-center rounded-full border border-slate-900 p-px text-slate-600 opacity-0 backdrop-blur-xs transition-colors duration-75 ease-in group-hover:opacity-100 hover:bg-slate-950/70'
            >
              <Icon icon='trash' className='h-3 w-3 p-0.5 text-inherit' />
            </button>
          </div>
        </EdgeLabelRenderer>
      </BaseEdge>
    </>
  )
}
