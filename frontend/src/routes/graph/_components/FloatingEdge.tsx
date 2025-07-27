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
import { useGraphFlowStore } from '@/app/store'
import useDraggableEdgeLabel from '@/hooks/useDraggableEdgeLabel'

const EMPTY_LABEL_SIZE = 10
const MAX_LABEL_SIZE = 26

function FloatingEdge({
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
  const edgeInputSize =
    edgeLabel.length <= MAX_LABEL_SIZE
      ? edgeLabel.length === 0
        ? EMPTY_LABEL_SIZE
        : edgeLabel.length - 2
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
  const [edgePathRef, draggableEdgeLabelRef] = useDraggableEdgeLabel(
    labelX,
    labelY,
    positionMode,
    edgePath
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
      document.removeEventListener('click', handleClickOutsideEdgePanel, true)
    }
  }, [draggableEdgeLabelRef])

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
          className='relative ml-4 flex max-w-32'
          ref={draggableEdgeLabelRef}
        >
          <div class='group relative'>
            <button
              title='Hold down shift to reposition this edge label'
              onMouseDown={() => setShowEdgePanel(false)}
              tabIndex={2}
              className='nopan nodrag pointer-events-auto relative flex items-center justify-center bg-transparent text-slate-700 opacity-20 transition-opacity duration-100 ease-in focus-within:text-slate-600 focus-within:opacity-100 hover:bg-slate-950/10 hover:text-slate-600 hover:opacity-100 focus:text-slate-600 focus:opacity-100 active:text-slate-600 active:opacity-100'
            >
              <Icon
                icon='grip-vertical'
                className='absolute mt-5.5 -ml-4 h-5.5 w-4.5 scale-125 text-inherit'
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
              class='nopan nodrag hover:outline-mirage-500/70 focus:outline-primary-400 outline-mirage-600/10 pointer-events-auto absolute flex field-sizing-content max-w-44 !cursor-text items-center justify-center rounded-xs bg-slate-950/10 bg-gradient-to-br p-px px-1 text-sm leading-none overflow-ellipsis text-slate-500 outline backdrop-blur-lg backdrop-brightness-95 transition-colors duration-75 ease-in placeholder:text-slate-800 hover:from-black/30 hover:to-black/25 hover:text-slate-400 hover:placeholder:text-slate-800 focus:bg-black/30 focus:from-black/30 focus:to-black/35 focus:text-slate-400 focus:placeholder:text-slate-800'
            />
            {showEdgePanel && (
              <div
                title='View and edit this edges properties'
                className={`nopan pointer-events-auto absolute -mt-8 items-end`}
              >
                <button
                  onClick={() => {
                    console.log('TODO: setShowVertexPropsPanel(true)')
                    setShowEdgePanel(false)
                  }}
                  class='bg-slate-925/10 hover:outline-primary/70 outline-mirage-950/70 focus:outline-mirage-500 ocus:text-danger-600 pointer-events-auto flex max-w-44 cursor-grab items-center justify-center rounded-xs bg-gradient-to-br from-black/10 to-black/15 p-1 leading-none overflow-ellipsis text-slate-600 outline backdrop-blur-xs transition-colors duration-75 ease-in placeholder:text-slate-800 hover:bg-slate-950/70 hover:text-blue-600/90 hover:placeholder:text-slate-800 focus:bg-black/30 focus:from-black/30 focus:to-black/35 focus:text-blue-600/80 focus:placeholder:text-slate-800'
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
    </>
  )
}

export default memo(FloatingEdge)
