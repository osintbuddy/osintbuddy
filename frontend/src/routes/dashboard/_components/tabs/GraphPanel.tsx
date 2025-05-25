import { useMemo, useState } from "preact/hooks";
import Subpanel from '../Subpanel';


export function GraphLoaderCard() {
  return (
    <>
      <div className="mb-2">
        <div className="w-full py-6 space-y-5 rounded-md rounded-r-none bg-dark-800  before:absolute  px-4  bg-gradient-to-r from-transparent via-dark-900/10 to-transparent relative before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-dark-700 before:to-transparent isolate overflow-hidden shadow-xl shadow-black/5 border-l border-y border-dark-500">
          <div className="space-y-3">
            <div className="h-2 w-3/5 rounded-lg bg-slate-900 animate-pulse"></div>
            <div className="h-2 w-4/5 rounded-lg bg-slate-900/80 animate-pulse"></div>
            <div className="h-2 w-2/5 rounded-lg bg-slate-900/80 animate-pulse"></div>
          </div>
        </div>
      </div>
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

export default function GraphPanel({
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
    <section class="subpanel-wrapper">
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
