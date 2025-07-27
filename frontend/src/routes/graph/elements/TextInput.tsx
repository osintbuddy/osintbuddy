import { Icon } from '@/components/icons'
import { memo, useState } from 'preact/compat'
export function TextInput({
  nodeId,
  label,
  sendJsonMessage,
  icon,
  value: initValue,
}: NodeElement) {
  const [value, setValue] = useState(initValue)

  return (
    <>
      <div className='flex flex-col'>
        <label className='whitespace-wrap font-display nodrag mt-0.5 ml-0.5 text-[0.55rem] font-medium text-slate-400 active:cursor-grabbing'>
          {label}
        </label>
        <div className='node-field nodrag'>
          <input
            id={`${nodeId}-${label}`}
            type='text'
            onBlur={(event) => {
              sendJsonMessage({
                action: 'update:entity',
                entity: { id: Number(nodeId), [label]: value },
              })
            }}
            onChange={(event: InputEvent) =>
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
