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
  const { fromHandle } = useConnection()
  // Create a mock target node at the cursor position
  const targetNode = {
    id: 'connection-target',
    measured: {
      width: 1,
      height: 1,
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
          y: 0,
          width: 1,
          height: 1,
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
        ? '#00a63e'
        : '#fb2c36'

  return (
    <g>
      {/* Subtle glow pulse */}
      <defs>
        <filter id='glow' x='-50%' y='-50%' width='200%' height='200%'>
          <feGaussianBlur stdDeviation='5' result='blur' />
          <feMerge>
            <feMergeNode in='blur' />
            <feMergeNode in='SourceGraphic' />
          </feMerge>
        </filter>
      </defs>

      <path
        fill='none'
        stroke='#0215FF'
        strokeWidth={2}
        d={edgePath}
        style={{
          filter: 'url(#glow)',
          animation: 'glowPulse 2s ease-in-out infinite',
        }}
      />

      {/* Pulsing flowing dots */}
      <path id='tracePath' fill='none' stroke='none' d={edgePath} />
      <circle r='3' fill={dotColor}>
        <animateMotion
          dur='2.5s'
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
          dur='2.5s'
          repeatCount='indefinite'
        />
        <animate
          attributeName='opacity'
          values='0;1;0'
          dur='2.5s'
          repeatCount='indefinite'
        />
      </circle>

      <circle
        cx={tx || toX}
        cy={ty || toY}
        r={3}
        stroke={dotColor}
        strokeWidth={1.5}
        fill='none'
      />
      <style>{`
        @keyframes glowPulse {
          0%, 100% {
            filter: url(#glow);
            opacity: 0.6;
          }
          50% {
            filter: url(#glow);
            opacity: 1;
          }
        }
      `}</style>
    </g>
  )
}
