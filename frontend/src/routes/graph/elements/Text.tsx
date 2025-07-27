import { Icon } from '@/components/icons'
import { TextElement } from '@/types/graph'
import { memo } from 'preact/compat'

export function Text({ id, label, value, icon }: TextElement) {
  return (
    <div className='relative flex w-full pb-1 text-slate-400'>
      {icon && <Icon icon={icon} className='h-6 w-6' />}
      <p className='pr-2.5 text-xs text-slate-400 transition-colors duration-500 ease-out'>
        {value}{' '}
      </p>
    </div>
  )
}

export default memo(Text)
