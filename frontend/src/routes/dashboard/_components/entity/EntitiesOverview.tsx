import { useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { DashboardContextType } from "../..";

export default function EntitiesOverview() {
  const { entitiesData } = useOutletContext<DashboardContextType>();
  return (
    <>
      <div className="w-full items-center justify-center my-auto relative -top-16">
        <div className="flex flex-col items-center justify-center text-slate-400">
          <div className="max-w-2xl w-full  backdrop-blur-sm from-mirage-300/20 bg-gradient-to-tr from-40% to-mirage-500/20 border-mirage-400/80 border rounded-md grid place-items-start  py-16 px-24 ">
            {entitiesData.length === 0 && (
              <>
                <h1 className="text-slate-300/80 text-3xl lg:text-4xl font-bold pr-2 font-display">
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
                <h1 className="text-slate-300/80 text-3xl lg:text-4xl font-bold pr-2">
                  {entitiesData.length ?? ""}{" "}
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
          <div className="max-w-2xl w-full backdrop-blur-sm from-mirage-300/20 bg-gradient-to-tr from-40% to-mirage-500/20 border-mirage-400/80 border rounded-md grid place-items-start  my-5 py-10 mt-8 px-24">
            <h1 className="text-slate-300/80 text-3xl lg:text-4xl font-bold font-display border-b-3 pr-2 border-b-primary-400">
              Confirmation bias
            </h1>
            <p className="md:py-4 max-w-xl text-slate-300/80">
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
