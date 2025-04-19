import { Graph, useDeleteGraphMutation } from "@src/app/api";
import { formatPGDate } from "@src/app/utilities";
import { ClockIcon, EyeIcon, FingerPrintIcon, ScaleIcon, TrashIcon, UserIcon } from "@heroicons/react/24/outline";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

interface GraphHeaderProps {
  graph: Graph;
  stats: any;
  refetchGraphs: () => Promise<void>;
}

export default function GraphHeader({ graph, stats, refetchGraphs }: GraphHeaderProps) {
  const navigate = useNavigate()
  const [deleteGraph] = useDeleteGraphMutation()

  return (
    <div className="flex flex-col w-full px-4 ">
      <div className="flex w-full  border-2 rounded-b-md bg-mirage-800/50 border-mirage-800/40 relative shadow">
        <div className=" w-full mx-auto">
          <section className="flex flex-col items-start justify-between  lg:items-center py-4 px-6 lg:flex-row md:flex-row md:items-center  relative">
            <div className="flex flex-col w-full ">
              <h3 className="text-lg font-semibold whitespace-nowrap leading-normal text-slate-300">
                {graph?.label}
              </h3>
              <p className="text-sm leading-normal whitespace-normal truncate max-w-6xl text-slate-400">
                {graph?.description}
              </p>
            </div>
            <div className="flex w-full gap-x-4 mt-auto relative items-center">
              <button
                onClick={async () => {
                  await deleteGraph({ hid: graph.id })
                    .then(() => {
                      navigate('/dashboard/graph', { replace: true })
                    })
                    .catch((error) => {
                      console.error(error)
                      toast.error("We ran into an error deleting your graph. Please try again")
                    })
                  await refetchGraphs()
                }}
                className="btn-danger ml-auto"
              >
                Delete graph
                <TrashIcon className="text-inherit h-5 w-5 ml-2" />
              </button>
              <Link
                to={`/graph/${graph?.id}`}
                className='btn-primary stroke-primary-300/90 hover:!stroke-primary-400/80'
              >
                Open graph
                <EyeIcon className='ml-2 w-5 h-5 stroke-inherit' />
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}