import { useEffect, useRef, useState } from 'preact/hooks'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import Button from '@/components/buttons'
import Input from '@/components/inputs'
import { EntitiesPanel, GraphPanel, MarketPanel } from './_components/panels'
import OverlayModal, {
  OverlayModalProps,
} from '@/components/modals/OverlayModal'
import { Icon } from '@/components/icons'
import { toast } from 'react-toastify'
import { JSX } from 'preact/jsx-runtime'
import { Entity, Graph, CreateEntityPayload } from '@/app/api'
import { useEntitiesStore, useGraphsStore } from '@/app/store'

export interface ScrollGraphs {
  skip?: number | undefined
  limit?: number | undefined
  favoriteSkip?: number | undefined
  favoriteLimit?: number | undefined
}

export type DashboardContextType = {
  graphs: Graph[]
  favoriteGraphs: string[]
  loadingGraphs: boolean
  entities: Entity[]
  favorite_entities: string[]
  loadingEntities: boolean
  activeEntity: Entity | null
}

export default function DashboardPage() {
  const location = useLocation()

  // Determine current tab based on route
  const getCurrentTab = () => {
    if (location.pathname.includes('/entity')) return 1
    if (location.pathname.includes('/market')) return 2
    return 0 // default to graphs
  }
  const currentPanelTab = getCurrentTab()

  // Integration with useGraphs hook
  const {
    graphs,
    favorites: graphFavorites,
    isLoading: loadingGraphs,
    error: graphsError,
    isCreating: isCreatingGraph,
    fetchGraphs,
    createGraph,
    favoriteGraph,
    unfavoriteGraph,
  } = useGraphsStore()

  // Integration with useEntities hook
  const {
    entities,
    favorites: entityFavorites,
    isLoading: loadingEntities,
    error: entitiesError,
    isCreating: isCreatingEntity,
    fetchEntities,
    createEntity,
    favoriteEntity,
    unfavoriteEntity,
  } = useEntitiesStore()

  // Load data on component mount
  useEffect(() => {
    fetchGraphs({ skip: 0, limit: 50 })
    fetchEntities({ skip: 0, limit: 50 })
  }, [])

  const [showCreateEntityModal, setShowCreateEntityModal] =
    useState<boolean>(false)
  const cancelCreateEntityRef = useRef<HTMLElement>(null)

  const [showCreateGraphModal, setShowCreateGraphModal] =
    useState<boolean>(false)
  const cancelCreateGraphRef = useRef<HTMLElement>(null)

  return (
    <>
      <div class='flex h-full px-4 py-4'>
        <aside class='relative flex max-w-80 min-w-80 shrink flex-col items-start overflow-y-clip rounded-md border-r-3 border-black/10 bg-gradient-to-tr from-black/40 to-black/50 py-px pt-2 shadow-2xl shadow-black/25 backdrop-blur-md'>
          <Input.AltIcon
            icon={<Icon icon='search' className='transparent-icon' />}
            onBtnClick={() => console.log('Todo search')}
            type='text'
            className='mx-2 mb-1.5 w-full'
            placeholder={`Search...`}
          />
          <div className='relative my-1 ml-[2px]'>
            <section class='font-display flex shrink items-center justify-between rounded pb-1 font-semibold *:text-slate-600 *:hover:text-slate-500 *:aria-selected:text-slate-200/95'>
              <Link
                to='graph'
                class='z-10 flex h-8.5 min-w-[6.5rem] cursor-pointer items-center justify-center rounded text-sm leading-none text-inherit outline-hidden select-none focus:text-slate-500 focus:outline-hidden'
                aria-selected={currentPanelTab === 0}
              >
                Cases
              </Link>
              <Link
                to='entity'
                class='z-10 flex h-8.5 min-w-[6.5rem] cursor-pointer items-center justify-center rounded text-sm leading-none text-inherit outline-hidden select-none focus:text-slate-500 focus:outline-hidden'
                aria-selected={currentPanelTab === 1}
              >
                Entities
              </Link>
              <Link
                to='market'
                class='z-10 flex h-8.5 min-w-[6.5rem] cursor-pointer items-center justify-center rounded text-sm leading-none text-inherit outline-hidden select-none focus:text-slate-500 focus:outline-hidden'
                aria-selected={currentPanelTab === 2}
              >
                Market
              </Link>
              <div
                class={`${currentPanelTab === 1 ? '!translate-x-[108px]' : currentPanelTab !== 0 ? 'translate-x-[213px]' : 'translate-x-[6px]'} from-primary-350 to-primary-400 border-mirage-400/60 absolute top-0 left-0 z-[0] mr-auto min-h-[35px] min-w-[95px] cursor-pointer rounded border bg-gradient-to-br transition-all duration-200 ease-out`}
              />
            </section>
          </div>
          <div class='relative my-1 flex h-[calc(93%-80px)] w-full flex-col'>
            {currentPanelTab === 0 && (
              <GraphPanel
                graphsData={{ favorites: graphFavorites, graphs }}
                isLoading={loadingGraphs}
                isError={!!graphsError}
                isSuccess={!loadingGraphs && !graphsError}
                favoriteGraph={async (graph_id: string) =>
                  await favoriteGraph({ graph_id, is_favorite: true })
                }
                unfavoriteGraph={async (graph_id: string) =>
                  await unfavoriteGraph({ graph_id, is_favorite: false })
                }
              />
            )}
            {currentPanelTab === 1 && (
              <EntitiesPanel
                entitiesData={{
                  entities: entities || [],
                  favorites: entityFavorites || [],
                }}
                isLoading={loadingEntities}
                isError={!!entitiesError}
                isSuccess={!loadingEntities && !entitiesError}
                favoriteEntity={async (entity_id: string) =>
                  await favoriteEntity({ entity_id, is_favorite: true })
                }
                unfavoriteEntity={async (entity_id: string) =>
                  await unfavoriteEntity({ entity_id, is_favorite: false })
                }
              />
            )}
            {currentPanelTab === 2 && <MarketPanel />}
          </div>

          {currentPanelTab !== 2 && (
            <>
              {currentPanelTab === 0 && (
                <Button.Ghost
                  variant='primary'
                  onClick={() => setShowCreateGraphModal(true)}
                  className='absolute bottom-3 mx-4 mt-auto w-[calc(100%-2rem)]'
                >
                  Create case
                  <Icon icon='chart-dots-3' className='btn-icon !ml-7' />
                </Button.Ghost>
              )}
              {currentPanelTab === 1 && (
                <Button.Ghost
                  variant='primary'
                  onClick={() => setShowCreateEntityModal(true)}
                  className='absolute bottom-3 mx-4 mt-auto w-[calc(100%-2rem)]'
                >
                  Create entity
                  <Icon icon='ghost-3' className='btn-icon !ml-7' />
                </Button.Ghost>
              )}
            </>
          )}
          {currentPanelTab === 2 && (
            <Button.Ghost
              variant='primary'
              className='absolute bottom-3 mx-4 mt-auto w-[calc(100%-2rem)]'
              title='Connect third-party servers providing plugin access'
            >
              Connect server plugins
              <Icon icon='cloud' className='btn-icon !ml-7' />
            </Button.Ghost>
          )}
        </aside>

        <Outlet
          context={
            {
              graphs: graphs,
              favoriteGraphs: graphFavorites,
              entities: entities,
              favorite_entities: entityFavorites,
              loadingGraphs: loadingGraphs,
              loadingEntities: loadingEntities,
              activeEntity: null, // Will be set by individual entity pages
            } satisfies DashboardContextType
          }
        />
      </div>
      <CreateGraphModal
        cancelCreateRef={cancelCreateGraphRef}
        isOpen={showCreateGraphModal}
        closeModal={() => setShowCreateGraphModal(false)}
        refreshAllGraphs={() => fetchGraphs({ skip: 0, limit: 50 })}
        createGraph={createGraph}
        isCreatingGraph={isCreatingGraph}
      />
      <CreateEntityModal
        refreshAllEntities={() => fetchEntities({ skip: 0, limit: 50 })}
        cancelRef={cancelCreateEntityRef}
        isOpen={showCreateEntityModal}
        closeModal={() => setShowCreateEntityModal(false)}
        createEntity={(payload: CreateEntityPayload) => createEntity(payload)}
        isCreatingEntity={isCreatingEntity}
      />
    </>
  )
}

