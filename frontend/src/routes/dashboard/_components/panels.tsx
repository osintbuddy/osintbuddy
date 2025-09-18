import { useState, useMemo } from 'preact/hooks'
import Subpanel from './Subpanel'

export function MarketPanel() {
  const [showProviders, setShowProviders] = useState(false)
  const [showCommunityPlugins, setShowCommunityPlugins] = useState(false)

  return (
    <>
      <Subpanel
        label='Community'
        showError={true}
        show={showCommunityPlugins}
        setShow={() => setShowCommunityPlugins(!showCommunityPlugins)}
        isLoading={false}
        items={[]}
        onClick={async (hid: string) => null}
        to='/dashboard/case'
        isFavorite={true}
        errorMessage={
          'The market might be here eventually... Follow the project on discord to get the latest updates'
        }
      />
      <Subpanel
        label='Providers'
        showError={true}
        show={showProviders}
        setShow={() => setShowProviders(!showProviders)}
        isLoading={false}
        items={[]}
        onClick={async (hid: string) => null}
        to='/dashboard/case'
        errorMessage={
          'The market might be here eventually... Follow the project on discord to get the latest updates'
        }
      />
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
  favoriteGraph,
  unfavoriteGraph,
}: GraphPanelProps) {
  const [showAllGraphs, setShowAllGraphs] = useState(true)
  const [showFavoriteGraphs, setShowFavoriteGraphs] = useState(true)

  const favoriteGraphs = useMemo(() => {
    if (!graphsData?.favorites || !graphsData?.graphs) return []
    const favoriteIds = new Set(graphsData.favorites)
    const filteredGraphs = graphsData.graphs.filter((graph) =>
      favoriteIds.has(graph.id)
    )
    filteredGraphs.sort((a, b) => b.ctime.localeCompare(a.ctime))
    return filteredGraphs.map((graph) => ({ ...graph, is_favorite: true }))
  }, [graphsData?.favorites, graphsData?.graphs])

  const graphs = useMemo(() => {
    if (graphsData?.graphs) {
      const favoriteIds = new Set(graphsData?.favorites || [])
      // Filter out favorited graphs from "All Graphs" section
      const nonFavoriteGraphs = graphsData.graphs.filter(
        (graph) => !favoriteIds.has(graph.id)
      )
      nonFavoriteGraphs.sort((a, b) => b.ctime.localeCompare(a.ctime))
      return nonFavoriteGraphs.map((graph) => ({
        ...graph,
        is_favorite: false,
      }))
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
    <>
      <Subpanel
        label='Watchlist'
        showError={isError}
        show={showFavoriteGraphs}
        setShow={() => setShowFavoriteGraphs(!showFavoriteGraphs)}
        isLoading={isLoading}
        items={favoriteGraphs}
        onClick={async (hid) => await updateFavorites(hid)}
        isFavorite={true}
        to='/dashboard/case'
      />
      <Subpanel
        label='All cases'
        showError={isError}
        show={showAllGraphs}
        setShow={() => setShowAllGraphs(!showAllGraphs)}
        isLoading={isLoading}
        items={graphs}
        onClick={async (hid) => await updateFavorites(hid)}
        to='/dashboard/case'
      />
    </>
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
  favoriteEntity,
  unfavoriteEntity,
}: EntitiesPanelProps) {
  const [showFavoriteEntities, setShowFavoriteEntities] =
    useState<boolean>(true)
  const [showEntities, setShowEntities] = useState(true)

  const favoriteEntities = useMemo(() => {
    if (!entitiesData?.favorites || !entitiesData?.entities) return []
    const favoriteIds = new Set(entitiesData.favorites)
    const filteredEntities = entitiesData.entities.filter((entity) =>
      favoriteIds.has(entity.id)
    )
    filteredEntities.sort((a, b) => b.ctime.localeCompare(a.ctime))
    return filteredEntities.map((entity) => ({
      ...entity,
      is_favorite: true,
    }))
  }, [entitiesData?.favorites, entitiesData?.entities])

  const sortedEntities = useMemo(() => {
    if (entitiesData?.entities) {
      const favoriteIds = new Set(entitiesData?.favorites || [])
      // Filter out favorited entities from "All Entities" section
      const nonFavoriteEntities = entitiesData.entities.filter(
        (entity) => !favoriteIds.has(entity.id)
      )
      nonFavoriteEntities.sort((a, b) => b.ctime.localeCompare(a.ctime))
      return nonFavoriteEntities.map((entity) => ({
        ...entity,
        is_favorite: false,
      }))
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
    <>
      <Subpanel
        label='Favorites'
        showError={isError}
        show={showFavoriteEntities}
        setShow={() => setShowFavoriteEntities(!showFavoriteEntities)}
        isLoading={isLoading}
        items={favoriteEntities}
        onClick={async (hid) => await updateEntityFavorites(hid)}
        to='/dashboard/entities'
        isFavorite={true}
      />
      <Subpanel
        label='All entities'
        showError={isError}
        show={showEntities}
        setShow={() => setShowEntities(!showEntities)}
        isLoading={isLoading}
        items={sortedEntities}
        onClick={async (hid) => await updateEntityFavorites(hid)}
        to='/dashboard/entities'
      />
    </>
  )
}
