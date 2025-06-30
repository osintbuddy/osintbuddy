import { useRef, useState } from "preact/hooks";
import { Fragment } from "preact/jsx-runtime";
import { Link, Outlet, useLocation } from "react-router-dom";
import { MagnifyingGlassIcon, PlusIcon, CloudIcon } from "@heroicons/react/24/outline";
import GraphPanel from "./_components/tabs/GraphPanel";
import EntitiesPanel from "./_components/tabs/EntitiesPanel";
import MarketPanel from './_components/tabs/MarketPanel';
import CreateGraphModal from "./_components/modals/CreateGraphModal";
import CreateEntityModal from "./_components/modals/CreateEntityModal";
import Button from "@/components/buttons";
import Input from "@/components/inputs";

export interface ScrollGraphs {
  skip?: number | undefined
  limit?: number | undefined
  favoriteSkip?: number | undefined
  favoriteLimit?: number | undefined
}

export type DashboardContextType = {
  entitiesData: any[]
  graphsData: any
  isLoadingGraphs: boolean
  isGraphsError: boolean
};

export default function DashboardPage() {
  const location = useLocation()

  // Determine current tab based on route
  const getCurrentTab = () => {
    if (location.pathname.includes("/entity")) return 1;
    if (location.pathname.includes("/market")) return 2;
    return 0; // default to graphs
  };

  const currentTab = getCurrentTab();

  const [showCreateEntityModal, setShowCreateEntityModal] = useState<boolean>(false);
  const cancelCreateEntityRef = useRef<HTMLElement>(null);

  const [showCreateGraphModal, setShowCreateGraphModal] = useState<boolean>(false);
  const cancelCreateGraphRef = useRef<HTMLElement>(null);

  const selected = true;

  return (
    <>
      <div class="flex ">
        <aside class="rounded py-px !min-w-[20rem] max-w-[20rem] flex-col h-screen pt-3.5 border-r-[3px] from-black/40 to-black/50 bg-gradient-to-tr shadow-2xl border-black/10 justify-between flex relative w-full backdrop-blur-md shadow-black/25">
          <Input.TransparentIcon
            icon={<MagnifyingGlassIcon class="h-5 relative right-2" />}
            onBtnClick={() => console.log("Todo search")}
            type="text"
            className="w-full mx-2 mb-1.5"
            placeholder={`Search...`}
          />
          <div class='overflow-y-hidden flex-grow flex flex-col items-stretch relative my-1'>
            <ul class='flex justify-between rounded pb-1 items-center'>
              <Link
                to='graph'
                class='flex items-center justify-center px-0 mx-0 rounded min-w-[6.5rem] text-sm leading-none z-[1] font-display flex-grow hover:pointer-events-auto font-semibold cursor-pointer h-8.5 market-tab text-slate-600 hover:text-slate-500 aria-selected:text-slate-200/95'
                aria-selected={currentTab === 0}
              >
                Graphs
              </Link>
              <Link
                to='entity'
                class='flex items-center justify-center px-0 mx-0 rounded min-w-[6.5rem] text-sm leading-none z-[1] font-display flex-grow hover:pointer-events-auto font-semibold cursor-pointer h-8.5 market-tab text-slate-600 hover:text-slate-500 aria-selected:text-slate-200/95'
                aria-selected={currentTab === 1}
              >
                Entities
              </Link>
              <Link
                to='market'
                class='flex items-center justify-center px-0 mx-0 rounded min-w-[6.5rem] text-sm leading-none z-[1] font-display flex-grow hover:pointer-events-auto font-semibold cursor-pointer h-8.5 market-tab text-slate-600 hover:text-slate-500 aria-selected:text-slate-200/95'
                aria-selected={currentTab === 2}
              >
                Market
              </Link>
              <div class={`${currentTab === 1 ? '!translate-x-[111px]' : currentTab !== 0 ? 'translate-x-[216px]' : 'translate-x-[5px]'} min-h-[35px] mr-auto min-w-[95px] left-0 absolute z-[0] top-0  transition-all duration-200 ease-out rounded from-primary-350 to-primary-400 border border-mirage-400/60 bg-gradient-to-br cursor-pointer`} />
            </ul>
            <div class="h-full overflow-y-scroll ">
              <div class="w-full relative px-2 pr-2.5">
                {currentTab === 0 && (
                  <GraphPanel
                    refetchGraphs={() => null}
                    graphsData={{ favorite_graphs: [], graphs: [] }}
                    isLoadingGraphs={false}
                    isGraphsError={false}
                    isGraphsSuccess={false}
                  />
                )}
                {currentTab === 1 && (
                  <EntitiesPanel
                    entitiesData={[]}
                    isLoading={false}
                    isError={false}
                    isSuccess={false}
                    refetchEntities={() => null} />
                )}

                {currentTab === 2 && (<MarketPanel />)}
              </div>

            </div>
          </div>
          {currentTab !== 2 ? (
            <Button.Ghost
              variant='primary'
              onClick={() => {
                if (currentTab === 0) setShowCreateGraphModal(true)
                if (currentTab === 1) setShowCreateEntityModal(true) // TODO
              }}
              className='mt-auto mb-4 mx-4 mr-6'
            >
              Create {currentTab === 0 ? 'graph' : 'entity'}
              <PlusIcon class='btn-icon !ml-7' />
            </Button.Ghost>
          ) : (
            <Button.Ghost
              variant='primary'
              className='mx-4 mr-6 mt-auto mb-4'
            >
              Connect server plugins
              <CloudIcon class='btn-icon !ml-7' />
            </Button.Ghost>
          )}
        </aside>
        <Outlet context={{
          graphsData: { favorite_graphs: [], graphs: [] },
          entitiesData: [],
          isLoadingGraphs: false,
          isGraphsError: false,
        } satisfies DashboardContextType} />
      </div >
      <CreateGraphModal
        cancelCreateRef={cancelCreateGraphRef}
        isOpen={showCreateGraphModal}
        closeModal={() => setShowCreateGraphModal(false)}
        refreshAllGraphs={() => null}
      />
      <CreateEntityModal
        refreshAllEntities={() => null}
        cancelCreateRef={cancelCreateEntityRef}
        isOpen={showCreateEntityModal}
        closeModal={() => setShowCreateEntityModal(false)}
      />
    </>
  );
}


