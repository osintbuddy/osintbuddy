import { useRef, useState } from "preact/hooks";
import { Fragment } from "preact/jsx-runtime";
import { Link, Outlet, useLocation } from "react-router-dom";
import { MagnifyingGlassIcon, PlusIcon, CloudIcon } from "@heroicons/react/24/outline";
import { Tab, TabGroup, TabList, TabPanel } from "@headlessui/react";
import GraphPanel from "./_components/tabs/GraphPanel";
import EntitiesPanel from "./_components/tabs/EntitiesPanel";
import MarketPanel from './_components/tabs/MarketPanel';
import CreateGraphModal from "./_components/modals/CreateGraphModal";
import CreateEntityModal from "./_components/modals/CreateEntityModal";
import Button from "@/components/buttons";

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
  const initialTab = location.pathname.includes("entity") ?
    0 : location.pathname.includes("market")
      ? 2 : 0

  const [tabIndex, setTabIndex] = useState<number>(initialTab)

  const [showCreateEntityModal, setShowCreateEntityModal] = useState<boolean>(false);
  const cancelCreateEntityRef = useRef<HTMLElement>(null);

  const [showCreateGraphModal, setShowCreateGraphModal] = useState<boolean>(false);
  const cancelCreateGraphRef = useRef<HTMLElement>(null);

  return (
    <>
      <div class="flex ">
        <aside class="sidebar-wrapper">
          <div class="search-container">
            <MagnifyingGlassIcon />
            <input
              type="text"
              placeholder={`Search ${tabIndex === 0 ? 'graphs' : tabIndex === 1 ? 'entities' : 'marketplace'}...`}
            />
          </div>
          <TabGroup
            vertical={false}
            as='section'
            selectedIndex={tabIndex}
            onChange={setTabIndex}
            class={'dashboard-tabs'}
          >
            <TabList class='tabs-list'>
              <Tab as={Fragment}>
                {({ selected }) => (
                  <Link
                    to='graph'
                    class={`tab graph-tab tab-${selected}`}
                    aria-selected={selected}
                  >
                    Graphs
                  </Link>
                )}
              </Tab>
              <Tab as={Fragment}>
                {({ selected }) => (
                  <Link
                    to='entity'
                    class={`tab entities-tab tab-${selected}`}
                    aria-selected={selected}
                  >
                    <span>
                      Entities
                    </span>
                  </Link>
                )}
              </Tab>
              <Tab as={Fragment}>
                {({ selected }) => (
                  <Link
                    to='market'
                    class={`tab market-tab tab-${selected}`}
                    aria-selected={selected}
                  >
                    Market
                  </Link>
                )}
              </Tab>
              <div class="tab-slider" />
            </TabList>
            <div class="h-full overflow-y-scroll ">
              <TabPanel class="tab-panel">
                <GraphPanel
                  refetchGraphs={() => null}
                  graphsData={{ favorite_graphs: [], graphs: [] }}
                  isLoadingGraphs={false}
                  isGraphsError={false}
                  isGraphsSuccess={false}
                />
              </TabPanel>
              <TabPanel class="tab-panel">
                <EntitiesPanel
                  entitiesData={[]}
                  isLoading={false}
                  isError={false}
                  isSuccess={false}
                  refetchEntities={() => null}

                />
              </TabPanel>
              <TabPanel class="tab-panel">
                <MarketPanel />
              </TabPanel>
            </div>
          </TabGroup>
          {tabIndex !== 2 ? (
            <Button.Ghost
              variant='primary'
              onClick={() => {
                if (tabIndex === 0) setShowCreateGraphModal(true)
                if (tabIndex === 1) setShowCreateEntityModal(true) // TODO
              }}
              className='mt-auto mb-4 mx-4 mr-6'
            >
              Create {tabIndex === 0 ? 'graph' : 'entity'}
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
      </div>
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


