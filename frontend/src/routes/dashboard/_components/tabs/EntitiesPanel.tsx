import { useUpdateEntityFavoriteIdMutation } from "@src/app/api";
import { useMemo, useState } from "react";
import styles from "../subpanel.module.css"
import Subpanel from "../Subpanel";


export default function EntitiesPanel({
  entitiesData,
  isLoading,
  isError,
  isSuccess,
  refetchEntities,
}: JSONObject) {
  const [showFavoriteEntities, setShowFavoriteEntities] = useState<boolean>(true);
  const [showEntities, setShowEntities] = useState(true);

  console.log('entitiesData', entitiesData)

  const entities = useMemo(() => {
    const sortedEntities = entitiesData.entities.slice()
    sortedEntities.sort((a: any, b: any) => b.label.localeCompare(a.label))
    return sortedEntities
  }, [entitiesData])

  const [updateEntityIsFavorite] = useUpdateEntityFavoriteIdMutation()

  const updateEntityOnFavorite = (hid: string) => {
    updateEntityIsFavorite({ hid })
    refetchEntities()
  }

  return (
    <section className={styles["subpanel-wrapper"]}>
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
        items={entities}
        onClick={(hid) => updateEntityOnFavorite(hid)}
        to="/dashboard/entity"
      />
    </section >
  )
}
