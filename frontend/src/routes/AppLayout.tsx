import { Navigate, Outlet } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import AppLayoutSidebar from "@/components/navs/AppLayoutSidebar";
import "react-toastify/dist/ReactToastify.css";
import { useState } from "preact/hooks";

export default function AppLayout() {
  const [showSidebar, setShowSidebar] = useState(true);
  const token = ""
  const toggleSidebar = () => {
    setShowSidebar(!showSidebar)
  };
  if (!token) return <Navigate to="/" replace />

  return (
    <>
      <div className="flex flex-col max-w-screen">
        <AppLayoutSidebar toggleSidebar={toggleSidebar} showSidebar={showSidebar} />
        <div
          style={{ width: `calc(100% - ${showSidebar ? 16 : 3}rem)` }}
          className={`w-full transition-all overflow-hidden duration-100 relative ${showSidebar ? 'translate-x-64' : 'translate-x-12'}`}
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
        toastStyle={{
          backgroundColor: "rgba(0, 2, 22, 0.938)",
          color: "#e2e8f0",
          backdropFilter: "var(--tw-backdrop-blur,) var(--tw-backdrop-brightness,) var(--tw-backdrop-contrast,) var(--tw-backdrop-grayscale,) var(--tw-backdrop-hue-rotate,) var(--tw-backdrop-invert,) var(--tw-backdrop-opacity,) var(--tw-backdrop-saturate,) var(--tw-backdrop-sepia,)"
        }}
      />
    </>
  );
}
