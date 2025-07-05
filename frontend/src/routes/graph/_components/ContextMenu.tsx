import { Icon } from '@/components/icons'
import ContextAction from './ContextAction'
import { useState } from 'react'

export default function ContextMenu({
  closeMenu,
  showMenu,
  ctxPosition: position,
  ctxSelection,
  sendJsonMessage,
  activeTransformLabel,
}: JSONObject) {
  const dispatch = useAppDispatch()

  const ctxPosition = {
    top: position.y,
    left: position.x,
  }

  const {
    data: transforms = [],
    isLoading: isLoadingTransforms,
    isError: isTransformsError,
    isSuccess: isTransformsSuccess,
  } = useGetEntityTransformsQuery(
    { label: activeTransformLabel as string },
    { skip: activeTransformLabel === null }
  )

  const [query, setQuery] = useState('')
  const filteredTransforms = query
    ? transforms.filter((transform: any) =>
        transform.label.toLowerCase().includes(query.toLowerCase())
      )
    : (transforms ?? [])
  return (
    <>
      <div id='context-menu' className='absolute z-[999]' style={ctxPosition}>
        {showMenu && (
          <div className='relative z-50 inline-block text-left'>
            <div className='border-mirage-400/70 divide-mirage-400/70 to-mirage-700/95 from-mirage-600/95 absolute right-0 z-10 mt-2 w-56 origin-top-right divide-y rounded-md border bg-gradient-to-br shadow-lg ring-1 ring-black/5 focus:outline-hidden'>
              <div className='py-1'>
                <div>
                  <div className='group font-display flex items-center py-2 text-sm text-slate-400'>
                    <span className='font-display mr-3 pl-2 font-semibold text-slate-600'>
                      ID:{' '}
                    </span>
                    {ctxSelection?.id ? ctxSelection.id : 'No node selected'}
                  </div>
                </div>
              </div>
              {transforms && (
                <>
                  {ctxSelection && (
                    <div className=' '>
                      <div>
                        <div className='sm:col-span-2'>
                          <label
                            htmlFor='message'
                            className='sr-only mt-4 block pl-8 leading-6 font-semibold text-slate-200'
                          >
                            Search through the installed transforms for the{' '}
                            {ctxSelection?.label} plugin
                          </label>
                          <div className='hover:border-mirage-200/40 to-mirage-400/50 from-mirage-300/20 focus-within:!border-primary/40 border-mirage-400/20 ring-light-900/10 focus-within:from-mirage-400/20 focus-within:to-mirage-400/30 mx-4 mt-2.5 mb-2 block items-center justify-between rounded border bg-gradient-to-br px-3.5 py-1 text-slate-100 shadow-sm transition-colors duration-200 ease-in-out focus-within:bg-gradient-to-l'>
                            <input
                              value={query}
                              onChange={(e) => setQuery(e.currentTarget.value)}
                              name='message'
                              id='message'
                              className='block w-full bg-transparent outline-hidden placeholder:text-slate-700 sm:text-sm'
                              placeholder='Search transforms...'
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <ContextAction
                    closeMenu={closeMenu}
                    nodeCtx={ctxSelection}
                    sendJsonMessage={sendJsonMessage}
                    transforms={filteredTransforms}
                  />
                </>
              )}
              {ctxSelection?.data?.label && (
                <div className='node-context'>
                  <div>
                    <button
                      onClick={() => {
                        closeMenu()
                        sendJsonMessage({
                          action: 'delete:node',
                          node: { id: ctxSelection.id },
                        })
                        dispatch(deleteNode(ctxSelection.id))
                        // dispatch(setEditState({ editId: ctxSelection.id, editLabel: 'deleteNode' }))
                      }}
                      type='button'
                    >
                      <Icon icon='trash' aria-hidden='true' />
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
