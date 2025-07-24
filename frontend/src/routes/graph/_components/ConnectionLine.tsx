import {
  ConnectionLineComponentProps,
  getBezierPath,
  useConnection,
  Position,
} from '@xyflow/react'
import { getEdgeParams } from './utils'

export default function NewConnectionLine({
  fromX,
  fromY,
  toX,
  toY,
  connectionStatus,
  fromNode,
  fromPosition,
  toPosition,
}: ConnectionLineComponentProps) {
  // Create a mock target node at the cursor position
  console.log(fromPosition, toPosition, toX, toY)
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
          position: handle,
          x: 0,
          y: -6,
          width: 8,
          height: 8,
        })),
      },
    },
  }
  const { sx, sy, tx, ty, sourcePos, targetPos } = getEdgeParams(
    fromNode,
    targetNode
  )
  const [edgePath] = getBezierPath({
    sourceX: sx,
    sourceY: sy,
    sourcePosition: sourcePos || fromPosition,
    targetPosition: targetPos || toPosition,
    targetX: tx || toX,
    targetY: ty || toY,
    curvature: 0.01,
  })

  const dotColor =
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
        stroke-dasharray='4'
        strokeWidth={2}
        d={edgePath}
        style={{
          filter: 'url(#glow)',
          animation: 'glowPulse 2s ease-in-out infinite',
        }}
      />
      {/* Pulsing flowing dots */}
      <path id='tracePath' fill='none' stroke='none' d={edgePath} />
      <circle r='1' fill={dotColor}>
        <animateMotion
          dur='3s'
          begin='0s'
          repeatCount='indefinite'
          keyPoints='0;1'
          keyTimes='0;1'
          calcMode='linear'
        >
          <mpath href='#tracePath' />
        </animateMotion>
        <animate
          attributeName='r'
          values='1;3;1'
          begin='0s'
          dur='3s'
          repeatCount='indefinite'
        />
        <animate
          attributeName='opacity'
          values='0.2;0.75;0.2'
          begin='0s'
          dur='3s'
          repeatCount='indefinite'
        />
      </circle>
      <circle r='1' fill={dotColor}>
        <animateMotion
          dur='3s'
          begin='-1.5s'
          repeatCount='indefinite'
          keyPoints='0;1'
          keyTimes='0;1'
          calcMode='linear'
        >
          <mpath href='#tracePath' />
        </animateMotion>
        <animate
          attributeName='r'
          begin='-1.5s'
          values='1;3;1'
          dur='3s'
          repeatCount='indefinite'
        />
      </circle>
      <circle r='1' fill={dotColor}>
        <animateMotion
          dur='3s'
          begin='-3s'
          repeatCount='indefinite'
          keyPoints='0;1'
          keyTimes='0;1'
          calcMode='linear'
        >
          <mpath href='#tracePath' />
        </animateMotion>
        <animate
          attributeName='r'
          values='1;3;1'
          dur='3s'
          begin='-3s'
          repeatCount='indefinite'
        />
      </circle>
      {/* Dot under cursor position */}
      <circle
        cx={tx || toX}
        cy={ty || toY}
        r={5}
        stroke={dotColor}
        strokeWidth={2}
        fill='none'
      />
    </g>
  )
}
