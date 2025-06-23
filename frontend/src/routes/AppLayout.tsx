import { Outlet } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import AppLayoutSidebar from "@/components/navs/AppLayoutSidebar";
import { settingsAtom } from "@/app/atoms";
import { useAtom } from "jotai";
import "react-toastify/dist/ReactToastify.css";
import { authAtom, tokenAtom } from "@/app/api";

export default function AppLayout() {
  const [settings, setSettings] = useAtom(settingsAtom)
  const [a, b] = useAtom(authAtom)
  console.log('aurth, stateatom', a, b)

  // const [{ data: authData },] = useMutationState({
  //   filters: {
  //     mutationKey: ['auth'],
  //   },
  // })
  // const isAuthenticated = authData.token;

  // console.log("mutaTa", auth)

  const toggleSidebar = () => {
    setSettings({ ...settings, showSidebar: !settings.showSidebar })
  };

  // if (!isAuthenticated) return <Navigate to="/" replace />

  return (
    <>
      <div className="flex flex-col max-w-screen">
        <AppLayoutSidebar toggleSidebar={toggleSidebar} showSidebar={settings.showSidebar} />
        <div
          style={{ width: `calc(100% - ${settings.showSidebar ? 16 : 3}rem)` }}
          className={`w-full transition-all overflow-hidden duration-100 relative ${settings.showSidebar ? 'translate-x-64' : 'translate-x-12'}`}
        >
          <main id="main" className="flex-1 overflow-hidden h-screen ">
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
        theme="dark"
        toastStyle={{
          backgroundColor: "#1C233B",
          color: "#94a3b8",
        }}
      />
    </>
  );
}
