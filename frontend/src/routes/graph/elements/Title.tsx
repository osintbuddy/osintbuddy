import { memo } from 'preact/compat'

export function Title({
  id,
  label,
  value,
}: {
  nodeId: string
  label: string
  value: string
}) {
  return (
    <div className='node-display !my-0 !py-0'>
      {value && <h1 className='my-0'>{value}</h1>}
    </div>
  )
}

export default memo(Title)
