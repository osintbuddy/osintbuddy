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

interface GraphPanelProps {
  graphsData: {
    graphs: any[]
    favorites: string[]
  }
  isLoading: boolean
  isError: boolean
  isSuccess: boolean
  favoriteGraph: (graphId: string) => void
  unfavoriteGraph: (graphId: string) => void
}

export function GraphPanel({
  graphsData,
  isLoading,
  isError,
  isSuccess,
  favoriteGraph,
  unfavoriteGraph
}: GraphPanelProps) {
  const [showAllGraphs, setShowAllGraphs] = useState(true);
  const [showFavoriteGraphs, setShowFavoriteGraphs] = useState(true);

  const favoriteGraphs = useMemo(() => {
    if (!graphsData?.favorites || !graphsData?.graphs) return [];
    const favoriteIds = new Set(graphsData.favorites);
    const filteredGraphs = graphsData.graphs.filter(graph => favoriteIds.has(graph.id));
    filteredGraphs.sort((a, b) => b.ctime.localeCompare(a.ctime));
    return filteredGraphs.map(graph => ({ ...graph, is_favorite: true }));
  }, [graphsData?.favorites, graphsData?.graphs])

  const graphs = useMemo(() => {
    if (graphsData?.graphs) {
      const favoriteIds = new Set(graphsData?.favorites || []);
      // Filter out favorited graphs from "All Graphs" section
      const nonFavoriteGraphs = graphsData.graphs.filter(graph => !favoriteIds.has(graph.id));
      nonFavoriteGraphs.sort((a, b) => b.ctime.localeCompare(a.ctime))
      return nonFavoriteGraphs.map(graph => ({
        ...graph,
        is_favorite: false
      }));
    }
    return []
  }, [graphsData?.graphs, graphsData?.favorites])

  const updateFavorites = async (graphId: string) => {
    try {
      const isFavorited = graphsData?.favorites?.includes(graphId)
      if (isFavorited) {
        await unfavoriteGraph(graphId)
      } else {
        await favoriteGraph(graphId)
      }
    } catch (error) {
      console.error('Error updating favorite status:', error)
    }
  }

  return (
    <section class="flex flex-col justify-between relative shrink overflow-clip">
      <Subpanel
        label="Favorites"
        showError={isError}
        showEntities={showFavoriteGraphs}
        setShowEntities={() => setShowFavoriteGraphs(!showFavoriteGraphs)}
        isLoading={isLoading}
        isSuccess={isSuccess}
        items={favoriteGraphs}
        onClick={async (hid) => await updateFavorites(hid)}
        to="/dashboard/graph"
        dateLabel="Created"
        dateKey="created"
      />
      <Subpanel
        label="All graphs"
        showError={isError}
        showEntities={showAllGraphs}
        setShowEntities={() => setShowAllGraphs(!showAllGraphs)}
        isLoading={isLoading}
        isSuccess={isSuccess}
        items={graphs}
        onClick={async (hid) => await updateFavorites(hid)}
        to="/dashboard/graph"
        dateLabel="Created"
        dateKey="created"
      />
    </section>
  )
}



interface EntitiesPanelProps {
  entitiesData: {
    entities: any[]
    favorites: string[]
  }
  isLoading: boolean
  isError: boolean
  isSuccess: boolean
  favoriteEntity: (entityId: string) => void
  unfavoriteEntity: (entityId: string) => void
}

export function EntitiesPanel({
  entitiesData,
  isLoading,
  isError,
  isSuccess,
  favoriteEntity,
  unfavoriteEntity
}: EntitiesPanelProps) {
  const [showFavoriteEntities, setShowFavoriteEntities] = useState<boolean>(true);
  const [showEntities, setShowEntities] = useState(true);

  const favoriteEntities = useMemo(() => {
    if (!entitiesData?.favorites || !entitiesData?.entities) return [];
    const favoriteIds = new Set(entitiesData.favorites);
    const filteredEntities = entitiesData.entities.filter(entity => favoriteIds.has(entity.id));
    filteredEntities.sort((a, b) => b.ctime.localeCompare(a.ctime));
    return filteredEntities.map(entity => ({ ...entity, is_favorite: true }));
  }, [entitiesData?.favorites, entitiesData?.entities])

  const sortedEntities = useMemo(() => {
    if (entitiesData?.entities) {
      const favoriteIds = new Set(entitiesData?.favorites || []);
      // Filter out favorited entities from "All Entities" section
      const nonFavoriteEntities = entitiesData.entities.filter(entity => !favoriteIds.has(entity.id));
      nonFavoriteEntities.sort((a, b) => b.ctime.localeCompare(a.ctime));
      return nonFavoriteEntities.map(entity => ({
        ...entity,
        is_favorite: false
      }));
    }
    return []
  }, [entitiesData?.entities, entitiesData?.favorites])

  const updateEntityFavorites = async (entityId: string) => {
    try {
      const isFavorited = entitiesData?.favorites?.includes(entityId)
      if (isFavorited) {
        await unfavoriteEntity(entityId)
      } else {
        await favoriteEntity(entityId)
      }
    } catch (error) {
      console.error('Error updating favorite status:', error)
    }
  }


  return (
    <section className="flex flex-col justify-between relative shrink overflow-clip">
      <Subpanel
        label="Favorites"
        showError={isError}
        showEntities={showFavoriteEntities}
        setShowEntities={() => setShowFavoriteEntities(!showFavoriteEntities)}
        isLoading={isLoading}
        isSuccess={isSuccess}
        items={favoriteEntities}
        onClick={async (hid) => await updateEntityFavorites(hid)}
        to="/dashboard/entity"
        dateLabel="Created"
        dateKey="ctime"
      />
      <Subpanel
        label="All entities"
        showError={isError}
        showEntities={showEntities}
        setShowEntities={() => setShowEntities(!showEntities)}
        isLoading={isLoading}
        isSuccess={isSuccess}
        items={sortedEntities}
        onClick={async (hid) => await updateEntityFavorites(hid)}
        to="/dashboard/entity"
        dateLabel="Created"
        dateKey="ctime"
      />
    </section >
  )
}
