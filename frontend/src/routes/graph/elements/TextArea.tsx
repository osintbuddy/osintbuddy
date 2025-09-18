import { Icon } from '@/components/icons'
import { memo, useState } from 'preact/compat'
import { toSnakeCase } from '../utils'

interface TextAreaElement {
  id: string
  label: string
  sendJsonMessage: (data: JSONObject) => void
  value: string
  data: any
}

export function TextArea({
  id,
  label,
  sendJsonMessage,
  value: initValue,
  data,
}: TextAreaElement) {
  const [value, setValue] = useState(initValue)
  const [showMonospace, setShowMonospace] = useState(true)

  return (
    <div className='flex w-full flex-col'>
      <label
        title='Click to toggle the displayed font'
        onClick={() => setShowMonospace(!showMonospace)}
        className='font-display flex items-center justify-between text-[0.55rem] leading-4 font-medium text-slate-400'
      >
        {label}
        <Icon
          icon={showMonospace ? 'brackets-angle' : 'brackets-angle-off'}
          className='h-3 w-3 text-slate-600 hover:text-slate-400'
        />
      </label>
      <div className='hover:border-mirage-200/50 focus-within:!border-primary-350 border-mirage-200/30 w-full rounded-sm border focus-within:from-black/25 focus-within:to-black/20'>
        <textarea
          rows={4}
          spellcheck={false}
          className={`nodrag nowheel whitespace-wrap order block w-full rounded-sm bg-transparent bg-gradient-to-br from-black/10 to-black/15 px-1 py-px text-xs text-slate-400 shadow-sm outline-hidden transition-colors duration-75 ease-in-out placeholder:text-slate-700 focus-within:bg-gradient-to-l focus:outline-hidden sm:text-xs ${showMonospace && '!font-code'}`}
          value={value}
          onChange={(event) => setValue(event.currentTarget.value)}
          onBlur={() => {
            sendJsonMessage({
              action: 'update:entity',
              entity: {
                id: id,
                data: {
                  ...data,
                  [toSnakeCase(label)]: value,
                },
              },
            })
          }}
        />
      </div>
    </div>
  )
}

export default memo(TextArea)
