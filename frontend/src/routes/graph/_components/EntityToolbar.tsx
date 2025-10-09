import { Icon } from '@/components/icons'
import { NodeToolbar, Position } from '@xyflow/react'
import { useAttachmentsStore, usePropertiesStore } from '@/app/store'

interface Props { entityId: string; entityTitle: string; properties?: JSONObject }

export default function EntityToolbar({ entityId, entityTitle, properties }: Props) {
  const { addTab } = useAttachmentsStore()
  const props = usePropertiesStore()

  return (
    <NodeToolbar position={Position.Top} class='pointer-events-none'>
      <div className='relative flex gap-x-2 pointer-events-auto'>
        <button
          title='Open properties'
          onClick={() => props.openWith(entityId, entityTitle, properties)}
          class='bg-slate-925/60 hover:border-primary-350 hover:text-primary-350 relative top-3 flex h-8 w-8 items-center justify-center rounded-full border-2 border-slate-900 p-px text-slate-600 backdrop-blur-xs transition-colors duration-75 ease-in hover:bg-slate-950/70 pointer-events-auto'
        >
          <Icon icon='file-code' className='m-1 h-4.5 w-4.5' />
        </button>
        <button
          title='Open comments'
          class='bg-slate-925/60 hover:border-primary-350 hover:text-primary-350 relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-slate-900 p-px text-slate-600 backdrop-blur-xs transition-colors duration-200 ease-in hover:bg-slate-950/70 pointer-events-auto'
        >
          <Icon icon='message' className='m-1 h-4.5 w-4.5' />
        </button>
        <button
          title='Open attachments'
          onClick={() => addTab(entityId, entityTitle)}
          class='bg-slate-925/60 hover:border-primary-350 hover:text-primary-350 relative top-3 flex h-8 w-8 items-center justify-center rounded-full border-2 border-slate-900 p-px text-slate-600 backdrop-blur-xs transition-colors duration-200 ease-in hover:bg-slate-950/70 pointer-events-auto'
        >
          <Icon icon='note' className='m-1 h-4.5 w-4.5' />
        </button>
      </div>
    </NodeToolbar>
  )
}
