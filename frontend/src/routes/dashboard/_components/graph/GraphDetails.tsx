import { useEffect, useMemo, useRef, useState } from "react"
import { useOutletContext, useParams } from "react-router-dom"
import 'chartist/dist/index.css';
import { BarChart } from "chartist"
import { Graph, useGetGraphQuery, } from "@src/app/api";
import GraphHeader from "./GraphHeader"
import { DashboardContextType } from "../..";
import { GridPanel } from "@src/components/Grid";
import { Responsive, WidthProvider } from "react-grid-layout";
import { useAppSelector } from "@src/app/hooks";
import { selectIsSidebarOpen } from "@src/features/account/accountSlice";

const ResponsiveGridLayout = WidthProvider(Responsive)

export default function GraphDetails() {
  const { hid } = useParams()
  const { data: activeGraph } = useGetGraphQuery({ hid: hid as string })

  const { graphStats, refetchGraphs } = useOutletContext<DashboardContextType>();

  const isSidebarOpen = useAppSelector((state) => selectIsSidebarOpen(state))

  return (
    <>
      <div className="flex flex-col h-screen w-full ">
        <header className="flex w-full">
          <GraphHeader refetchGraphs={async () => await refetchGraphs()} stats={graphStats} graph={activeGraph as Graph} />
        </header>
        <section
          className="relative flex z-10 w-full p-4"
        >
          <div className="w-full border-2 rounded-md bg-mirage-300/40 border-mirage-800/50 relative shadow-sm px-6 mr-4 py-3">
            <h2 className="text-slate-300/80 flex items-end">
              Total Entities <span className="text-6xl ml-auto font-sans font-semibold">{graphStats?.entities_count ?? 0}</span>
            </h2>
          </div>
          <div className="w-full border-2 rounded-md bg-mirage-300/40 border-mirage-800/50 relative shadow-sm px-6 mx-2 py-3">
            <h2 className="text-slate-300/80 flex items-end">
              Total Relationships <span className="text-6xl ml-auto font-sans font-semibold">{graphStats?.edges_count ?? 0}</span></h2>
          </div>
          <div className="w-full border-2 rounded-md bg-mirage-300/40 border-mirage-800/50 relative shadow-sm px-6 ml-4 py-3">
            <h2 className="text-slate-300/80 flex items-end">2nd Degree Entities <span className="text-6xl ml-auto font-sans font-semibold">{graphStats?.second_degree_count ?? 0}</span></h2>
          </div>

        </section>
        <h2 className="text-slate-600 px-4">
          TODO: Add notes here <a className="text-radiance-900" href="https://medevel.com/notion-style-editors-21991/">(editors)</a>
        </h2>
      </div>

    </>
  )
}
