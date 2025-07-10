import { Icon } from '@/components/icons'
import { useState } from 'preact/hooks'
import Input from '@/components/inputs'
import { XYPosition } from '@xyflow/react'

import { toast } from 'react-toastify'
import { useParams } from 'react-router-dom'
import { Node } from '@xyflow/react'
import { useGraphFlowStore } from '@/app/store'
import { useId } from 'preact/compat'

interface Transform {
  label: string
}

interface ContextActionProps {
  nodeCtx: Node | null
  transforms: Transform[]
  sendJsonMessage: Function
  closeMenu: Function
}

function ContextAction({
  nodeCtx: ctx,
  transforms,
  sendJsonMessage,
  closeMenu,
}: ContextActionProps) {
  const { hid } = useParams()
  // const [runTransform, { isLoading }] = useRunEntityTransformMutation()
  const { addNode, addEdge } = useGraphFlowStore()

  const createEntityAction = ({ data, id, position, parentId }: any) => {
    const edgeId = useId()
    addNode({ id, data, position, type: 'edit' })
    addEdge({
      source: parentId,
      target: id,
      sourceHandle: 'r1',
      targetHandle: 'l2',
      type: 'float',
      id: edgeId,
    })
  }

  return (
    <>
      {transforms && ctx && (
        <>
          <div className='node-context max-h-32 overflow-y-scroll'>
            {transforms.map((transform: any) => (
              <div key={transform.label}>
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    closeMenu()
                    // runTransform({
                    //   hid: hid ?? '',
                    //   sourceEntity: {
                    //     id: ctx?.id,
                    //     type: ctx?.label,
                    //     data: ctx?.data,
                    //     position: ctx?.position,
                    //     transform: transform?.label,
                    //   },
                    // })
                    //   .then((resp: any) => {
                    //     const entities = resp.data.map(
                    //       (node: JSONObject, idx: number) => {
                    //         let entity = { ...node }
                    //         // TODO: Move position layout logic to backend...
                    //         const isOdd = idx % 2 === 0
                    //         const pos = node.position
                    //         const x = isOdd ? pos.x + 560 : pos.x + 970
                    //         const y = isOdd
                    //           ? pos.y - (idx - 4) * 120
                    //           : pos.y - (idx - 3.5) * 120
                    //         entity.position = {
                    //           x,
                    //           y,
                    //         }
                    //         return entity
                    //         // sendJsonMessage({ action: 'update:entity', node: { id: Number(node.id), x, y } });
                    //       }
                    //     )
                    //     entities.forEach((entity: any) => {
                    //       createEntityAction(entity)
                    //       sendJsonMessage({
                    //         action: 'update:entity',
                    //         node: {
                    //           id: Number(entity.id),
                    //           x: entity.position.x,
                    //           y: entity.position.y,
                    //         },
                    //       })
                    //     })
                    //   })
                    //   .catch((err) => console.log(err))
                    // sendJsonMessage({
                    //   action: 'transform:node',
                    //   node: {
                    //     id: ctx.id,
                    //     type: ctx.label,
                    //     data: ctx.data,
                    //     position: ctx.position,
                    //     transform: transform.label,
                    //   },
                    // })
                    toast.warn('TODO: ')
                  }}
                >
                  <Icon icon={transform.icon}></Icon>
                  {transform.label}
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  )
}

export interface ContextMenuProps {
  closeMenu: () => void
  position: XYPosition
  sendJsonMessage: (message: any) => void
  selection: any
}

export default function ContextMenu({
  closeMenu,
  position,
  selection,
  sendJsonMessage,
}: ContextMenuProps) {
  const ctxPosition = {
    top: position.y,
    left: position.x,
  }

  // TODO: Replace with proper API call using Zustand store
  const transforms: any = []

  const [query, setQuery] = useState('')
  const filteredTransforms = query
    ? transforms.filter((transform: any) =>
        transform.label.toLowerCase().includes(query.toLowerCase())
      )
    : (transforms ?? [])
  return (
    <>
      <div
        id='context-menu'
        className='absolute z-[999] inline-block text-left'
        style={ctxPosition}
      >
        <div className='divide-mirage-950 border-mirage-950 absolute right-0 z-10 w-56 origin-top-right divide-y rounded-md border bg-gradient-to-br from-black/60 to-black/70 py-px shadow-2xl ring-1 shadow-black/25 ring-black/5 backdrop-blur-xl focus:outline-hidden'>
          <div className='group font-display flex items-center px-1.5 py-1 text-xs font-medium text-slate-600'>
            <span className='font-display mr-1 font-semibold text-slate-800'>
              ID:{' '}
            </span>
            {selection?.id ? selection.id : '???'}
          </div>
          {transforms && (
            <div>
              {selection && (
                <Input.TransparentIcon
                  className='h-8 !rounded-none !px-1.5 !py-1 !outline-none'
                  icon={
                    <Icon icon='search' className='relative right-0 h-4 w-4' />
                  }
                />
              )}
              <ContextAction
                closeMenu={closeMenu}
                nodeCtx={selection}
                sendJsonMessage={sendJsonMessage}
                transforms={filteredTransforms}
              />
            </div>
          )}
          {transforms?.length === 0 && (
            <p class='px-2 py-1 text-sm text-slate-600'>
              {selection?.id ? 'No transforms found!' : 'No entity selected!'}
            </p>
          )}
          {selection?.data?.label && (
            <button
              className='hover:text-danger-500 group hover:bg-mirage-950/10 flex w-full items-center px-1.5 py-1 text-sm text-slate-600'
              onClick={() => {
                closeMenu()
                sendJsonMessage({
                  action: 'delete:node',
                  node: { id: selection.id },
                })
              }}
              type='button'
            >
              <Icon
                icon='trash'
                className='group-hover:text-danger-500 mr-1.5 h-4 w-4'
                aria-hidden='true'
              />
              Delete
            </button>
          )}
        </div>
      </div>
    </>
  )
}
