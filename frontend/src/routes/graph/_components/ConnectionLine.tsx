import {
  ConnectionLineComponentProps,
  getBezierPath,
  useConnection,
  Position,
  getStraightPath,
} from '@xyflow/react'
import { getEdgeParams } from './utils'

export default function NewConnectionLine({
  toX,
  toY,
  connectionStatus,
  fromNode,
}: ConnectionLineComponentProps) {
  // Create a mock target node at the cursor position
  const targetNode = {
    id: 'connection-target',
    measured: {
      width: 8,
      height: 8,
    },
    internals: {
      positionAbsolute: { x: toX, y: toY },
      handleBounds: {
        source: [
          Position.Right,
          Position.Left,
          Position.Top,
          Position.Bottom,
        ].map((handle) => ({
          id: handle,
          x: 0,
          y: -5,
          width: 6,
          height: 6,
        })),
      },
    },
  }
  const { sx, sy, tx, ty, sourcePos, targetPos } = getEdgeParams(
    fromNode,
    targetNode
  )
  const [edgePath] = getStraightPath({
    sourceX: sx,
    sourceY: sy,
    targetX: tx || toX,
    targetY: ty || toY,
  })

  const statusColor =
    connectionStatus === null
      ? '#1524ea'
      : connectionStatus === 'valid'
        ? 'var(--color-green-600)'
        : 'var(--color-red-600)'
  return (
    <g>
      {/* Subtle glow pulse */}
      <defs>
        <filter id='glow' x='-100%' y='-100%' width='200%' height='200%'>
          <feGaussianBlur stdDeviation='10' result='blur' />
          <feMerge>
            <feMergeNode in='blur' />
            <feMergeNode in='SourceGraphic' />
          </feMerge>
        </filter>
      </defs>
      <path
        fill='none'
        stroke='color-mix(in srgb, var(--color-primary-500) 80%, transparent)'
        stroke-dasharray='14 4'
        strokeWidth={2}
        d={edgePath}
        style={{
          filter: 'url(#glow)',
          animation:
            'glowPulse 2s ease-in-out infinite, dashingLines 16s linear',
        }}
      />
      <path id='tracePath' fill='none' stroke='none' d={edgePath} />
      {/* Pulsing flowing dots */}
      {['0s', '-1.5s', '-3s'].map((begin) => (
        <circle r='1' fill={statusColor}>
          <animateMotion
            dur='3s'
            begin={begin}
            repeatCount='indefinite'
            keyPoints='0;1'
            keyTimes='0;1'
            calcMode='linear'
          >
            <mpath href='#tracePath' />
          </animateMotion>
          <animate
            attributeName='r'
            values='1;0.5;1'
            begin={begin}
            dur='3s'
            repeatCount='indefinite'
          />
          <animate
            attributeName='opacity'
            values='0.2;1;0.4'
            begin={begin}
            dur='3s'
            repeatCount='indefinite'
          />
        </circle>
      ))}

      {/* Animated node icon under cursor position */}
      <g
        transform={`translate(${(tx || toX) - 16}, ${(ty || toY) - 16}) scale(1)`}
      >
        {/* Background circle with glow */}
        <circle
          r='12'
          fill='none'
          cx={12}
          cy={12}
          stroke={statusColor}
          strokeWidth='2'
          stroke-dasharray='17 8'
          stroke-linecap='round'
        >
          <animate
            attributeName='rotate'
            values='0;36;0'
            dur='1s'
            repeatCount='indefinite'
          />

          <animate
            attributeName='stroke-dashoffset'
            values='0;100;0'
            dur='20s'
            repeatCount='indefinite'
          />
        </circle>
      </g>
    </g>
  )
}
