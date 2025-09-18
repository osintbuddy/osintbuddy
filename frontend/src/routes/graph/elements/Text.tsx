import { memo } from 'preact/compat'

interface TextElement {
  id: string
  label: string
  value: string
}

export function Text({ id, label, value }: TextElement) {
  return (
    <div className='relative flex w-full pb-1 text-slate-400'>
      <p className='pr-2.5 text-xs text-slate-400 transition-colors duration-500 ease-out'>
        {value}{' '}
      </p>
    </div>
  )
}

export default memo(Text)
