import ButtonGhost from "@/components/buttons/ButtonGhost";
import { EyeIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";

interface GraphHeaderProps {
  graph: any;
  refetchGraphs: any;
}

function GraphHeader({ graph, refetchGraphs }: GraphHeaderProps) {
  const navigate = useNavigate()

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
                onClick={() => {
                  refetchGraphs()
                }}
                className="btn-danger ml-auto"
              >
                Delete graph
                <TrashIcon className="text-inherit h-5 w-5 ml-2" />
              </button>
              <ButtonGhost
                variant='primary'
                onClick={() => navigate(`/graph/${graph?.id}`, { replace: true })}
              >
                Open graph
                <EyeIcon className='btn-icon' />
              </ButtonGhost>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
export default function GraphDetails() {
  const graphStats: any = {};

  return (
    <div class="flex flex-col h-screen w-full ">
      <header class="flex w-full">
        <GraphHeader refetchGraphs={() => null} graph={{}} />
      </header>
      <section class="relative flex z-10 w-full p-4">
        <div class="w-full border-2 rounded-md bg-mirage-300/40 border-mirage-800/50 relative shadow-sm px-6 mr-4 py-3">
          <h2 class="text-slate-300/80 flex items-end">
            Total Entities <span class="text-6xl ml-auto font-sans font-semibold">{graphStats?.entities_count ?? 0}</span>
          </h2>
        </div>
        <div class="w-full border-2 rounded-md bg-mirage-300/40 border-mirage-800/50 relative shadow-sm px-6 mx-2 py-3">
          <h2 class="text-slate-300/80 flex items-end">
            Total Relationships
            <span class="text-6xl ml-auto font-sans font-semibold">
              {graphStats?.edges_count ?? 0}
            </span>
          </h2>
        </div>
        <div class="w-full border-2 rounded-md bg-mirage-300/40 border-mirage-800/50 relative shadow-sm px-6 ml-4 py-3">
          <h2 class="text-slate-300/80 flex items-end">2nd Degree Entities
            <span class="text-6xl ml-auto font-sans font-semibold">
              {graphStats?.second_degree_count ?? 0}
            </span>
          </h2>
        </div>
      </section>
      <h2 class="text-slate-600 px-4">
        TODO: Add notes here <a class="text-radiance-900" href="https://medevel.com/notion-style-editors-21991/">(editors)</a>
      </h2>
    </div>
  )
}
