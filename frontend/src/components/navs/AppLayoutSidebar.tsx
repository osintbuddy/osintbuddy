import type { MouseEventHandler } from "preact/compat";
import { Link, NavLink } from "react-router-dom";
import { CogIcon, HomeIcon, VariableIcon } from "@heroicons/react/24/outline";
import HamburgerMenu from "./HamburgerMenu";
import Logo  from "@/assets/images/logo.svg";
import { Icon } from "../Icons";

const navigation = [
  { name: <><span>Dashboard</span></>, to: "/dashboard", icon: HomeIcon },
  { name: <><span>Workspace</span></>, to: "/workspaces", icon: VariableIcon },
];


interface AppLayoutSidebarProps {
  showSidebar: boolean
  toggleSidebar: MouseEventHandler<HTMLButtonElement>
}

export default function AppLayoutSidebar({ showSidebar, toggleSidebar }: AppLayoutSidebarProps) {
  return (
    <div class={`fixed inset-y-0 flex border-r from-mirage-900/50 to-mirage-900/60 bg-gradient-to-br shadow-xl border-cod-500/40 w-64 flex-col transition-transform duration-100 ${showSidebar ? "translate-x-0" : "-translate-x-52 border-r-2"}`}>
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
          <nav class="flex-1 flex  flex-col">
            {navigation.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                class={`${location.pathname.includes(item.to) && 'active mx-2'}
                    sidebar-link ${!showSidebar ? 'mx-0 ml-0 mr-px' : 'mr-2.5'}`}
              >
                <item.icon
                  class={
                    `transition-all mr-2 flex-shrink-0 h-6 w-6 duration-100 ${location.pathname.includes(item.to) && 'text-slate-400/30'} ${showSidebar ? 'translate-x-0' : 'translate-x-[12.75rem]'}`}
                />
                {item.name}
              </NavLink>
            ))}
            <NavLink
              to="/settings"
              replace
              class={`sidebar-link transition-all mt-auto sidebar-link text-slate-400/30 ${!showSidebar ? "mx-0 ml-0 mr-px" : 'mr-2.5'} ${location.pathname.includes("settings") && "active mx-2"}`}
            >
              <CogIcon
                class={`mr-2 flex-shrink-0 h-6 w-6 duration-100 transition-all ${location.pathname.includes("settings") && '!mr-2 hover:-ml-0.5'} ${showSidebar ? 'translate-x-0' : 'translate-x-[12.75rem]'}`}
              />
              <span>Settings</span> <span class="half-grayscale ml-auto mr-2.5 right-0 opacity-30">🚧</span>
            </NavLink>
            <a
              href="https://discord.gg/b8vW4J4skv"
              class={`sidebar-link ${!showSidebar ? "mx-0 ml-0 mr-px" : 'mr-2.5'}`}
            >
              <Icon
                icon="brand-discord"
                className={`transition-all mr-2 flex-shrink-0 h-6 w-6 duration-100 ${showSidebar ? 'translate-x-0' : 'translate-x-[12.75rem]'}`}
              />
              Discord
            </a>
          </nav>
        </div>
      </div>
    </div>
  )
}