import { useMemo } from 'preact/hooks'
import { memo } from 'preact/compat'
import { Icon } from '@/components/icons'
import { Handle, Position } from '@xyflow/react'

const handleStyle = {
  borderColor: '#1C233B',
  background: '#0c0c3240',
  width: 10,
  margin: 0,
  height: 10,
  padding: 4,
}

const handleConfigs = [
  { position: Position.Right, id: 'r', type: 'source' as const },
  { position: Position.Top, id: 't', type: 'source' as const },
  { position: Position.Bottom, id: 'b', type: 'source' as const },
  { position: Position.Left, id: 'l', type: 'source' as const },
  { position: Position.Right, id: 'r', type: 'target' as const },
  { position: Position.Top, id: 't', type: 'target' as const },
  { position: Position.Bottom, id: 'b', type: 'target' as const },
  { position: Position.Left, id: 'l', type: 'target' as const },
]

function ViewEntityNode({ ctx }: JSONObject) {
  const node = ctx.data
  const displayValue = useMemo(
    () =>
      Array.isArray(node.elements[0])
        ? node.elements[0][0]?.value
        : node.elements[0]?.value,
    [node.elements]
  )

  return (
    <>
      {handleConfigs.map((handle) => {
        const suffix = handle.type === 'source' ? '1' : '2'
        const handleId = `${handle.id}${suffix}`

        return (
          <Handle
            key={handleId}
            position={handle.position}
            id={handleId}
            type={handle.type}
            style={handleStyle}
          />
        )
      })}
      <div className='node container !h-16 !w-16 !rounded-full'>
        <div
          // 99 === 0.6 opacity
          style={{
            backgroundColor:
              node?.color?.length === 7 ? `${node.color}99` : node?.color,
          }}
          className='header !rounded-full !p-2'
        >
          <Icon
            icon={node.icon}
            className='cursor-grab text-slate-300/95 select-none'
          />
        </div>
        <h2
          className={`pointer-events-none absolute top-full -right-28 -left-28 h-auto max-w-xl text-center text-xl text-slate-500`}
        >
          {displayValue?.length >= 90
            ? `${displayValue.slice(0, 90)}...`
            : displayValue}
        </h2>
      </div>
    </>
  )
}

export default memo(ViewEntityNode)
