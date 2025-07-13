import { Icon } from '@/components/icons'
import { useState, useEffect } from 'preact/hooks'
import Input from '@/components/inputs'
import { useEntitiesStore, useGraphFlowStore } from '@/app/store'
import { CtxPosition } from '..'

export interface ContextMenuProps {
  closeMenu: () => void
  position: CtxPosition
  sendJsonMessage: (message: any) => void
  selection: any
}

export default function ContextMenu({
  closeMenu,
  position,
  selection,
  sendJsonMessage,
}: ContextMenuProps) {
  const { transforms, fetchTransforms, isLoadingTransforms, clearTransforms } =
    useEntitiesStore()
  const { removeNode } = useGraphFlowStore()
  const [query, setQuery] = useState('')

  // Fetch transforms when selection changes and has a valid label
  useEffect(() => {
    if (selection?.data?.label) {
      fetchTransforms(selection.data.label)
    } else clearTransforms()
  }, [selection?.data?.label, fetchTransforms])
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
        style={{ ...position }}
      >
        <div className='divide-mirage-950 border-mirage-950 absolute right-0 z-10 w-56 origin-top-right divide-y rounded-md border bg-gradient-to-br from-black/60 to-black/70 py-px shadow-2xl ring-1 shadow-black/25 ring-black/5 backdrop-blur-xl focus:outline-hidden'>
          <div className='group font-display flex items-center px-1.5 py-1 text-xs font-medium text-slate-800'>
            <span className='font-display mr-1 font-semibold text-slate-800/70'>
              ID:{' '}
            </span>
            {selection?.id ? selection.id : '???'}
          </div>
          {selection && (
            <Input.TransparentIcon
              onChange={(e) => setQuery(e.currentTarget.value)}
              className='h-8 !rounded-none !px-1.5 !py-1 !outline-none'
              icon={<Icon icon='search' className='relative right-0 h-4 w-4' />}
            />
          )}
          {transforms && !isLoadingTransforms && (
            <div className='border-mirage-950 flex flex-col items-start divide-slate-400 overflow-y-scroll text-sm'>
              {filteredTransforms.map((transform: any) => (
                <button
                  key={transform.label}
                  onClick={(e) => {
                    e.preventDefault()
                    closeMenu()
                    sendJsonMessage({
                      action: 'transform:entity',
                      entity: {
                        id: selection.id,
                        type: selection.data?.label,
                        data: selection.data,
                        position: selection.position,
                        transform: transform.label,
                      },
                    })
                  }}
                  class='hover:border-primary-350 flex w-full items-center border-l-2 border-transparent px-2 py-1 text-slate-600 hover:bg-black/40 hover:text-slate-400'
                >
                  <Icon icon={transform.icon} className='mr-1.5 h-4 w-4'></Icon>
                  {transform.label}
                </button>
              ))}
              {transforms?.length === 0 && (
                <p class='relative mt-auto px-2 py-1 text-sm text-slate-600'>
                  {selection?.id
                    ? 'No transforms found!'
                    : 'No entity selected!'}
                </p>
              )}
            </div>
          )}
          {isLoadingTransforms && (
            <p class='relative mt-auto flex w-full px-2 py-1 text-sm text-slate-600'>
              Loading transforms
              <span class='dot-flashing top-3.5 left-2' />
            </p>
          )}

          {selection?.data?.label && (
            <button
              className='hover:text-danger-500 group flex w-full items-center px-2.5 py-1 text-sm text-slate-600 hover:bg-black/40'
              onClick={() => {
                closeMenu()
                sendJsonMessage({
                  action: 'delete:entity',
                  entity: { id: Number(selection.id) },
                })
                removeNode(selection.id)
              }}
              type='button'
            >
              <Icon
                icon='trash'
                className='group-hover:text-danger-500 mr-1.5 h-4 w-4'
              />
              Delete
            </button>
          )}
        </div>
      </div>
    </>
  )
}
