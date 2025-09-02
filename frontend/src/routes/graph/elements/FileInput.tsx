import { memo, useState } from 'preact/compat'
import { Icon } from '@/components/icons'
import { HTMLFileEvent } from '@/types/graph'

export function UploadFileInput({
  id,
  initialValue,
  label,
  sendJsonMessage,
  icon,
}: {
  nodeId: string
  label: string
  initialValue: string
  sendJsonMessage: Function
  icon?: any
}) {
  const [value, setValue] = useState<File>(initialValue as any)

  const updateValue = (event: HTMLFileEvent) => {
    if (event?.target?.files && event.target.files?.length > 0) {
      const file = event.target.files[0]
      setValue(file)
      sendJsonMessage({
        action: 'update:entity',
        entity: {
          id: id,
          [label]: file,
          name: file?.name || 'unknown',
        },
      })
    }
  }

  return (
    <>
      <p className='whitespace-wrap font-display mt-1 ml-1 text-[0.5rem] font-semibold text-slate-400'>
        {label}
      </p>
      <div className='flex items-center'>
        <div className='node-field'>
          <Icon icon={icon} className='h-6 w-6' />
          <label className={`ml-5 w-52 ${value?.name && 'text-slate-400'}`}>
            <input
              data-label={label}
              id={`${id}-${label}`}
              type='file'
              className='nodrag'
              onChange={(event: any) => updateValue(event)}
            />
            {value?.name ? value.name : label}
          </label>
        </div>
      </div>
    </>
  )
}

export default memo(UploadFileInput)
