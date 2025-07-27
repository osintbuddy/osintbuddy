import { Icon } from '@/components/icons'
import { memo } from 'preact/compat'
import { toast } from 'react-toastify'

export function CopyText({
  nodeId,
  label,
  value,
}: {
  nodeId: string
  label: string
  value: string
}) {
  return (
    <div
      onClick={() => {
        navigator.clipboard.writeText(value)
        toast.success(`Copied ${label} to clipboard!`)
      }}
      className='text-info-300 flex max-w-xs items-center'
    >
      <Icon icon='paperclip' className='h-4 w-4' />
      <p
        title='Click to copy'
        data-type='link'
        className='ml-2 truncate text-xs break-keep whitespace-nowrap text-inherit'
      >
        {value}
      </p>
      <input
        type='text'
        className='hidden'
        data-label={label}
        id={`${nodeId}-${label}`}
        value={value}
        readOnly
      />
    </div>
  )
}

export default memo(CopyText)
