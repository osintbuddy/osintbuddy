import { getBezierPath } from '@xyflow/react'

export default function NewConnectionLine({
  fromX,
  fromY,
  toX,
  toY,
}: JSONObject) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX: fromX,
    sourceY: fromY,
    targetX: toX,
    targetY: toY,
  })
  return (
    <g>
      <path
        fill='none'
        stroke={'#0215FF'}
        strokeWidth={2}
        className='animated'
        d={edgePath}
      />
      <circle
        cx={toX}
        cy={toY}
        fill='#00000000'
        r={3}
        stroke={'#394778'}
        strokeWidth={1.5}
      />
    </g>
  )
}
