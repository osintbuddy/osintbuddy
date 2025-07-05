import {
  createPortal,
  PropsWithChildren,
  Ref,
  useEffect,
  useState,
} from 'preact/compat'

export interface OverlayModalProps {
  cancelRef: Ref<HTMLDivElement>
  closeModal: any
  isOpen: boolean
}

export default function OverlayModal({
  children,
  isOpen,
  cancelRef,
  closeModal,
}: PropsWithChildren<OverlayModalProps>) {
  const [isVisible, setIsVisible] = useState(false)
  const [shouldRender, setShouldRender] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true)
      // Small delay to ensure the element is in DOM before starting animation
      setTimeout(() => setIsVisible(true), 10)
    } else {
      setIsVisible(false)
      // Wait for animation to complete before removing from DOM
      setTimeout(() => setShouldRender(false), 200)
    }
  }, [isOpen])

  const handleBackdropClick = () => {
    closeModal()
  }

  useEffect(() => {
    const close = (e) => {
      if (e.keyCode === 27) {
        closeModal()
      }
    }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [])

  if (!shouldRender) return null

  return createPortal(
    <div className='fixed z-10 w-screen' ref={cancelRef}>
      {/* Backdrop overlay with fade animation */}
      <div
        className={`${isVisible ? 'opacity-100' : 'opacity-0'} fixed inset-0 h-screen w-screen cursor-pointer bg-black/70 backdrop-blur-md transition-opacity duration-200 ease-out`}
        onClick={handleBackdropClick}
      />

      <div className='pointer-events-none fixed inset-0 z-20 overflow-y-auto'>
        <div className='flex min-h-full items-end justify-center text-center sm:items-center sm:p-0'>
          {/* Modal with scale and fade animation */}
          <div
            className={`pointer-events-auto relative top-0 w-full max-w-2xl transform overflow-hidden rounded-r-xl text-left transition-all duration-200 ease-out ${
              isVisible
                ? 'translate-y-0 opacity-100 sm:scale-100'
                : 'translate-y-4 opacity-0 sm:scale-90'
            }`}
          >
            {children}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
