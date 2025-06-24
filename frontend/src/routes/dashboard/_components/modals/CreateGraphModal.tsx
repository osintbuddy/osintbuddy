import { useEffect, useState } from 'preact/hooks';
import { DocumentMagnifyingGlassIcon, DocumentPlusIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useForm } from "react-hook-form";
import * as Yup from "yup";
import OverlayModal from '@/components/modals/OverlayModal';
import InputField from '@/components/inputs/InputField';
import InputTextarea from '@/components/inputs/InputTextArea';
import InputToggleSwitch from '@/components/inputs/InputToggleSwitch';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import Input from '@/components/inputs';
import Button from '@/components/buttons';
import { Icon } from '@/components/Icons';

type GraphFormData = {
  label: string
  description: string
  enableGraphGuide?: boolean | undefined
}

const graphSchema: Yup.ObjectSchema<GraphFormData> = Yup.object().shape({
  label: Yup.string().required("Required"),
  description: Yup.string().optional().default("No description found..."),
  enableGraphGuide: Yup.boolean()
});


export function CreateGraphForm({ closeModal, refreshGraphs }: JSONObject) {
  const navigate = useNavigate()
  const [showGraphGuide, setShowGraphGuide] = useState(false);

  const {
    reset,
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitSuccessful, isSubmitting }
  } = useForm<GraphFormData>({});

  useEffect(() => {
    if (!isSubmitSuccessful) return
    if (false) {
      closeModal()
      const replace = { replace: true }
      // we only navigate to the graph when the guide is enabled
      refreshGraphs()
      if (showGraphGuide) {
        navigate(`/graph/${newGraph.id}`, { ...replace, state: { showGraphGuide, } })
      } else {
        navigate(`/dashboard/graph/${newGraph.id}`, replace)
      }
    } else {
      console.error("error")
      toast.error("We ran into an error creating your graph. Please try again")
    }
    reset({ label: "", description: "", enableGraphGuide: false })
  }, [isSubmitSuccessful, showGraphGuide])

  const onSubmitHandler = (graphCreate: GraphFormData) => {
    if (graphCreate?.enableGraphGuide) {
      // dispatch(setGraphTour())
      setShowGraphGuide(true)
    }
    delete graphCreate.enableGraphGuide
    // createGraph({ graphCreate })
  };

  return (
    <form onSubmit={handleSubmit(onSubmitHandler)} class="from-cod-950/85 to-cod-950/80 bg-gradient-to-br w-full shadow border-l-3 border-l-primary px-10 flex flex-col overflow-y-scroll group">
      <section class="group-hover:border-primary-350 border-b-2 mt-6 border-mirage-700 pl-1 pb-1 px-px ">
        <div class=" flex flex-wrap items-center justify-between ">
          <h1 class="font-display font-semibold text-2xl tracking-tight text-slate-400">Create a new graph</h1>
          <Icon icon="chart-dots-3" className="w-6 h-6 mr-2 mt-1 text-slate-400" />
        </div>
      </section>
      <div class="w-full grid gap-y-8 mt-10 grid-cols-1 ">
        <Input.Transparent label="Label" placeholder="Enter a name for your graph..." className="w-full" />
        <Input.Textarea rows={3} name="description" className="w-full" label="Description" placeholder="Additional details about your graph..." />
        <Input.ToggleSwitch className='pb-6' label="Enable Guide" control={control} name={"enableGraphGuide"} description="Get a step-by-step guide on how to perform investigations" />
      </div>

      <div class="flex justify-end mb-6">
        <Button.Solid
          variant='danger'
          onClick={() => closeModal()}
          type='button'
          className="btn-danger"
        >
          <span>Cancel</span>
          <TrashIcon class="btn-icon" />
        </Button.Solid>
        <Button.Solid
          variant='primary'
          type='submit'
          disabled={isSubmitting}
          className='btn-primary ml-4'
        >
          <span>Create graph</span>
          <PlusIcon class="btn-icon" />
        </Button.Solid>
      </div>
    </form>

  );
}

interface CreateGraphModalProps {
  refreshAllGraphs: Function
  closeModal: Function
  isOpen: boolean
  cancelCreateRef: any
}

export default function CreateGraphModal({
  closeModal,
  isOpen,
  cancelCreateRef,
  refreshAllGraphs
}: CreateGraphModalProps) {
  return (
    <OverlayModal isOpen={isOpen} closeModal={closeModal} cancelCreateRef={cancelCreateRef}>
      <CreateGraphForm
        refreshGraphs={() => refreshAllGraphs()}
        closeModal={() => closeModal()}
      />
    </OverlayModal>
  );
}
