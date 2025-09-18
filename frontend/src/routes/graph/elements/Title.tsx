import { memo } from 'preact/compat'

interface TitleProps {
  id: string
  label: string
  value: string
}

export function Title({ id, label, value }: TitleProps) {
  return (
    <div className='node-display !my-0 !py-0'>
      {value && <h1 className='my-0'>{value}</h1>}
    </div>
  )
}

export default memo(Title)