interface CreateEntityModalProps extends OverlayModalProps {
  refreshAllEntities: () => void
  closeModal: () => void
  isOpen: boolean
  cancelRef: any
  createEntity: (payload: CreateEntityPayload) => Promise<any>
  isCreatingEntity: boolean
}

function CreateEntityModal({
  closeModal,
  isOpen,
  cancelRef: cancelCreateRef,
  createEntity,
  isCreatingEntity,
}: CreateEntityModalProps) {
  const onSubmitHandler: JSX.SubmitEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const payload = {
      label: formData.get('label') as string,
      description: formData.get('description') as string,
      author: formData.get('author') as string,
      source: 'import osintbuddy as ob', // Default source as per API examples
    }

    createEntity(payload)
      .then(() => {
        closeModal()
        toast.success('Entity created successfully!')
      })
      .catch((error: any) => toast.error(error.message))
  }

  return (
    <OverlayModal
      isOpen={isOpen}
      closeModal={closeModal}
      cancelRef={cancelCreateRef}
    >
      <form
        onSubmit={onSubmitHandler}
        className='from-cod-900 to-cod-950 border-l-primary flex w-full flex-col overflow-y-scroll border-l-3 bg-gradient-to-br px-10 shadow'
      >
        <section class='border-primary-350 mt-6 border-b-2 px-px pb-1 pl-1'>
          <div class='flex flex-wrap items-center justify-between'>
            <h1 class='font-code text-2xl font-semibold tracking-tight text-slate-400'>
              CREATE://ENTITY
            </h1>
            <Icon
              icon='basket-code'
              className='mt-1 mr-2 h-6 w-6 text-slate-400'
            />
          </div>
        </section>
        <div class='mt-3 grid w-full grid-cols-1 gap-y-2'>
          <Input.AltText
            placeholder='Your entity name...'
            className='w-full'
            name='label'
            label='Label'
          />
          <Input.Textarea
            placeholder='Describe the purpose of your entity...'
            className='w-full'
            name='description'
            label='Description'
          />
          <Input.AltText
            placeholder='Entity authors name...'
            className='mb-6 w-full'
            name='author'
            label='Authors'
          />
        </div>

        <div class='mb-6 flex justify-end'>
          <Button.Ghost
            variant='danger'
            onClick={() => closeModal()}
            type='button'
          >
            Cancel
            <Icon icon='cancel' className='btn-icon !text-danger-500' />
          </Button.Ghost>
          <Button.Solid
            className={`ml-4 ${isCreatingEntity ? 'opacity-50' : ''}`}
            variant='primary'
            type='submit'
            disabled={isCreatingEntity}
          >
            {isCreatingEntity ? 'Creating...' : 'Create entity'}
            <Icon icon='plus' className='btn-icon' />
          </Button.Solid>
        </div>
      </form>
    </OverlayModal>
  )
}

