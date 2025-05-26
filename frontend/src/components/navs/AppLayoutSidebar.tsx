import type { MouseEventHandler } from "preact/compat";
import { Link, NavLink } from "react-router-dom";
import { CogIcon, HomeIcon, VariableIcon } from "@heroicons/react/24/outline";
import HamburgerMenu from "./HamburgerMenu";
import Logo  from "@/assets/images/logo.svg";
import { Icon } from "../Icons";

const navigation = [
  { 
    name: <><span>Dashboard</span></>, 
    to: "/dashboard", 
    Icon: HomeIcon,
  },
  { 
    name: <><span>Workspace</span></>, 
    to: "/workspaces", 
    Icon: VariableIcon,
  }
];


interface AppLayoutSidebarProps {
  showSidebar: boolean
  toggleSidebar: MouseEventHandler<HTMLButtonElement>
}

export default function AppLayoutSidebar({ showSidebar, toggleSidebar }: AppLayoutSidebarProps) {
  return (
    <div class={`fixed inset-y-0 flex border-r from-cod-800/50 to-cod-800/40 bg-gradient-to-br shadow-xl border-cod-600/40 w-64 flex-col transition-transform duration-100 ${showSidebar ? "translate-x-0" : "-translate-x-52 border-r-2"}`}>
      <div class="flex min-h-0 flex-1 flex-col mt-2 ">
        <div class={`flex h-10 my-1 flex-shrink-0 items-center justify-between ${showSidebar ? "px-3.5" : "px-1"}`}>
          <Link to="/" replace>
            <img src={Logo} class="h-7 ml-1 w-auto fill-slate-400" />
          </Link>
          <HamburgerMenu
            isOpen={showSidebar}
            className={!showSidebar ? 'mr-1.5' : ''}
            onClick={toggleSidebar}
          />
        </div>
        <div class="flex flex-1 flex-col overflow-y-auto">
          <nav class="flex-1 flex flex-col mt-px">
            {navigation.map(({ Icon, to, name }) => (
              <NavLink
                key={to}
                to={to}
                className={` sidebar-link ${location.pathname.includes(to) && 'active mx-2'} ${!showSidebar ? 'mx-0 ml-0 mr-px' : 'mr-2.5 ml-2.5'}`}
              >
                <Icon className={
                    `transition-all mr-2 flex-shrink-0 h-6 w-6 duration-100 ${location.pathname.includes(to) && 'text-slate-400/30'} ${showSidebar ? 'translate-x-0' : 'translate-x-[12.75rem]'}`} />
                {name}
              </NavLink>
            ))}
            <div className="mt-auto">
            <NavLink
              to="/settings"
              replace
              className={`sidebar-link transition-all mt-auto text-slate-400/30 ${!showSidebar ? "mx-0 ml-0 mr-px" : 'mr-2.5'} ${location.pathname.includes("settings") && "active mx-2"}`}
            >
              <CogIcon
                class={`mr-2 flex-shrink-0 h-6 w-6 duration-100 transition-all ${location.pathname.includes("settings") && '!mr-2 hover:-ml-0.5'} ${showSidebar ? 'translate-x-0' : 'translate-x-[12.75rem]'}`}
              />
              <span>Settings</span> <span class="half-grayscale ml-auto mr-2.5 right-0 opacity-30">🚧</span>
            </NavLink>
            <a
              href="https://github.com/osintbuddy"
              class={`sidebar-link ${!showSidebar ? "mx-0 ml-0 mr-px" : 'mr-2.5'}`}
            >
              <Icon
                icon="brand-github"
                className={`transition-all mr-2 flex-shrink-0 h-6 w-6 duration-100 ${showSidebar ? 'translate-x-0' : 'translate-x-[12.75rem]'}`}
              />
              Github
            </a>
            </div>
          </nav>
        </div>
      </div>
    </div>
  )
}