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
import { Icon } from '@/components/icons'
import { useGraphFlowStore } from '@/app/store'

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
  data,
}: Edge) {
  const { removeEdge } = useGraphFlowStore()
  const [showEdgePanel, setShowEdgePanel] = useState(false)
  const [edgeLabel, setEdgeLabel] = useState((label as string) ?? '')
  const inputSize = useMemo(
    () =>
      edgeLabel.length <= 18
        ? edgeLabel.length === 0
          ? EMPTY_LABEL_SIZE
          : edgeLabel.length
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
  console.log(showEdgePanel)
  const panelCancelRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const handler: EventListener = (event) => {
      if (!panelCancelRef.current) {
        return
      }
      // if click was not inside of the element. "!" means not
      // in other words, if click is outside the modal element
      if (!panelCancelRef.current.contains(event.target as Node)) {
        setShowEdgePanel(false)
      }
    }
    // the key is using the `true` option
    // `true` will enable the `capture` phase of event handling by browser
    document.addEventListener('click', handler, true)
    return () => {
      document.removeEventListener('click', handler)
    }
  }, [])
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
          <div id='FAK' className=''>
            <div className='absolute z-20 h-screen w-screen'></div>
            <div id='fkme' class='group flex items-center justify-between'>
              <input
                ref={panelCancelRef}
                onClick={() => setShowEdgePanel(true)}
                value={edgeLabel.replace('_', ' ')}
                onBlur={(event) =>
                  updateEdge(id, { label: event.currentTarget.value })
                }
                onChange={(event) => {
                  setEdgeLabel(event.currentTarget.value)
                }}
                placeholder='No label found'
                size={inputSize}
                type='text'
                class='nopan hover:outline-mirage-500/70 outline-mirage-600/10 pointer-events-auto absolute flex field-sizing-content max-w-30 cursor-grab items-center justify-center rounded-xs bg-slate-950/20 bg-gradient-to-br p-px px-1 text-[0.6rem] leading-none overflow-ellipsis text-slate-600 outline backdrop-blur-sm transition-colors duration-75 ease-in placeholder:text-slate-800 hover:from-black/30 hover:to-black/25 hover:text-slate-400 hover:placeholder:text-slate-800 focus:bg-black/30 focus:from-black/30 focus:to-black/35 focus:text-slate-400 focus:placeholder:text-slate-800'
                style={{
                  transform: `translate(-50%, 0%) translate(${labelX}px,${labelY}px)`,
                }}
              />
              <div
                title='Edit relationship properties'
                className={`nopan pointer-events-auto absolute -left-[3.15rem] mt-12 flex origin-bottom-right ${!showEdgePanel && 'invisible hidden'}`}
              >
                <button
                  style={{
                    transform: `translate(${labelX}px,${labelY}px)`,
                  }}
                  onClick={() => console.log('TODO')}
                  class='bg-slate-925/60 hover:outline-mirage-500/70 outline-mirage-950/70 focus:outline-mirage-500 ocus:text-danger-600 pointer-events-auto flex field-sizing-content max-w-30 cursor-grab items-center justify-center rounded-l-xs bg-gradient-to-br from-black/10 to-black/15 pl-1 text-[0.45rem] leading-none overflow-ellipsis text-slate-600 outline backdrop-blur-sm transition-colors duration-75 ease-in placeholder:text-slate-800 hover:bg-slate-950/70 hover:text-blue-600 hover:placeholder:text-slate-800 focus:bg-black/30 focus:from-black/30 focus:to-black/35 focus:text-blue-600/85 focus:placeholder:text-slate-800'
                >
                  Properties
                  <Icon
                    icon='braces'
                    className='mx-0.5 h-3.5 w-3.5 p-0.5 text-inherit'
                  />
                </button>
                <button
                  title={`Delete ${label} relationship`}
                  style={{
                    transform: `translate(${labelX}px,${labelY}px)`,
                  }}
                  onClick={() => removeEdge(id)}
                  class='hover:text-danger-500 bg-slate-925/60 hover:outline-mirage-500/70 outline-mirage-950/70 focus:outline-mirage-500 focus:text-danger-600 x pointer-events-auto flex field-sizing-content max-w-30 cursor-grab items-center justify-center rounded-r-xs bg-gradient-to-br from-black/10 to-black/15 pl-1 text-[0.45rem] leading-none overflow-ellipsis text-slate-600 outline backdrop-blur-sm transition-colors duration-75 ease-in placeholder:text-slate-800 hover:bg-slate-950/70 hover:placeholder:text-slate-800 focus:bg-black/30 focus:from-black/30 focus:to-black/35 focus:placeholder:text-slate-800'
                >
                  Delete
                  <Icon
                    icon='trash'
                    className='mx-0.5 h-3.5 w-3.5 p-0.5 text-inherit'
                  />
                </button>
              </div>
            </div>
          </div>
        </EdgeLabelRenderer>
      </BaseEdge>
    </>
  )
}
