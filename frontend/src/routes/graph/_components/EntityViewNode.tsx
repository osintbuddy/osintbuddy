import { useMemo } from 'preact/hooks'
import { Icon } from '@/components/icons'
import { Handle, Position } from '@xyflow/react'

const handleStyle = {
  borderColor: '#1C233B',
  background: '#0c0c3240',
  width: 10,
  margin: -2,
  height: 10,
}
export default function ViewEntityNode({ ctx }: JSONObject) {
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
      <Handle
        position={Position.Right}
        id='r1'
        key='r1'
        type='source'
        style={handleStyle}
      />
      <Handle
        position={Position.Top}
        id='t1'
        key='t1'
        type='source'
        style={handleStyle}
      />
      <Handle
        position={Position.Bottom}
        id='b1'
        key='b1'
        type='source'
        style={handleStyle}
      />
      <Handle
        position={Position.Left}
        id='l1'
        key='l1'
        type='source'
        style={handleStyle}
      />

      <Handle
        position={Position.Right}
        id='r2'
        key='r2'
        type='target'
        style={handleStyle}
      />
      <Handle
        position={Position.Top}
        id='t2'
        key='t2'
        type='target'
        style={handleStyle}
      />
      <Handle
        position={Position.Bottom}
        id='b2'
        key='b2'
        type='target'
        style={handleStyle}
      />
      <Handle
        position={Position.Left}
        id='l2'
        key='l2'
        type='target'
        style={handleStyle}
      />
      <div className='node container !h-16 !w-16 !rounded-full'>
        <div
          // 99 === 0.6 opacity
          style={{
            backgroundColor:
              node?.color?.length === 7 ? `${node.color}99` : node?.color,
          }}
          className='header !rounded-full !p-3'
        >
          <Icon
            icon={node.icon}
            className='!h-14 !w-14 cursor-grab text-slate-300/95 focus:cursor-grabbing'
          />
        </div>
        <h2
          className={`pointer-events-none absolute top-full -right-28 -bottom-10 -left-28 h-auto max-w-xl text-center text-xl text-slate-500`}
        >
          {displayValue?.length >= 90
            ? `${displayValue.slice(0, 90)}...`
            : displayValue}
        </h2>
      </div>
    </>
  )
}