interface CreateGraphModalProps {
  refreshAllGraphs: () => void
  closeModal: () => void
  isOpen: boolean
  cancelCreateRef: any
  createGraph: (payload: { label: string; description: string }) => Promise<any>
  isCreatingGraph: boolean
}

export function CreateGraphModal({
  closeModal,
  isOpen,
  cancelCreateRef,
  createGraph,
  isCreatingGraph,
}: CreateGraphModalProps) {
  const navigate = useNavigate()

  const onSubmitHandler: JSX.SubmitEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const showGuide = formData.get('guide') === 'on'
    createGraph({
      label: formData.get('label') as string,
      description: (formData.get('description') as string) ?? '',
    })
      .then((graph) => {
        closeModal()
        toast.success('Graph created successfully!')
        if (showGuide) {
          navigate(`/graph/${graph.id}`, { state: { showGuide } })
        }
      })
      .catch((error: any) => toast.error(error.message))
  }

  return (
    <OverlayModal
      isOpen={isOpen}
      closeModal={closeModal}
      cancelRef={cancelCreateRef}
    >
      <form
        onSubmit={onSubmitHandler}
        class='from-cod-900/85 to-cod-950/80 border-l-primary flex w-full flex-col overflow-y-scroll border-l-3 bg-gradient-to-br px-10 shadow'
      >
        <section class='border-primary mt-6 border-b-2 px-px pb-1 pl-1'>
          <div class='flex flex-wrap items-center justify-between'>
            <h1 class='font-code text-2xl font-semibold tracking-tight text-slate-400'>
              CREATE://CASE
            </h1>
            <Icon
              icon='chart-dots-3'
              className='mt-1 mr-2 h-6 w-6 text-slate-400'
            />
          </div>
        </section>
        <div class='mt-3 grid w-full grid-cols-1 gap-y-2'>
          <Input.AltText
            name='label'
            label='Label'
            placeholder='Enter a name for your graph...'
            className='w-full'
          />
          <Input.Textarea
            rows={3}
            name='description'
            className='w-full'
            label='Description'
            placeholder='Additional details about your graph...'
          />
          <Input.ToggleSwitch
            className='pt-1 pb-6'
            label='Enable Guide'
            name='guide'
            description='Get a step-by-step guide on how to perform investigations'
          />
        </div>

        <div class='mb-6 flex justify-end'>
          <Button.Ghost
            variant='danger'
            onClick={() => closeModal()}
            type='button'
          >
            Cancel
            <Icon icon='cancel' className='btn-icon !text-danger-500' />
          </Button.Ghost>
          <Button.Solid
            variant='primary'
            type='submit'
            disabled={isCreatingGraph}
            className={`btn-primary ml-4 ${isCreatingGraph ? 'opacity-50' : ''}`}
          >
            {isCreatingGraph ? 'Creating...' : 'Create graph'}
            <Icon icon='plus' className='btn-icon' />
          </Button.Solid>
        </div>
      </form>
    </OverlayModal>
  )
}
