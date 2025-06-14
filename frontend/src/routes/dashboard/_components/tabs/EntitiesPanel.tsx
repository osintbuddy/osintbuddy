import { useMemo, useState } from "preact/hooks";
import Subpanel from "../Subpanel";


export default function EntitiesPanel({
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
      return c-d
    })
    return sortedEntities
  }, [entities])


  const updateEntityOnFavorite = (hid: string) => {
    // updateEntityIsFavorite({ hid })
    refetchEntities()
  }

  return (
    <section className="subpanel-wrapper">
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
