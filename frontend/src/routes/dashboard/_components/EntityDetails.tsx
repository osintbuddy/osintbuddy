import { useParams, useOutletContext } from "react-router-dom"
import { Icon } from "@/components/icons";
import { formatPGDate } from "@/app/utilities";
import { useAuthStore, useEntitiesStore } from "@/app/store";
import { Entity, entitiesApi } from "@/app/api";
import type { DashboardContextType } from "../index";
import Button from "@/components/buttons";

export default function EntityDetailsPage() {
  const { hid = "" } = useParams()
  const context = useOutletContext<DashboardContextType>();

  // Convert hid to number for API call
  const entityId = parseInt(hid);
  const isValidId = !isNaN(entityId) && entityId > 0;

  // Use the useEntity hook to fetch specific entity data (only if valid ID)
  const {
    entity: activeEntity,
    isLoadingEntity: isLoading,
    entityError,
    refetchEntity
  } = useEntity(isValidId ? entityId : 0);


  // Handle invalid ID case
  if (!isValidId) {
    return (
      <div className="flex flex-col h-screen w-full">
        <div className="flex">
          <section className="flex flex-col h-full relative px-2">
            <div className="max-w-6xl min-w-full from-mirage-300/30 bg-gradient-to-tr from-40% to-mirage-100/20 border-mirage-400 border rounded-md grid place-items-center py-6 px-12 mx-auto">
              <p className="text-red-400">Invalid entity ID: {hid}</p>
            </div>
          </section>
        </div>
      </div>
    );
  }
  return (
    <>
      <div className="flex flex-col h-screen w-full">
        <span className="text-slate-500 px-2 pt-2">TODO: Create a visual entity builder for this page</span>

        <div className="flex">
          <section className="flex flex-col  h-full relative px-2">
            {isLoading ? (
              <div className="max-w-6xl min-w-full from-mirage-300/30 bg-gradient-to-tr from-40% to-mirage-100/20 border-mirage-400 border rounded-md grid place-items-center py-6 px-12 mx-auto">
                <p className="text-slate-300/80">Loading entity...</p>
              </div>
            ) : entityError ? (
              <div className="max-w-6xl min-w-full from-mirage-300/30 bg-gradient-to-tr from-40% to-mirage-100/20 border-mirage-400 border rounded-md grid place-items-center py-6 px-12 mx-auto">
                <p className="text-red-400">Error loading entity: {entityError}</p>
              </div>
            ) : !entity ? (
              <div className="max-w-6xl min-w-full from-mirage-300/30 bg-gradient-to-tr from-40% to-mirage-100/20 border-mirage-400 border rounded-md grid place-items-center py-6 px-12 mx-auto">
                <p className="text-yellow-400">Entity not found (ID: {hid})</p>
              </div>
            ) : (
              <div className="max-w-6xl min-w-full from-mirage-300/30 bg-gradient-to-tr from-40% to-mirage-100/20 border-mirage-400 border rounded-md grid place-items-start py-6 px-12 mx-auto">
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
                  Source: <span className="font-bold text-md">{entity?.source || 'No source specified'}</span>
                </p>
                <p className="pt-2 max-w-xl text-xs text-slate-300/80">
                  Created on <span className="font-bold">{entity?.ctime ? formatPGDate(entity.ctime) : 'Unknown'}</span>
                </p>
                <p className="pt-2 max-w-xl text-xs text-slate-300/80">
                  Last edited on <span className="font-bold">{entity?.mtime ? formatPGDate(entity.mtime) : 'Unknown'}</span>
                </p>
              </div>
            )}
            {/* <div className="flex items-center justify-center w-full">
          <EntityEditor showTaskbar={false} activeEntity={activeEntity} refetchEntity={refetchEntity} />
          </div> */}
          </section>
        </div>
      </div>
    </>
  )
}
