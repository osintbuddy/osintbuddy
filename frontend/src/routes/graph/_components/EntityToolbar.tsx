import { Icon } from '@/components/icons'
import { NodeToolbar, Position } from '@xyflow/react'

export default function EntityToolbar() {
  return (
    <NodeToolbar position={Position.Top} class='pointer-events-none'>
      <div className='relative flex gap-x-2'>
        <button
          title='Open properties'
          class='bg-slate-925/60 hover:border-primary-350 hover:text-primary-350 relative top-3 flex h-8 w-8 items-center justify-center rounded-full border-2 border-slate-900 p-px text-slate-600 backdrop-blur-xs transition-colors duration-75 ease-in hover:bg-slate-950/70'
        >
          <Icon icon='file-code' className='m-1 h-4.5 w-4.5' />
        </button>
        <button
          title='Open comments'
          class='bg-slate-925/60 hover:border-primary-350 hover:text-primary-350 relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-slate-900 p-px text-slate-600 backdrop-blur-xs transition-colors duration-200 ease-in hover:bg-slate-950/70'
        >
          <Icon icon='message' className='m-1 h-4.5 w-4.5' />
        </button>
        <button
          title='Open attachments'
          class='bg-slate-925/60 hover:border-primary-350 hover:text-primary-350 relative top-3 flex h-8 w-8 items-center justify-center rounded-full border-2 border-slate-900 p-px text-slate-600 backdrop-blur-xs transition-colors duration-200 ease-in hover:bg-slate-950/70'
        >
          <Icon icon='note' className='m-1 h-4.5 w-4.5' />
        </button>
      </div>
    </NodeToolbar>
  )
}
