import { PropsWithChildren, Ref, useEffect, useState } from "preact/compat";

export interface OverlayModalProps {
  cancelRef: Ref<HTMLDivElement>;
  closeModal: any;
  isOpen: boolean;
}

export default function OverlayModal({
  children,
  isOpen,
  cancelRef,
  closeModal
}: PropsWithChildren<OverlayModalProps>) {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      // Small delay to ensure the element is in DOM before starting animation
      setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
      // Wait for animation to complete before removing from DOM
      setTimeout(() => setShouldRender(false), 200);
    }
  }, [isOpen]);

  const handleBackdropClick = () => {
    closeModal();
  };

  if (!shouldRender) return null;

  return (
    <div
      className="fixed z-10 w-screen"
      ref={cancelRef}
    >
      {/* Backdrop overlay with fade animation */}
      <div
        className={`${isVisible ? 'opacity-100' : 'opacity-0'} fixed inset-0 bg-cod-900/60 backdrop-blur-md h-screen w-screen cursor-pointer transition-opacity duration-200 ease-out`}
        onClick={handleBackdropClick}
      />

      <div className="fixed inset-0 z-20 overflow-y-auto pointer-events-none">
        <div className="flex min-h-full items-end justify-center text-center sm:items-center sm:p-0">
          {/* Modal with scale and fade animation */}
          <div
            className={`top-0 relative max-w-2xl w-full transform overflow-hidden rounded-r-xl text-left pointer-events-auto transition-all duration-200 ease-out ${isVisible
              ? 'opacity-100 translate-y-0 sm:scale-100'
              : 'opacity-0 translate-y-4 sm:scale-90'
              }`}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}