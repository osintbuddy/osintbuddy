import { useParams } from "react-router-dom"
import { Icon } from "@/components/icons";
import { formatPGDate } from "@/app/utilities";
import { useEntityStore } from "@/app/store";
import EntityEditor from "@/components/EntityEditor/EntityEditor";
import { useEffect } from "preact/hooks";

export default function EntityDetailsPage() {
  const { hid = "" } = useParams()

  // Use the useEntity hook to fetch specific entity data (only if valid ID)
  const {
    entity,
    error,
    getEntity
  } = useEntityStore();
  console.log('isLoadingEntity', entity)
  useEffect(() => getEntity(hid), [hid])

  return (
    <div className="flex flex-col items-center justify-center w-full">

      <div className="flex">
        <section className="flex flex-col  h-full relative px-2">
          <div className="min-w-2xl max-w-6xl from-mirage-300/30 bg-gradient-to-tr from-40% to-mirage-100/20 border-mirage-400 border rounded-md grid place-items-start py-6 px-12 mx-auto">
            <h1 className="text-slate-300/80 flex items-center text-3xl lg:text-4xl font-bold border-b-2 pr-2 w-full border-primary-400">
              <Icon icon="ghost-3" className="h-10 w-10 mr-2.5" />
              <span className="w-full">
                {entity?.label || 'Unknown Entity'}
              </span>
            </h1>
            <p className="pt-4 max-w-xl text-slate-300/80">
              {entity?.description || `No description was found for the ${entity?.label?.toLowerCase() || 'entity'}.`}
            </p>
            <div className="flex items-center justify-between">
              <p className="pt-2 max-w-xl text-xs text-slate-300/80">
                Created by <span className="font-bold">{entity?.author || 'Unknown'}</span>
              </p>
            </div>
            <p className="pt-2 max-w-xl text-xs text-slate-300/80">
              Created on <span className="font-bold">{entity?.ctime ? formatPGDate(entity.ctime) : 'Unknown'}</span>
            </p>
            <p className="pt-2 max-w-xl text-xs text-slate-300/80">
              Last edited on <span className="font-bold">{entity?.mtime ? formatPGDate(entity.mtime) : 'Unknown'}</span>
            </p>
          </div>
          <div className="flex items-center justify-center w-full">
            <EntityEditor entity={entity} />
          </div>
        </section>
      </div>
      <span className="text-slate-500 px-2 pt-2">TODO: Create a visual entity builder for this page</span>

    </div>
  )
}
