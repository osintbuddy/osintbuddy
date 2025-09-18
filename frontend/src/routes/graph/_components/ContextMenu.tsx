import { Icon } from '@/components/icons'
import { useState, useEffect, useCallback, useMemo } from 'preact/hooks'
import Input from '@/components/inputs'
import { useEntitiesStore, useFlowStore } from '@/app/store'
import { toSnakeCase } from '../utils'
import { CtxPosition } from '..'
import { toast } from 'react-toastify'

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
  const { transforms, fetchTransforms, isLoadingTransforms } =
    useEntitiesStore()
  const { removeEntity: removeNode } = useFlowStore()
  const [query, setQuery] = useState('')

  const handleCtxMenuIdClick = useCallback(() => {
    if (selection?.id) {
      navigator.clipboard.writeText(selection.id)
      toast.info(`We copied this entity id to your clipboard! ${selection.id}`)
    }
  }, [])

  const filteredTransforms = useMemo(
    () =>
      query
        ? transforms[selection?.data?.label].filter((transform: any) =>
            transform.label.toLowerCase().includes(query.toLowerCase())
          )
        : (transforms[selection?.data?.label] ?? []),
    [transforms, selection?.data?.label]
  )

  // Fetch transforms if ctx selection change
  useEffect(() => {
    if (selection?.data?.label) fetchTransforms(selection.data.label)
  }, [selection?.data?.label, fetchTransforms])
  return (
    <>
      <div
        id='context-menu'
        className='absolute z-[999] inline-block text-left'
        style={{ ...position }}
      >
        <div className='divide-mirage-950 border-mirage-950 absolute right-0 z-10 w-56 origin-top-right divide-y rounded-md border bg-gradient-to-br from-black/60 to-black/70 py-px shadow-2xl ring-1 shadow-black/25 ring-black/5 backdrop-blur-xl focus:outline-hidden'>
          <button
            title='Click to copy ID'
            onClick={handleCtxMenuIdClick}
            className='group font-display flex items-center px-1.5 py-1 text-xs font-medium text-slate-800'
          >
            <span className='font-display mr-1 font-semibold text-slate-800'>
              ID:{' '}
            </span>
            {selection?.id ? selection.id.toUpperCase().slice(0, 8) : '?!'}
          </button>
          {selection && (
            <Input.AltIcon
              onChange={(e) => setQuery(e.currentTarget.value)}
              className='h-8 !rounded-none !px-1.5 !py-1 !outline-none'
              icon={<Icon icon='search' className='relative right-0 h-4 w-4' />}
            />
          )}
          {!selection?.id && (
            <p class='relative mt-auto px-2 py-1 text-sm text-slate-600'>
              No entity selected!
            </p>
          )}
          {transforms[selection?.data?.label] &&
            !isLoadingTransforms &&
            selection?.id && (
              <div className='border-mirage-950 cursor flex min-h-[115px] flex-col items-start divide-slate-400 overflow-y-scroll text-sm'>
                {filteredTransforms.map((transform: any) => (
                  <button
                    key={transform.label}
                    onClick={(e) => {
                      e.preventDefault()
                      closeMenu()
                      // Build a clean data payload for the backend.
                      // 1) Start from node.data
                      const rawData = { ...(selection?.data || {}) }
                      // 2) Remove UI-only fields
                      if ('elements' in rawData)
                        delete (rawData as any).elements
                      // 3) Migrate any stray top-level fields into data (e.g. "CSE Categories")
                      const knownTop = new Set([
                        'id',
                        'data',
                        'type',
                        'position',
                        'measured',
                        'selected',
                        'dragging',
                        'width',
                        'height',
                        'zIndex',
                        'sourcePosition',
                        'targetPosition',
                        'style',
                      ])
                      Object.keys(selection || {}).forEach((k) => {
                        if (!knownTop.has(k) && selection[k] != null) {
                          const key = toSnakeCase(k)
                          if (rawData[key] == null) rawData[key] = selection[k]
                        }
                      })
                      const payload = {
                        action: 'transform:entity',
                        entity: {
                          id: selection.id,
                          type: selection.data?.label,
                          data: rawData,
                          position: selection.position,
                          transform: transform.label,
                        },
                      }
                      console.log('transform sending', selection, payload)
                      sendJsonMessage(payload)
                      toast.loading(
                        `Transforming ${transform.label.toLowerCase()}. Please wait...`,
                        {
                          closeButton: true,
                          isLoading: true,
                          toastId: selection.id,
                        }
                      )
                    }}
                    class='hover:border-primary-350 flex w-full items-center border-l-2 border-transparent px-2 py-1 text-slate-600 hover:bg-black/40 hover:text-slate-400'
                  >
                    <Icon
                      icon={transform.icon}
                      className='mr-1.5 h-4 w-4'
                    ></Icon>
                    {transform.label}
                  </button>
                ))}

                {filteredTransforms?.length === 0 && (
                  <p class='relative px-2 py-1 text-sm text-slate-600'>
                    {selection?.id ? 'No transforms found!' : ''}
                  </p>
                )}
              </div>
            )}
          {isLoadingTransforms && (
            <div class='flex min-h-[115px] flex-col'>
              <p class='relative flex w-full px-2 py-1 text-sm text-slate-600'>
                Loading transforms
                <span class='dot-flashing top-3.5 left-2' />
              </p>
            </div>
          )}

          {selection?.data?.label && (
            <button
              className='hover:text-danger-500 group flex w-full items-center px-2.5 py-1 text-sm text-slate-600 hover:bg-black/40'
              onClick={() => {
                closeMenu()
                sendJsonMessage({
                  action: 'delete:entity',
                  entity: { id: selection.id },
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
