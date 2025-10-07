import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { Group } from '@visx/group'
import { scaleLinear } from '@visx/scale'

type Node = {
  id: string
  label: string
  color: string
}

type Link = {
  source: string
  target: string
  value: number
}

interface ChordDiagramProps {
  width: number
  height: number
  nodes: Node[]
  links: Link[]
  innerRadius?: number
  outerRadius?: number
  scale?: number
  panX?: number
  panY?: number
}

const toCartesian = (
  cx: number,
  cy: number,
  r: number,
  angle: number
): { x: number; y: number } => ({
  x: cx + r * Math.cos(angle),
  y: cy + r * Math.sin(angle),
})

const donutSegmentPath = (
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  start: number,
  end: number
) => {
  const largeArc = end - start > Math.PI ? 1 : 0
  const startOuter = toCartesian(cx, cy, outerR, start)
  const endOuter = toCartesian(cx, cy, outerR, end)
  const startInner = toCartesian(cx, cy, innerR, end)
  const endInner = toCartesian(cx, cy, innerR, start)
  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${endOuter.x} ${endOuter.y}`,
    `L ${startInner.x} ${startInner.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${endInner.x} ${endInner.y}`,
    'Z',
  ].join(' ')
}

export default function ChordDiagram({
  width,
  height,
  nodes,
  links,
  innerRadius,
  outerRadius,
  scale = 1,
  panX = 0,
  panY = 0,
}: ChordDiagramProps) {
  const margin = 12
  const cx = width / 2
  const cy = height / 2
  const maxR = Math.min(width, height) / 2 - margin
  const oR = outerRadius ?? maxR
  const iR = innerRadius ?? Math.max(0, oR - 22)

  const layout = useMemo(() => {
    const count = nodes.length
    if (count === 0) return { arcs: [], nodeById: new Map<string, any>() }
    const padding = (Math.PI * 2) * 0.02 // 2% total padding
    const step = ((Math.PI * 2) - padding * count) / count
    const arcs = nodes.map((n, i) => {
      const start = i * (step + padding)
      const end = start + step
      const mid = (start + end) / 2
      return { id: n.id, label: n.label, color: n.color, start, end, mid }
    })
    const nodeById = new Map(arcs.map((a) => [a.id, a]))
    return { arcs, nodeById }
  }, [nodes])

  const totals = useMemo(() => {
    const map = new Map<string, number>()
    nodes.forEach((n) => map.set(n.id, 0))
    links.forEach((l) => {
      map.set(l.source, (map.get(l.source) || 0) + l.value)
      map.set(l.target, (map.get(l.target) || 0) + l.value)
    })
    return map
  }, [nodes, links])

  const widthScale = useMemo(() => {
    const vals = links.map((l) => l.value)
    const min = vals.length ? Math.min(...vals) : 0
    const max = vals.length ? Math.max(...vals) : 1
    return scaleLinear<number>({ domain: [min, max], range: [2, 12] })
  }, [links])

  const s = Math.max(0.5, Math.min(2, scale))

  // Internal drag-based panning (click + hold)
  const [dragPan, setDragPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const isDraggingRef = useRef(false)
  const lastPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })

  // If external pan props reset (e.g., reset view), optionally sync drag offset
  useEffect(() => {
    // When consumer resets to 0, align internal drag pan to 0 to reflect reset
    if (panX === 0 && panY === 0) {
      setDragPan({ x: 0, y: 0 })
    }
  }, [panX, panY])

  const onPointerDown = (e: any) => {
    isDraggingRef.current = true
    lastPosRef.current = { x: e.clientX, y: e.clientY }
    if (e?.currentTarget?.setPointerCapture && e?.pointerId != null) {
      e.currentTarget.setPointerCapture(e.pointerId)
    }
    if (e?.preventDefault) e.preventDefault()
  }

  const onPointerMove = (e: any) => {
    if (!isDraggingRef.current) return
    const dx = (e.clientX ?? 0) - lastPosRef.current.x
    const dy = (e.clientY ?? 0) - lastPosRef.current.y
    lastPosRef.current = { x: e.clientX ?? 0, y: e.clientY ?? 0 }
    // Apply raw deltas to pan; scale does not affect panning distance
    setDragPan((p) => ({ x: p.x + dx, y: p.y + dy }))
    if (e?.preventDefault) e.preventDefault()
  }

  const endDrag = (e?: any) => {
    isDraggingRef.current = false
    if (e?.preventDefault) e.preventDefault()
  }

  const combinedPanX = panX + dragPan.x
  const combinedPanY = panY + dragPan.y

  return (
    <svg
      className="cursor-grab active:cursor-grabbing"
      width={'100%'}
      height={'100%'}
      viewBox={`0 0 ${width+42} ${height+42}`}
      preserveAspectRatio='xMidYMid meet'
      style={{ touchAction: 'none' }}
      onPointerDown={onPointerDown as any}
      onPointerMove={onPointerMove as any}
      onPointerUp={endDrag as any}
      onPointerCancel={endDrag as any}
      onPointerLeave={endDrag as any}
    >
      <defs>
        <radialGradient id='chord-center-fade' cx='50%' cy='50%'>
          <stop offset='0%' stopColor='rgba(0,0,0,0.0)' />
          <stop offset='100%' stopColor='rgba(0,0,0,0.3)' />
        </radialGradient>
      </defs>
      <g transform={`translate(${cx + combinedPanX},${cy + combinedPanY}) scale(${s}) translate(${-cx},${-cy})`}>
        {/* soft center vignette */}
        <circle cx={cx} cy={cy} r={iR * 0.75} fill='url(#chord-center-fade)' />

        {/* links as curved strokes */}
        <Group>
          <g fill='none' strokeLinecap='round' strokeOpacity={0.6}>
          {links.map((l, idx) => {
            const a = layout.nodeById.get(l.source)
            const b = layout.nodeById.get(l.target)
            if (!a || !b) return null
            const p1 = toCartesian(cx, cy, iR, a.mid)
            const p2 = toCartesian(cx, cy, iR, b.mid)
            const c1 = { x: (p1.x + cx * 2) / 3, y: (p1.y + cy * 2) / 3 }
            const c2 = { x: (p2.x + cx * 2) / 3, y: (p2.y + cy * 2) / 3 }
            const d = `M ${p1.x} ${p1.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${p2.x} ${p2.y}`
            const color = a.color
          return (
            <path
              key={idx}
              d={d}
              stroke={color}
              strokeWidth={widthScale(l.value)}
            >
              <title>
                {`${a.label} 	→ ${b.label} 	(${l.value})`}
              </title>
            </path>
          )
        })}
        </g>
        </Group>

        {/* outer arcs */}
        <Group>
        {layout.arcs.map((arc) => {
          const total = totals.get(arc.id) || 0
          return (
            <path
              key={arc.id}
              d={donutSegmentPath(cx, cy, iR, oR, arc.start, arc.end)}
              fill={arc.color}
              fillOpacity={0.2}
              stroke={arc.color}
              strokeOpacity={0.8}
            >
              <title>{`${arc.label} — total ${total}`}</title>
            </path>
          )
        })}
        </Group>

        {/* labels */}
        <Group>
        {layout.arcs.map((arc) => {
          const labelR = oR + 14
          const p = toCartesian(cx, cy, labelR, arc.mid)
          const rotation = (arc.mid * 180) / Math.PI
          const flip = rotation > 90 && rotation < 270
          return (
            <g key={arc.id} transform={`translate(${p.x},${p.y})`}>
              <text
                transform={`rotate(${rotation + (flip ? 180 : 0)})`}
                fill={arc.color}
                fontSize={11}
                fontWeight={600}
                textAnchor='middle'
                style={{
                  textRendering: 'optimizeLegibility',
                  letterSpacing: '0.2px',
                }}
              >
                {arc.label}
              </text>
            </g>
          )
        })}
        </Group>
      </g>
    </svg>
  )
}
