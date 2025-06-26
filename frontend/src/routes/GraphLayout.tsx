import { Navigate, Outlet } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function GraphLayout() {
  const token = "";

  if (!token) return <Navigate to="/" replace />

  return (
    <>
      <div className="flex flex-col max-w-screen">
        <div className="w-full transition-all overflow-hidden duration-100 relative">
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
