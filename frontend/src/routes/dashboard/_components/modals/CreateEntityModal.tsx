import { PencilIcon } from '@heroicons/react/24/outline';
import OverlayModal, { OverlayModalProps } from '@/components/modals/OverlayModal';
import { TrashIcon } from '@heroicons/react/20/solid';
import Input from '@/components/inputs';
import { Icon } from '@/components/Icons';
import Button from '@/components/buttons';

export function CreateEntityForm({ closeModal, updateEntities }: JSONObject) {

  const onSubmitHandler = (postEntityCreate: any) => {
    closeModal()
    // updateEntities()
  };

  return (

    <form onSubmit={onSubmitHandler} className='from-cod-950/85 to-cod-950/80 bg-gradient-to-br w-full shadow border-l-3 border-l-primary px-10 flex flex-col overflow-y-scroll group'>
      <section class="group-hover:border-primary-350 border-b-2 mt-6 border-mirage-700 pl-1 pb-1 px-px">
        <div class="flex flex-wrap items-center justify-between">
          <h1 class="font-display font-semibold text-2xl tracking-tight text-slate-400">Create a new entity plugin</h1>
          <Icon icon="basket-code" className="w-6 h-6 mr-2 mt-1 text-slate-400" />
        </div>
      </section>
      <div class="w-full grid gap-y-8 mt-10 grid-cols-1 ">
        <Input.Transparent className="w-full" name="label" label="Label" />
        <Input.Textarea className="w-full" name="description" label="Description" />
        <Input.Transparent className='w-full mb-6' name="author" label="Author(s)" />
      </div>

      <div class="flex justify-end mb-6">
        <Button.Solid variant="danger" onClick={() => closeModal()} type='button'>
          Cancel
          <TrashIcon class="btn-icon" />
        </Button.Solid>
        <Button.Solid className="ml-4" variant="primary" type='submit'>
          <span>Create entity</span>
          <PencilIcon class="btn-icon" />
        </Button.Solid>
      </div>
    </form>
  );
}

interface CreateEntityModalProps extends OverlayModalProps {
  refreshAllEntities: any
  closeModal: any
  isOpen: boolean
  cancelCreateRef: any
}

export default function CreateEntityModal({
  closeModal,
  isOpen,
  cancelCreateRef,
  refreshAllEntities
}: CreateEntityModalProps) {
  return (
    <OverlayModal isOpen={isOpen} closeModal={closeModal} cancelCreateRef={cancelCreateRef}>
      <CreateEntityForm closeModal={closeModal} updateEntities={refreshAllEntities} />
    </OverlayModal>
  );
}