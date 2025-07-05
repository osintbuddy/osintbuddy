import { useMemo } from "preact/hooks";
import { useOutletContext } from "react-router-dom";
import { DashboardContextType } from "..";

export function EntitiesOverview() {
  const { entities: entitiesData } = useOutletContext<DashboardContextType>();
  return (
    <>
      <div className="w-full items-center justify-center my-auto relative -top-16">
        <div className="flex flex-col items-center justify-center text-slate-400">
          <div className="max-w-2xl w-full  backdrop-blur-xl from-mirage-300/20 bg-gradient-to-br from-40% to-mirage-500/20 border-mirage-300/20 border rounded-md grid place-items-start py-14 px-24 ">
            {entitiesData.length === 0 && (
              <>
                <h1 className="text-slate-300/80 text-3xl leading-4 lg:text-4xl font-semibold pr-2 font-display">
                  Oh no!
                </h1>
                <p className="md:pt-4 max-w-xl text-slate-300/80">
                  We're usually a treasure chest of knowledge, but we couldn't
                  find any entities. Read the OSINTBuddy docs to get setup
                </p>
              </>
            )}
            {entitiesData.length > 0 && (
              <>
                <h1 className="text-slate-300/80 text-3xl lg:text-4xl font-semibold pr-2">
                  {entitiesData.length}{" "}
                  {entitiesData.length > 1 ? "entities" : "entity"} available
                </h1>
                <p className="md:pt-4 max-w-xl text-slate-300/80">
                  View entity information by selecting one from the sidebar on
                  the left or you can create a new entity for your workspace
                  with the button located towards the bottom left
                </p>
              </>
            )}
          </div>
          <div className="max-w-2xl w-full backdrop-blur-xl from-mirage-300/20 bg-gradient-to-br from-40% to-mirage-500/20 border-mirage-300/20 border rounded-md grid place-items-start  my-5 py-10 mt-8 px-24">
            <h1 className="text-slate-300/80 text-3xl lg:text-4xl font-semibold font-display border-b-3 pr-2 border-b-primary-400 leading-9">
              Confirmation bias
            </h1>
            <p className="py-3 max-w-xl text-slate-300/80">
              To search for, interpret, favor and recall information in a way
              that confirms one's prior beliefs. What you search for matters.
              Remember that a small change in a question's wording can affect
              how you search through available information.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}


export function GraphOverview() {
  const { graphs, favoriteGraphs } = useOutletContext<DashboardContextType>();
  const sortedGraphs = useMemo(() => {
    const sortedGraphs = graphs?.slice().sort((a: any, b: any) => b.ctime.localeCompare(a.ctime));
    return sortedGraphs ?? [];
  }, [graphs]);

  const sortedFavorites = useMemo(() => {
    if (!favoriteGraphs || !graphs) return [];
    const filteredGraphs = graphs.filter(graph => favoriteGraphs.includes(graph.id));
    filteredGraphs.sort((a: any, b: any) => b.ctime.localeCompare(a.ctime));
    return filteredGraphs;
  }, [graphs, favoriteGraphs]);

  return (
    <>
      <div className="w-full items-center justify-center my-auto relative -top-16">
        <div className="flex flex-col items-center justify-center text-slate-400">
          <div className="max-w-2xl w-full backdrop-blur-xl from-mirage-300/20 bg-gradient-to-br from-40% to-mirage-500/20 border-mirage-300/20 border rounded-md grid place-items-start px-24 py-14">
            {sortedFavorites.length === 0 && sortedGraphs.length === 0 && (
              <>
                <h1 className="text-slate-300/80 text-3xl leading-4 lg:text-4xl font-semibold pr-2 font-display">
                  Oh no!
                </h1>
                <p className="pt-4 max-w-xl text-slate-300/80">
                  We're usually a treasure chest of knowledge, but we couldn't
                  find any graphs. Get started by creating a new graph
                </p>
              </>
            )}
            {(sortedGraphs.length > 0 || sortedFavorites.length > 0) && (
              <>
                <h1 className="text-slate-300/80 text-3xl lg:text-4xl font-semibold pr-2">
                  {sortedGraphs.length + sortedFavorites.length}{" "}
                  {sortedFavorites.length + sortedGraphs.length > 1
                    ? "graphs"
                    : "graph"}&nbsp;
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
            <h1 className="text-slate-300/80 text-3xl lg:text-4xl font-semibold border-b-3 pr-2 border-b-primary-400 font-display leading-9">
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
