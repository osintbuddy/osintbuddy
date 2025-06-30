import { Link, useParams } from "react-router-dom";
import { ChevronDownIcon } from "@heroicons/react/20/solid";
import { StarIcon } from "@heroicons/react/24/outline";
import { formatPGDate } from "@/app/utilities";

export function GraphLoaderCard() {
  return (
    <>
      <div class="mb-2">
        <div class="w-full py-6 space-y-1 rounded-md rounded-r-none border border-mirage-400/60  from-mirage-400/50 to-mirage-400/30 shadow bg-gradient-to-tl from-10%  before:absolute  px-4  via-mirage-400/10 relative before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-mirage-300/5 before:to-transparent isolate overflow-hidden shadow-black/5 border-l border-y">
          <div class="space-y-3">
            <div class="h-2 w-3/5 rounded-lg bg-slate-600/20 animate-pulse"></div>
            <div class="h-2 w-4/5 rounded-lg bg-slate-600/20 animate-pulse"></div>
            <div class="h-2 w-2/5 rounded-lg bg-slate-600/20 animate-pulse"></div>
          </div>
        </div>
      </div>
    </>
  );
}

interface SubpanelProps {
  showError: any;
  showEntities: boolean;
  isLoading: boolean | undefined;
  setShowEntities: () => void;
  isSuccess: boolean | undefined;
  label: string;
  onClick: (hid: string) => void;
  items: JSONObject[] | undefined; // Entity[] | Graph[]
  to: "/dashboard/entity" | "/dashboard/graph";
  errorMessage?: string | null;
  dateLabel?: string;
  dateKey?: string;
}

export default function Subpanel({
  showError,
  showEntities,
  isLoading,
  setShowEntities,
  isSuccess,
  label,
  onClick,
  items,
  to,
  errorMessage,
  dateLabel = "Last edit",
  dateKey = "last_edit",
}: SubpanelProps) {
  const { hid } = useParams();
  return (
    <div class="subpanel">
      <header class="subpanel-header" onClick={setShowEntities}>
        <h2>{label}</h2>
        <ChevronDownIcon
          class={
            `show-header-icon-${showEntities}` +
            " transition-transform duration-100"
          }
        />
      </header>
      {showError && showEntities && !isLoading && (
        <>
          <p>
            {errorMessage?.length ? (
              <p class="text-slate-400/60 text-sm px-2">{errorMessage}</p>
            ) : (
              <>
                We ran into an error fetching your data. Please try refreshing
                the page, if this error continues to occur please{" "}
                <a href="#" class="text-info-300">
                  file an issue
                </a>{" "}
                on github
              </>
            )}
          </p>
        </>
      )}
      {showEntities && isLoading && !showError && (
        <>
          <GraphLoaderCard />
          <GraphLoaderCard />
        </>
      )}
      <div
        class={` transition-transform duration-150 ease-out ${showEntities ? "translate-y-0" : "-translate-y-[45%] -scale-y-0 !h-0"}`}
      >
        {items &&
          items.map((item) => {
            const isActive = hid === `${item.id}`;
            const descriptionClassName = `subpanel-desc subpanel-desc-${isActive}`;
            return (
              <Link
                key={item.id}
                to={`${to}/${item.id}`}
                className={`subpanel-link subpanel-link-${isActive} ${isSuccess && showEntities ? "translate-y-0 scale-y-100" : "-translate-y-full  scale-y-0 "}`}
              >
                <div>
                  <p class={`subpanel-label-${isActive} subpanel-label`}>
                    {item.label}
                  </p>
                  <p class={descriptionClassName}>{item.description}</p>
                  <p class={descriptionClassName}>
                    <span className="font-sans">{dateLabel} </span>{" "}
                    {formatPGDate(item[dateKey])}
                  </p>
                </div>
                <StarIcon
                  onClick={async () => await onClick(item.id)}
                  class={`link-icon link-icon-${item.is_favorite} link-active-${hid !== item.id}`}
                />
              </Link>
            );
          })}
      </div>
    </div>
  );
}
