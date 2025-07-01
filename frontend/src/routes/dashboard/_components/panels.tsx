import { useState, useMemo } from 'preact/hooks'
import Subpanel from './Subpanel'

export function MarketPanel() {
  const [showProviders, setShowProviders] = useState(false)
  const [showCommunityPlugins, setShowCommunityPlugins] = useState(false);

  return (
    <>
      <section class="flex flex-col justify-between relative shrink overflow-clip">
        <Subpanel
          label="Community"
          showError={true}
          showEntities={showCommunityPlugins}
          setShowEntities={() => setShowCommunityPlugins(!showCommunityPlugins)}
          isLoading={false}
          isSuccess={false}
          items={[]}
          onClick={async (hid: string) => null}
          to="/dashboard/graph"
          errorMessage={"The market will be here one day... Follow the project on the forum or on discord to get the latest updates"}
        />
        <Subpanel
          label="Providers"
          showError={true}
          showEntities={showProviders}
          setShowEntities={() => setShowProviders(!showProviders)}
          isLoading={false}
          isSuccess={false}
          items={[]}
          onClick={async (hid: string) => null}
          to="/dashboard/graph"
          errorMessage={"Coming eventually... Stay tuned!"}
        />
      </section>
    </>
  )
}

interface GraphPanel {
  graphsData: any
  isLoadingGraphs: boolean | undefined
  isGraphsError: any
  refetchGraphs: () => void
  isGraphsSuccess: boolean | undefined
}

export function GraphPanel({
  graphsData,
  isLoadingGraphs,
  isGraphsError,
  refetchGraphs,
  isGraphsSuccess
}: GraphPanel) {
  const [showAllGraphs, setShowAllGraphs] = useState(true);
  const [showFavoriteGraphs, setShowFavoriteGraphs] = useState(true);

  const favoriteGraphs = useMemo(() => {
    const sortedGraphs = graphsData.favorite_graphs.slice()
    sortedGraphs.sort((a, b) => b.created.localeCompare(a.created))
    return sortedGraphs
  }, [graphsData.favorite_graphs])

  const graphs = useMemo(() => {
    if (graphsData) {
      const sortedGraphs = graphsData.graphs.slice()
      sortedGraphs.sort((a, b) => b.created.localeCompare(a.created))
      return sortedGraphs
    }
  }, [graphsData.graphs])

  const MAX_DESCRIPTION_LENGTH = 63

  const updateFavorites = async (hid: string) => {
    // await updateFavoriteEntity({ hid })
    await refetchGraphs()
  }

  return (
    <section class="flex flex-col justify-between relative shrink overflow-clip">
      <Subpanel
        label="Favorites"
        showError={isGraphsError}
        showEntities={showFavoriteGraphs}
        setShowEntities={() => setShowFavoriteGraphs(!showFavoriteGraphs)}
        isLoading={isLoadingGraphs}
        isSuccess={isGraphsSuccess}
        items={favoriteGraphs}
        onClick={async (hid) => await updateFavorites(hid)}
        to="/dashboard/graph"
        dateLabel="Created"
        dateKey="created"
      />
      <Subpanel
        label="All graphs"
        showError={isGraphsError}
        showEntities={showAllGraphs}
        setShowEntities={() => setShowAllGraphs(!showAllGraphs)}
        isLoading={isLoadingGraphs}
        isSuccess={isGraphsSuccess}
        items={graphs}
        onClick={async (hid) => await updateFavorites(hid)}
        to="/dashboard/graph"
        dateLabel="Created"
        dateKey="created"
      />
    </section>
  )
}



export function EntitiesPanel({
  entitiesData: entities,
  isLoading,
  isError,
  isSuccess,
  refetchEntities,
}: JSONObject) {
  const [showFavoriteEntities, setShowFavoriteEntities] = useState<boolean>(true);
  const [showEntities, setShowEntities] = useState(true);

  const sortedEntities = useMemo(() => {
    const sortedEntities = entities.slice()
    sortedEntities.sort((a: any, b: any) => {
      let c = new Date(b.last_edit)
      let d = new Date(a.last_edit)
      // @ts-ignore
      return c - d
    })
    return sortedEntities
  }, [entities])


  const updateEntityOnFavorite = (hid: string) => {
    // updateEntityIsFavorite({ hid })
    refetchEntities()
  }

  return (
    <section className="flex flex-col justify-between relative shrink overflow-clip">
      {/* TODO add to db entitiy favs table and enforce labels unique for pointer to entity */}
      <Subpanel
        label="Favorites"
        showError={isError}
        showEntities={showFavoriteEntities}
        setShowEntities={() => setShowFavoriteEntities(!showFavoriteEntities)}
        isLoading={isLoading}
        isSuccess={isSuccess}
        items={[]}
        onClick={(hid) => updateEntityOnFavorite(hid)}
        to="/dashboard/entity"
      />
      <Subpanel
        label="All entities"
        showError={isError}
        showEntities={showEntities}
        setShowEntities={() => setShowEntities(!showEntities)}
        isLoading={isLoading}
        isSuccess={isSuccess}
        items={sortedEntities}
        onClick={(hid) => updateEntityOnFavorite(hid)}
        to="/dashboard/entity"
      />
    </section >
  )
}
