import { PropsWithChildren, Ref } from "preact/compat";


export interface OverlayModalProps {
  cancelCreateRef: Ref<HTMLDivElement>;
  closeModal: any;
  isOpen: boolean;
}

export default function OverlayModal({
  children,
  isOpen,
  cancelCreateRef,
  closeModal }: PropsWithChildren<OverlayModalProps>) {
  return (
    // <Transition.Root show={isOpen} as={Fragment}>
    <div className={`${isOpen ? '' : 'invisible'} relative z-10`} ref={cancelCreateRef} onClose={() => closeModal()}>
      {/* <Transition.Child
          as={Fragment}
          enter='ease-out duration-300'
          enterFrom='opacity-0'
          enterTo='opacity-100'
          leave='ease-in duration-200'
          leaveFrom='opacity-100'
          leaveTo='opacity-0'
        > */}
      <div className='fixed inset-0 bg-cod-700/60 backdrop-blur-md transition-opacity' />
      {/* </Transition.Child> */}

      <div className='fixed inset-0 z-10 overflow-y-auto'>
        <div className='flex min-h-full items-end justify-center text-center sm:items-center sm:p-0 '>
          {/* <Transition.Child
              as={Fragment}
              enter='ease-out duration-300'
              enterFrom='opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95'
              enterTo='opacity-100 translate-y-0 sm:scale-100'
              leave='ease-in duration-200'
              leaveFrom='opacity-100 translate-y-0 sm:scale-100'
              leaveTo='opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95'
            > */}
          <div className='relative max-w-2xl w-full transform overflow-hidden rounded-r-xl text-left transition-all'>
            {children}
          </div>
          {/* </Transition.Child> */}
        </div>
      </div>
    </div >
    // </Transition.Root >
  );
}