import { useEffect, useRef, useState } from "preact/hooks";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import Button from "@/components/buttons";
import Input from "@/components/inputs";
import { EntitiesPanel, GraphPanel, MarketPanel } from "./_components/panels";
import OverlayModal, { OverlayModalProps } from '@/components/modals/OverlayModal';
import { Icon } from '@/components/icons';
import { toast } from "react-toastify";
import { JSX } from "preact/jsx-runtime";
import { Entity, Graph, CreateEntityPayload, CreateGraphPayload } from "@/app/api";
import { useEntitiesStore, useGraphsStore, useAuthStore } from "@/app/store";

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
};

export default function DashboardPage() {
  const location = useLocation()

  // Determine current tab based on route
  const getCurrentTab = () => {
    if (location.pathname.includes("/entity")) return 1;
    if (location.pathname.includes("/market")) return 2;
    return 0; // default to graphs
  };

  const currentPanelTab = getCurrentTab();

  // Get authentication token
  const { access_token } = useAuthStore();

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
    unfavoriteGraph
  } = useGraphsStore();

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
    unfavoriteEntity
  } = useEntitiesStore();

  // Load data on component mount
  useEffect(() => {
    fetchGraphs({ skip: 0, limit: 50 })
    fetchEntities({ skip: 0, limit: 50 })
  }, []);

  const [showCreateEntityModal, setShowCreateEntityModal] = useState<boolean>(false);
  const cancelCreateEntityRef = useRef<HTMLElement>(null);

  const [showCreateGraphModal, setShowCreateGraphModal] = useState<boolean>(false);
  const cancelCreateGraphRef = useRef<HTMLElement>(null);

  return (
    <>
      <div class="flex ">
        <aside class="rounded py-px !min-w-[20rem] max-w-[20rem] flex-col h-screen pt-3.5 border-r-[3px] from-black/40 to-black/50 bg-gradient-to-tr shadow-2xl border-black/10 justify-between flex relative w-full backdrop-blur-md shadow-black/25">
          <Input.TransparentIcon
            icon={<Icon icon='search' className="h-6 w-6 relative" />}
            onBtnClick={() => console.log("Todo search")}
            type="text"
            className="w-full mx-2 mb-1.5 "
            placeholder={`Search...`}
          />
          <div class='overflow-y-hidden grow flex flex-col items-stretch relative my-1 mt-[5px]'>
            <section class='flex justify-between rounded pb-1 items-center font-display font-semibold *:text-slate-600 *:hover:text-slate-500 *:aria-selected:text-slate-200/95'>
              <Link
                to='graph'
                class='flex items-center justify-center rounded min-w-[6.5rem] text-sm leading-none z-[1]  cursor-pointer h-8.5 text-inherit outline-hidden focus:outline-hidden focus:text-slate-500'
                aria-selected={currentPanelTab === 0}
              >
                Graphs
              </Link>
              <Link
                to='entity'
                class='flex items-center justify-center rounded min-w-[6.5rem] text-sm leading-none z-[1]  cursor-pointer h-8.5 text-inherit outline-hidden focus:outline-hidden focus:text-slate-500'
                aria-selected={currentPanelTab === 1}
              >
                Entities
              </Link>
              <Link
                to='market'
                class='flex items-center justify-center rounded min-w-[6.5rem] text-sm leading-none z-[1]  cursor-pointer h-8.5 text-inherit outline-hidden focus:outline-hidden focus:text-slate-500'
                aria-selected={currentPanelTab === 2}
              >
                Market
              </Link>
              <div class={`${currentPanelTab === 1 ? '!translate-x-[111px]' : currentPanelTab !== 0 ? 'translate-x-[216px]' : 'translate-x-[6px]'} min-h-[35px] mr-auto min-w-[95px] left-0 absolute z-[0] top-0  transition-all duration-200 ease-out rounded from-primary-350 to-primary-400 border border-mirage-400/60 bg-gradient-to-br cursor-pointer`} />
            </section>
            <div class="h-full overflow-y-scroll ">
              <div class="w-full relative px-2.5">
                {currentPanelTab === 0 && (
                  <GraphPanel
                    graphsData={{ favorites: graphFavorites, graphs }}
                    isLoading={loadingGraphs}
                    isError={!!graphsError}
                    isSuccess={!loadingGraphs && !graphsError}
                    favoriteGraph={async (graph_id: string) => await favoriteGraph({ graph_id, is_favorite: true })}
                    unfavoriteGraph={async (graph_id: string) => await unfavoriteGraph({ graph_id, is_favorite: false })}
                  />
                )}
                {currentPanelTab === 1 && (
                  <EntitiesPanel
                    entitiesData={{ entities: entities || [], favorites: entityFavorites || [] }}
                    isLoading={loadingEntities}
                    isError={!!entitiesError}
                    isSuccess={!loadingEntities && !entitiesError}
                    favoriteEntity={async (entity_id: string) => await favoriteEntity({ entity_id, is_favorite: true })}
                    unfavoriteEntity={async (entity_id: string) => await unfavoriteEntity({ entity_id, is_favorite: false })}
                  />
                )}
                {currentPanelTab === 2 && (<MarketPanel />)}
              </div>
            </div>
          </div>
          {currentPanelTab !== 2 && (
            <>
              {currentPanelTab === 0 && (
                <Button.Ghost
                  variant='primary'
                  onClick={() => setShowCreateGraphModal(true)}
                  className='mt-auto mb-4 mx-4 mr-6'
                >
                  Create graph
                  <Icon icon='chart-dots-3' className='btn-icon !ml-7' />
                </Button.Ghost>
              )}
              {currentPanelTab === 1 && (
                <Button.Ghost
                  variant='primary'
                  onClick={() => setShowCreateEntityModal(true)}
                  className='mt-auto mb-4 mx-4 mr-6'
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
              className='mx-4 mr-6 mt-auto mb-4'
              title="Connect third-party servers providing plugin access"
            >
              Connect server plugins
              <Icon icon='cloud' className='btn-icon !ml-7' />
            </Button.Ghost>
          )}
        </aside >
        <Outlet context={{
          graphs: graphs,
          favoriteGraphs: graphFavorites,
          entities: entities,
          favorite_entities: entityFavorites,
          loadingGraphs: loadingGraphs,
          loadingEntities: loadingEntities,
        } satisfies DashboardContextType} />
      </div >
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
  );
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
  isCreatingEntity
}: CreateEntityModalProps) {
  const onSubmitHandler: JSX.SubmitEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget);
    const payload = {
      label: formData.get('label') as string,
      description: formData.get('description') as string,
      author: formData.get('author') as string,
      source: "import osintbuddy as ob" // Default source as per API examples
    };

    createEntity(payload)
      .then((data) => {
        console.log(data)
        closeModal();
        toast.success('Entity created successfully!');
      })
      .catch((error: any) => {
        toast.error(`Failed to create entity: ${error.message}`);
      });
  };

  return (
    <OverlayModal isOpen={isOpen} closeModal={closeModal} cancelRef={cancelCreateRef}>
      <form onSubmit={onSubmitHandler} className='from-cod-900 to-cod-950 bg-gradient-to-br w-full shadow border-l-3 border-l-primary px-10 flex flex-col overflow-y-scroll '>
        <section class="border-primary-350 border-b-2 mt-6 pl-1 pb-1 px-px">
          <div class="flex flex-wrap items-center justify-between">
            <h1 class="font-code font-semibold text-2xl tracking-tight text-slate-400">CREATE://ENTITY</h1>
            <Icon icon="basket-code" className="w-6 h-6 mr-2 mt-1 text-slate-400" />
          </div>
        </section>
        <div class="w-full gap-y-2 grid mt-3 grid-cols-1 ">
          <Input.Transparent placeholder="Your entity name..." className="w-full" name="label" label="Label" />
          <Input.Textarea placeholder="Describe the purpose of your entity..." className="w-full" name="description" label="Description" />
          <Input.Transparent placeholder="Entity authors name..." className='w-full mb-6' name="author" label="Authors" />
        </div>

        <div class="flex justify-end mb-6">
          <Button.Ghost variant="danger" onClick={() => closeModal()} type='button'>
            Cancel
            <Icon icon='cancel' className="btn-icon !text-danger-500" />
          </Button.Ghost>
          <Button.Solid
            className={`ml-4 ${isCreatingEntity ? 'opacity-50' : ''}`}
            variant="primary"
            type='submit'
            disabled={isCreatingEntity}
          >
            {isCreatingEntity ? 'Creating...' : 'Create entity'}
            <Icon icon='plus' className="btn-icon" />
          </Button.Solid>
        </div>
      </form>
    </OverlayModal>
  );
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
  refreshAllGraphs,
  createGraph,
  isCreatingGraph
}: CreateGraphModalProps) {

  const onSubmitHandler: JSX.SubmitEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget);
    const enableGuide = formData.get("guide") === 'on';
    createGraph({
      label: formData.get('label') as string,
      description: formData.get('description') ?? ''
    })
      .then(() => {
        closeModal();
        toast.success('Graph created successfully!');
        // we only navigate to the graph when the guide is enabled
        if (enableGuide) {
          // navigate(`/graph/${newGraph.id}`, { ...replace, state: { showGraphGuide, } })
        } else {
          // navigate(`/dashboard/graph/${newGraph.id}`, replace)
        }
      })
      .catch((error: any) => {
        toast.error(`Failed to create graph: ${error.message}`);
      });
  };

  return (
    <OverlayModal isOpen={isOpen} closeModal={closeModal} cancelRef={cancelCreateRef}>
      <form onSubmit={onSubmitHandler} class="from-cod-900/85 to-cod-950/80 bg-gradient-to-br w-full shadow border-l-3 border-l-primary px-10 flex flex-col overflow-y-scroll ">
        <section class=" border-b-2 mt-6 border-primary pl-1 pb-1 px-px ">
          <div class=" flex flex-wrap items-center justify-between ">
            <h1 class="font-code font-semibold text-2xl tracking-tight text-slate-400">CREATE://GRAPH</h1>
            <Icon icon="chart-dots-3" className="w-6 h-6 mr-2 mt-1 text-slate-400" />
          </div>
        </section>
        <div class="w-full grid gap-y-2 mt-3 grid-cols-1 ">
          <Input.Transparent name="label" label="Label" placeholder="Enter a name for your graph..." className="w-full" />
          <Input.Textarea rows={3} name="description" className="w-full" label="Description" placeholder="Additional details about your graph..." />
          <Input.ToggleSwitch className='pb-6 pt-1' label="Enable Guide" name="guide" description="Get a step-by-step guide on how to perform investigations" />
        </div>

        <div class="flex justify-end mb-6">
          <Button.Ghost
            variant='danger'
            onClick={() => closeModal()}
            type='button'
          >
            Cancel
            <Icon icon='cancel' className="btn-icon !text-danger-500 " />
          </Button.Ghost>
          <Button.Solid
            variant='primary'
            type='submit'
            disabled={isCreatingGraph}
            className={`btn-primary ml-4 ${isCreatingGraph ? 'opacity-50' : ''}`}
          >
            {isCreatingGraph ? 'Creating...' : 'Create graph'}
            <Icon icon='plus' className="btn-icon" />
          </Button.Solid>
        </div>
      </form>
    </OverlayModal>
  );
}

