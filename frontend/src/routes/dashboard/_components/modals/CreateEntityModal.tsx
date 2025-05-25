import { PencilIcon } from '@heroicons/react/24/outline';
import { useEffect } from 'preact/hooks';
import { useForm } from 'react-hook-form';
import * as Yup from 'yup';
import InputField from '@/components/inputs/InputField';
import OverlayModal, { OverlayModalProps } from '@/components/modals/OverlayModal';
import InputTextarea from '@/components/inputs/InputTextArea';
import { TrashIcon } from '@heroicons/react/20/solid';

type EntityFormData = {
  label: string
  description: string
  author: string
}

const entitySchema: Yup.ObjectSchema<EntityFormData> = Yup.object().shape({
  label: Yup.string().required(),
  description: Yup.string().optional().default("No description found..."),
  author: Yup.string().optional().default("")
});

export function CreateEntityForm({ closeModal, updateEntities }: JSONObject) {
  const {
    reset,
    register,
    handleSubmit,
    formState: { errors, isSubmitSuccessful }
  } = useForm<EntityFormData>({ });

  useEffect(() => {
    if (!isSubmitSuccessful) return
    reset({ description: "", label: "", author: "" })
  }, [isSubmitSuccessful])


  const onSubmitHandler = (postEntityCreate: EntityFormData) => {
    closeModal()
    updateEntities()
  };

  return (

    <form onSubmit={handleSubmit(onSubmitHandler)} className='modal-form px-8'>
      <section>
        <div>
          <h1>New Entity</h1>
        </div>
      </section>
      <InputField register={register} name="label" label="Label" />
      <InputTextarea register={register} name="description" label="Description" />
      <InputField className='mb-6' register={register} name="author" label="Author(s)" description="You can separate multiple authors with commas" />

      <section>
        <div>
          <button className="btn-danger" onClick={() => closeModal()} type='button'>
            Cancel
            <TrashIcon />
          </button>
          <button className="btn-primary ml-4" type='submit'>
            <span>Start editing</span>
            <PencilIcon />
          </button>
        </div>
      </section>
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