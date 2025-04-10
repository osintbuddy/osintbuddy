import { useParams } from "react-router-dom"
import EntityEditor from "../../../../components/EntityEditor/EntityEditor";
import { useGetEntityQuery } from "@src/app/api";
import EditEntityNode from "@src/routes/graph/_components/EntityEditNode";
import { ReactFlowProvider } from "reactflow";
import 'reactflow/dist/style.css';
import { Icon } from "@src/components/Icons";
import { formatPGDate } from "@src/app/utilities";

export default function EntityDetailsPage() {
  const { hid = "" } = useParams()
  const { isLoading, data: activeEntity = { blueprint: { data: {} } }, refetch: refetchEntity } = useGetEntityQuery({ hid })
  const entity = { ...activeEntity.blueprint.data }
  console.log('entity', activeEntity)
  return (
    <>
      <div className="flex flex-col h-screen w-full">
        <span className="text-slate-500 px-2 pt-2">TODO: Create a visual entity builder for this page</span>

        <div className="flex">
        <section className="flex flex-col  h-full relative px-2">
        <div className="max-w-6xl min-w-full from-mirage-300/30 bg-gradient-to-tr from-40% to-mirage-100/20 border-mirage-400 border rounded-md grid place-items-start py-6 px-12 mx-auto">
          <h1 className="text-slate-300/80 flex items-center text-3xl lg:text-4xl font-bold border-b-2 pr-2 w-full" style={{ borderBottomColor: activeEntity.blueprint.data.color }}>
            <Icon icon={activeEntity.blueprint.data.icon ?? 'point'} className="h-10 w-10 mr-2.5" />
            <span className="w-full">
            {activeEntity.blueprint.data.label ?? ''}
            </span>
          </h1>
          <p className="pt-4 max-w-xl text-slate-300/80">
          {activeEntity?.description === '' ? `No description was found for the ${activeEntity.label.toLowerCase()} entity.` : activeEntity.description  }
          </p>
          <div className="flex items-center justify-between">
            <p className="pt-2 max-w-xl text-xs text-slate-300/80">
          Created by <span className="font-bold">{activeEntity?.author === '' ? `Unknown` : activeEntity.author}</span>
          </p>
          
          </div>
          <p className="pt-2 max-w-xl text-xs text-slate-300/80">
          Total transforms <span className="font-bold text-md">{activeEntity?.transforms?.length}</span>
          </p>
          <p className="pt-2 max-w-xl text-xs text-slate-300/80">
          Last edited on <span className="font-bold">{formatPGDate(activeEntity.last_edit)}</span>
          </p>
        </div>
          {/* <div className="flex items-center justify-center w-full">
          <EntityEditor showTaskbar={false} activeEntity={activeEntity} refetchEntity={refetchEntity} />
          </div> */}
        </section>
        </div>
      </div>
    </>
  )
}
