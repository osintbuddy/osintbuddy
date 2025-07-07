import { useAuthStore } from '@/app/store'
import { Navigate, Outlet } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'

export default function GraphLayout() {
  const { isAuthenticated } = useAuthStore()
  if (!isAuthenticated)
    return <Navigate to='/login' state={{ from: location.pathname }} replace />
  return (
    <>
      <main className='relative flex w-full max-w-screen flex-col'>
        <Outlet />
      </main>

      <ToastContainer
        position='bottom-right'
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        toastStyle={{
          backgroundColor: 'rgba(0, 2, 22, 0.938)',
          color: '#e2e8f0',
          backdropFilter:
            'var(--tw-backdrop-blur,) var(--tw-backdrop-brightness,) var(--tw-backdrop-contrast,) var(--tw-backdrop-grayscale,) var(--tw-backdrop-hue-rotate,) var(--tw-backdrop-invert,) var(--tw-backdrop-opacity,) var(--tw-backdrop-saturate,) var(--tw-backdrop-sepia,)',
        }}
      />
    </>
  )
}
