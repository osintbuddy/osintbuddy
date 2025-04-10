import { useParams } from "react-router-dom"
import EntityEditor from "../../../../components/EntityEditor/EntityEditor";
import { useGetEntityQuery } from "@src/app/api";
import EditEntityNode from "@src/routes/graph/_components/EntityEditNode";
import { ReactFlowProvider } from "reactflow";
import 'reactflow/dist/style.css';

export default function EntityDetailsPage() {
  const { hid = "" } = useParams()
  const { isLoading, data: activeEntity, refetch: refetchEntity } = useGetEntityQuery({ hid })
  return (
    <>
      <div className="flex flex-col h-screen w-full">
      <span className="text-slate-500 px-2 pt-2">TODO: Create visual entity builder and replace code viewer here</span>
      <section className="flex w-full h-full relative px-2">
          <EntityEditor showTaskbar={false} activeEntity={activeEntity} refetchEntity={refetchEntity} />
        </section>
      </div>
    </>
  )
}
