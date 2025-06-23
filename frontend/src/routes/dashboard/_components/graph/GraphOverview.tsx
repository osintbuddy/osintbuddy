import { useMemo } from "preact/hooks";
import { useOutletContext } from "react-router-dom";
import { DashboardContextType } from "../..";

export default function GraphOverview() {
  const { graphsData } = useOutletContext<DashboardContextType>();

  const graphs = useMemo(() => {
    const sortedGraphs = graphsData?.graphs.slice() ?? [];
    sortedGraphs.sort((a: any, b: any) => b.created.localeCompare(a.created));
    return sortedGraphs ?? [];
  }, [graphsData]);

  const favoriteGraphs = useMemo(() => {
    const sortedGraphs = graphsData?.favorite_graphs.slice() ?? [];
    sortedGraphs.sort((a: any, b: any) => b.created.localeCompare(a.created));
    return sortedGraphs ?? [];
  }, [graphsData]);

  return (
    <>
      <div className="w-full items-center justify-center my-auto relative -top-16">
        <div className="flex flex-col items-center justify-center text-slate-400">
          <div className="max-w-2xl w-full backdrop-blur-xl from-mirage-300/20 bg-gradient-to-br from-40% to-mirage-500/20 border-mirage-300/20 border rounded-md grid place-items-start px-24 py-14">
            {favoriteGraphs.length === 0 && graphs.length === 0 && (
              <>
                <h1 className="text-slate-300/80 text-3xl leading-4 lg:text-4xl font-bold pr-2 font-display">
                  Oh no!
                </h1>
                <p className="pt-4 max-w-xl text-slate-300/80">
                  We're usually a treasure chest of knowledge, but we couldn't
                  find any graphs. Get started by creating a new graph
                </p>
              </>
            )}
            {(graphs.length > 0 || favoriteGraphs.length > 0) && (
              <>
                <h1 className="text-slate-300/80 text-3xl lg:text-4xl font-bold pr-2">
                  {graphs.length + favoriteGraphs.length}{" "}
                  {favoriteGraphs.length + graphs.length > 1
                    ? "graphs"
                    : "graph"}{" "}
                  available
                </h1>
                <p className="md:pt-4 max-w-xl text-slate-300/80">
                  Get started by selecting an existing graph from the sidebar on
                  the left or you can create a new graph with the button located
                  towards the bottom left
                </p>
              </>
            )}
          </div>
          <div className="max-w-2xl w-full backdrop-blur-xl from-mirage-300/20 bg-gradient-to-br from-40% to-mirage-500/20 border-mirage-300/20 border rounded-md grid place-items-start my-5 py-10 mt-8 px-24">
            <h1 className="text-slate-300/80 text-3xl lg:text-4xl font-bold border-b-3 pr-2 border-b-primary-400 font-display leading-9">
              The availability bias{" "}
            </h1>
            <p className="py-3 max-w-xl text-slate-300/80">
              Remember, data presentation can impact results during exploration
              and analysis. Availability bias is the tendency to think readily
              available examples are more representative than they really are.
              Even color can influence interpretation.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
