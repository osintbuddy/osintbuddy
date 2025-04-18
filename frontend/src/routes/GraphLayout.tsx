import { Navigate, Outlet } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAppSelector } from "@src/app/hooks";
import { selectIsAuthenticated } from "@src/features/account/accountSlice";

export default function GraphLayout() {
  const isAuthenticated = useAppSelector(state => selectIsAuthenticated(state));

  if (!isAuthenticated) return <Navigate to="/" replace />

  return (
    <>
      <div className="flex flex-col max-w-screen">
        <div className="w-full transition-all overflow-hidden duration-100 relative">
          <main id="main-view" className="flex-1 overflow-hidden h-screen ">
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
