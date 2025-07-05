import { Navigate, Outlet, useLocation } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { useAppStore, useAuthStore } from "@/app/store";

import { Link, NavLink, useNavigate } from "react-router-dom";
import HamburgerMenu from "@/components/navs/HamburgerMenu";
import Logo from "@/assets/images/logo.svg";
import { Icon } from "../icons";

interface SidebarProps {
  showSidebar: boolean
  toggleSidebar: () => void
  logout: () => void
}

const navigation = [
  {
    name: "Dashboard",
    to: "/dashboard",
    icon: 'home-infinity',
  },
  {
    name: "Workspace",
    to: "/workspaces",
    icon: 'variable',
  }
];

function AppLayoutSidebar({ showSidebar, toggleSidebar, logout }: SidebarProps) {
  return (
    <div class={`fixed inset-y-0 flex border-r  border-black/10 w-64 flex-col transition-transform duration-200 shadow-2xl shadow-black/15 from-black/50 to-black/40 bg-gradient-to-br backdrop-blur-sm ${showSidebar ? "translate-x-0" : "-translate-x-52 border-r-2"}`}>
      <div class="flex min-h-0 flex-1 flex-col mt-2">
        <div class={`flex h-10 my-1 shrink-0 items-center justify-between ${showSidebar ? "px-3.5" : "px-1"}`}>
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
          <nav class="flex-1 flex flex-col ">
            {navigation.map(({ icon, to, name }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => `flex items-center duration-200 ease-in-out my-1 py-2.5 text-base  rounded-md border z-50 transition-all pl-3 font-medium from-10% pr-1.5 font-display ${isActive ? 'hover:translate-x-px shadow translate-x-px ring-1 ring-primary-400/80 border-primary-400/80 ring-inset bg-gradient-to-tl text-slate-350 from-cod-800/10 to-cod-800/20 ' : 'hover:border-slate-700/10 hover:ring-transparent hover:text-slate-300/60 hover:from-mirage-600/20 hover:to-mirage-600/10  to-mirage-900/10 from-mirage-900/5 border-slate-800/10 shadow hover:translate-x-px text-slate-600/50 -translate-x-px ring-slate-950/10 ring-2 ring-inset bg-gradient-to-br'}  ${showSidebar ? 'mx-2.5' : 'ml-0 mr-px'}`}
              >
                <Icon icon={icon} className={
                  `transition-all mr-2 shrink-0 h-6 w-6 duration-200 text-slate-600/50 ${location.pathname.includes(to) && '!text-primary '} ${showSidebar ? 'translate-x-0' : 'translate-x-[12.75rem]'}`} />
                {name}
              </NavLink>
            ))}
            <div class="mt-auto ">
              <NavLink
                to="/settings"
                replace
                className={({ isActive }) => `flex items-center duration-200 ease-in-out my-1 py-2.5 text-base  rounded-md border   z-50 transition-all pl-3 font-medium  from-10% pr-1.5 font-display ${isActive ? 'hover:translate-x-px shadow translate-x-px ring-1 ring-primary-400/80 border-primary-400/80 ring-inset bg-gradient-to-tl text-slate-350 from-cod-800/10 to-cod-800/20 ' : 'hover:border-slate-700/10 hover:ring-transparent hover:text-slate-300/60 hover:from-mirage-600/20 hover:to-mirage-600/10  to-mirage-900/10 from-mirage-900/5 border-slate-800/10 shadow hover:translate-x-px text-slate-600/50  -translate-x-px  ring-slate-950/10 ring-2 ring-inset bg-gradient-to-br'}  ${showSidebar ? 'mx-2.5' : 'ml-0 mr-px'}`}
              >
                <Icon icon='settings'
                  className={`${location.pathname.includes("settings") && '!text-primary'} mr-2 shrink-0 h-6 w-6 duration-200 transition-all text-slate-600/50 ${showSidebar ? 'translate-x-0' : 'translate-x-[12.75rem]'}`}
                />
                Settings
              </NavLink>
              <a
                target="_blank"
                href="https://github.com/osintbuddy"
                class={`flex items-center duration-200 ease-in-out my-1 py-2.5  to-mirage-900/10 from-mirage-900/5 font-medium rounded-md border border-slate-800/10 hover:border-slate-700/10 hover:ring-transparent text-slate-600/50 hover:text-slate-300/60 shadow hover:translate-x-px z-50 transition-all focus:text-slate-400/70 -translate-x-px  ring-slate-950/10 ring-2 ring-inset pl-3  bg-gradient-to-br from-10% pr-1.5 hover:from-mirage-600/20 hover:to-mirage-600/10 font-display ${showSidebar ? 'mx-2.5' : 'ml-0.5 mr-px'}`}
              >
                <Icon
                  icon="brand-github"
                  className={`transition-all mr-2 shrink-0 h-6 w-6 duration-200 ${showSidebar ? 'translate-x-0' : 'translate-x-[12.75rem]'}`}
                />
                Github
              </a>
              <NavLink
                to='/'
                replace
                class={`w-[calc(100%-1.25rem)] flex items-center duration-200 ease-in-out my-1 py-2.5 text-base to-mirage-900/10 from-mirage-900/5 font-medium rounded-md border border-slate-800/10 hover:border-amber-950/10 hover:ring-transparent text-slate-600/50 hover:text-slate-300/60 shadow hover:translate-x-px z-50 transition-all focus:text-slate-400/70 -translate-x-px  ring-slate-950/10 ring-2 ring-inset pl-3  bg-gradient-to-br from-10% pr-1.5 hover:from-mirage-600/20 hover:to-mirage-600/10 font-display group !mb-2 ${showSidebar ? "mx-2.5" : 'ml-0.5 mr-px'}`}
                onClick={logout}
              >
                <Icon
                  icon="lock"
                  className={`transition-all mr-2 shrink-0 h-6 w-6 duration-200 group-hover:text-amber-500/40 ${showSidebar ? 'translate-x-0' : 'translate-x-[12.75rem]'}`}
                />
                Logout
              </NavLink>
            </div>
          </nav>
        </div>
      </div>
    </div>
  )
}

export default function AppLayout() {
  const location = useLocation();
  const { isAuthenticated, logout } = useAuthStore();
  const { showSidebar, toggleSidebar } = useAppStore();

  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  const handleLogout = async () => await logout()
  return (
    <>
      <div className="flex flex-col max-w-screen">
        <AppLayoutSidebar
          logout={handleLogout}
          toggleSidebar={toggleSidebar}
          showSidebar={showSidebar}
        />
        <div
          style={{ width: `calc(100% - ${showSidebar ? 16 : 3}rem)` }}
          className={`w-full transition-all duration-200 ${showSidebar ? 'translate-x-64' : 'translate-x-12'}`}
        >
          <main id="main" className="flex-1 h-screen">
            <Outlet />
          </main>
        </div>
      </div>
      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        toastStyle={{
          backgroundColor: "rgba(0, 2, 22, 0.94)",
          color: "#e2e8f0",
          backdropFilter: "var(--tw-backdrop-blur,) var(--tw-backdrop-brightness,) var(--tw-backdrop-contrast,) var(--tw-backdrop-grayscale,) var(--tw-backdrop-hue-rotate,) var(--tw-backdrop-invert,) var(--tw-backdrop-opacity,) var(--tw-backdrop-saturate,) var(--tw-backdrop-sepia,)"
        }}
      />
    </>
  );
}
