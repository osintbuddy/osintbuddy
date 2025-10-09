import { Icon } from '@/components/icons'
import { NodeElementProps } from '@/types/graph'
import { ChangeEvent, memo, useState } from 'preact/compat'
import { toSnakeCase } from '../utils'
import { usePropertiesStore } from '@/app/store'

interface TextInputProps {
  id: string
  label: string
  sendJsonMessage: (data: any) => void
  icon: string
  value: string
  data: any
}

export function TextInput({
  id,
  label,
  sendJsonMessage,
  icon,
  value: initValue,
  data,
}: TextInputProps) {
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
              const key = toSnakeCase(label)
              const nextData = {
                ...data,
                [key]: value,
              }
              // update server
              sendJsonMessage({
                action: 'update:entity',
                entity: {
                  id,
                  data: nextData,
                },
              })
              // keep properties preview in sync if open
              try {
                const st = usePropertiesStore.getState()
                const tab = st.tabs.find((t) => t.entityId === id)
                if (tab) {
                  const currStr = JSON.stringify(tab.data ?? {})
                  const nextStr = JSON.stringify(nextData)
                  if (currStr !== nextStr) st.setData(id, nextData)
                }
              } catch (_) {}
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
