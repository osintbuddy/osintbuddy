import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getEdgeParams } from './utils'
import {
  BaseEdge,
  EdgeLabelRenderer,
  useStore,
  getBezierPath,
  Edge,
  useReactFlow,
} from '@xyflow/react'
import { GripIcon, Icon } from '@/components/icons'
import { useGraphFlowStore } from '@/app/store'
import useDraggableEdgeLabel from '@/hooks/useDraggableEdgeLabel'

const EMPTY_LABEL_SIZE = 10
const MAX_LABEL_SIZE = 32

export default function FloatingEdge({
  id,
  source,
  target,
  markerEnd,
  style,
  label,
  sourceHandle,
  targetHandle,
}: Edge) {
  const { positionMode } = useGraphFlowStore()
  const { updateEdge } = useReactFlow()

  const [showEdgePanel, setShowEdgePanel] = useState(false)
  const [edgeLabel, setEdgeLabel] = useState((label as string) ?? '')
  const edgeInputSize = useMemo(
    () =>
      edgeLabel.length <= 18
        ? edgeLabel.length === 0
          ? EMPTY_LABEL_SIZE
          : edgeLabel.length - 2
        : MAX_LABEL_SIZE,
    [edgeLabel]
  )
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
      })
    }
  }, [
    sourcePos,
    sourceNode,
    sourceHandle,
    targetPos,
    targetNode,
    targetHandle,
    positionMode,
  ])

  const [edgePathRef, draggableEdgeLabelRef] = useDraggableEdgeLabel(
    labelX,
    labelY,
    positionMode
  )

  useEffect(() => {
    const handleClickOutsideEdgePanel: EventListener = (event) => {
      if (!draggableEdgeLabelRef.current) {
        return
      }
      if (!draggableEdgeLabelRef.current.contains(event.target as Node)) {
        setShowEdgePanel(false)
      }
    }
    document.addEventListener('click', handleClickOutsideEdgePanel, true)
    return () => {
      document.removeEventListener('click', handleClickOutsideEdgePanel)
    }
  }, [])

  return (
    <>
      <path
        markerEnd={markerEnd as string}
        class='react-flow__edge-path'
        ref={edgePathRef}
        d={edgePath}
        style={{ ...style, strokeWidth: 2, stroke: '#373c8300' }}
      />
      <EdgeLabelRenderer>
        <div
          className='relative ml-4 flex max-w-30'
          ref={draggableEdgeLabelRef}
        >
          <div class='group relative'>
            <button
              title='Hold down shift to reposition this edge label'
              onMouseDown={() => setShowEdgePanel(false)}
              tabIndex={2}
              className='nopan nodrag pointer-events-auto relative flex items-center justify-center bg-transparent text-slate-700 opacity-20 transition-opacity duration-100 ease-in hover:bg-slate-950/10 hover:text-slate-600 hover:opacity-100 active:text-slate-600 active:opacity-100'
            >
              <Icon
                icon='grip-vertical'
                className='absolute mt-4 -ml-4 h-5.5 w-4.5 text-inherit'
              />
            </button>
            <input
              tabIndex={-1}
              value={edgeLabel.replace('_', ' ')}
              onBlur={(event) =>
                updateEdge(id, { label: event.currentTarget.value })
              }
              onChange={(event) => setEdgeLabel(event.currentTarget.value)}
              onFocus={() => setShowEdgePanel(true)}
              onMouseDown={(event) => !event.shiftKey && setShowEdgePanel(true)}
              placeholder='No label found'
              size={edgeInputSize}
              type='text'
              class='nopan nodrag hover:outline-mirage-500/70 focus:outline-primary-400 outline-mirage-600/10 pointer-events-auto absolute flex field-sizing-content max-w-30 !cursor-text items-center justify-center rounded-xs bg-slate-950/10 bg-gradient-to-br p-px px-1 text-[0.6rem] leading-none overflow-ellipsis text-slate-500 outline backdrop-blur-lg backdrop-brightness-95 transition-colors duration-75 ease-in placeholder:text-slate-800 hover:from-black/30 hover:to-black/25 hover:text-slate-400 hover:placeholder:text-slate-800 focus:bg-black/30 focus:from-black/30 focus:to-black/35 focus:text-slate-400 focus:placeholder:text-slate-800'
            />
            {showEdgePanel && (
              <div
                title='View and edit this edges properties'
                className={`nopan pointer-events-auto absolute -mt-5 items-end`}
              >
                <button
                  onClick={() => {
                    console.log('TODO: setShowVertexPropsPanel(true)')
                    setShowEdgePanel(false)
                  }}
                  class='bg-slate-925/10 hover:outline-primary/70 outline-mirage-950/70 focus:outline-mirage-500 ocus:text-danger-600 pointer-events-auto flex max-w-64 cursor-grab items-center justify-center rounded-xs bg-gradient-to-br from-black/10 to-black/15 p-px text-xs leading-none overflow-ellipsis text-slate-600 outline backdrop-blur-xs transition-colors duration-75 ease-in placeholder:text-slate-800 hover:bg-slate-950/70 hover:text-blue-600/90 hover:placeholder:text-slate-800 focus:bg-black/30 focus:from-black/30 focus:to-black/35 focus:text-blue-600/80 focus:placeholder:text-slate-800'
                >
                  <Icon icon='braces' className='h-3 w-3 p-px text-inherit' />
                </button>
              </div>
            )}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
