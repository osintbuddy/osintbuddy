import { Icon } from '@/components/icons'
import { NodeElementProps } from '@/types/graph'
import { ChangeEvent, memo, useState } from 'preact/compat'

export function TextInput({
  id,
  label,
  sendJsonMessage,
  icon,
  value: initValue,
}: NodeElementProps) {
  const [value, setValue] = useState(initValue)
  return (
    <>
      <div className='flex flex-col'>
        <label className='whitespace-wrap font-display nodrag mt-0.5 ml-0.5 text-[0.55rem] font-medium text-slate-400 active:cursor-grabbing'>
          {label}
        </label>
        <div className='node-field nodrag'>
          <input
            id={`${id}-${label}`}
            type='text'
            onBlur={() => {
              sendJsonMessage({
                action: 'update:entity',
                entity: { id: Number(id), [label]: value },
              })
            }}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setValue(event.currentTarget.value)
            }
            value={value ?? initValue}
          />
          <Icon icon={icon} />
        </div>
      </div>
    </>
  )
}

export default memo(TextInput)
