import { Navigate, Outlet } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'

export default function GraphLayout() {
  const token = ''

  if (!token) return <Navigate to='/' replace />

  return (
    <>
      <div className='flex max-w-screen flex-col'>
        <div className='relative w-full overflow-hidden transition-all duration-100'>
          <main id='main' className='h-screen flex-1 overflow-hidden'>
            <Outlet />
          </main>
        </div>
      </div>

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
