import { Outlet } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import PublicNavbar from '@/components/navs/PublicNavbar'

export default function PublicLayout(): React.ReactElement {
  return (
    <>
      <PublicNavbar />
      <Outlet />
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
