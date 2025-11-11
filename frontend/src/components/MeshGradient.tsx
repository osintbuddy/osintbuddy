import { usePrefersReducedMotion } from '@/app/utilities'
import { useEffect, useMemo, useRef } from 'preact/hooks'

type Swatch = { x: number; y: number; w: number; h: number; fill: string }

type Quality = 'ultra' | 'high' | 'medium' | 'low'

const QUALITY_PRESETS: Record<
  Quality,
  {
    swatchBlur: number
    maskFeather: number
    filterRes: number
    fps: number
  }
> = {
  ultra: { swatchBlur: 400, maskFeather: 128, filterRes: 512, fps: 60 },
  high: { swatchBlur: 300, maskFeather: 96, filterRes: 384, fps: 45 },
  medium: { swatchBlur: 220, maskFeather: 72, filterRes: 256, fps: 30 },
  low: { swatchBlur: 160, maskFeather: 56, filterRes: 192, fps: 24 },
}

export default function MeshGradient({
  className = '',
  SPREAD = 12,
  FEATHER = 128,
  SWATCH_BLUR = 400,
  speed = 3.5,
  CARD = { w: 380, h: 180, rx: 2 },
  VIEW = { w: 700, h: 500 },
  baseSwatches = [
    {
      x: 132.13385412516828,
      y: -63.13519137556082,
      w: 543.0827531492929,
      h: 443.35391125090734,
      fill: '#0252FFE6',
    },
    {
      x: 183.45440121827244,
      y: 200.6640435642675,
      w: 369.2586666541014,
      h: 511.40074974321,
      fill: '#03A3FFDA',
    },
    {
      x: 206.7676537115779,
      y: 136.7852504585336,
      w: 418.11304824582896,
      h: 590.8723088478614,
      fill: '#1567FFD6',
    },
    {
      x: 432.904548621635,
      y: 205.49908771984866,
      w: 507.17667558488813,
      h: 466.67478806908105,
      fill: '#C600F8CF',
    },
  ],
  /** Optional runtime quality override */
  quality = 'high' as Quality,
}: {
  className?: string
  SPREAD?: number
  FEATHER?: number
  SWATCH_BLUR?: number
  speed?: number
  CARD?: { w: number; h: number; rx: number }
  VIEW?: { w: number; h: number }
  baseSwatches?: Swatch[]
  quality?: Quality
}) {
  const prefersReducedMotion = usePrefersReducedMotion()

  const CARD_POS = useMemo(
    () => ({
      x: (VIEW.w - CARD.w) / 2,
      y: (VIEW.h - CARD.h) / 2,
    }),
    [VIEW.w, VIEW.h, CARD.w, CARD.h]
  )

  // Merge quality preset with explicit props (explicit wins)
  const Q = useMemo(() => {
    const preset = QUALITY_PRESETS[quality]
    return {
      swatchBlur: SWATCH_BLUR ?? preset.swatchBlur,
      maskFeather: FEATHER ?? preset.maskFeather,
      filterRes: preset.filterRes,
      fps: preset.fps,
    }
  }, [quality, SWATCH_BLUR, FEATHER])

  const rafRef = useRef<number | null>(null)
  const startRef = useRef<number | null>(null)
  const groupRef = useRef<SVGGElement | null>(null)
  const swatchRefs = useRef<SVGRectElement[]>([])
  const swatchTfRefs = useRef<SVGTransform[] | null[]>([]) // for transform baseVal

  const mountedRef = useRef(false)
  const visibleRef = useRef(true)
  const lastFrameRef = useRef(0)

  // Precompute LFO params (stable across renders)
  const lfoParams = useMemo(() => {
    const base1 = 0.12,
      base2 = 0.17,
      step1 = 0.03,
      step2 = 0.02
    const f1 = new Float32Array(baseSwatches.length)
    const f2 = new Float32Array(baseSwatches.length)
    for (let i = 0; i < baseSwatches.length; i++) {
      f1[i] = base1 + i * step1
      f2[i] = base2 + i * step2
    }
    return { f1, f2 }
  }, [baseSwatches.length])

  useEffect(() => {
    if (prefersReducedMotion) return

    // IntersectionObserver: pause when not in viewport
    const target = groupRef.current?.ownerSVGElement
    let io: IntersectionObserver | null = null
    if (target && 'IntersectionObserver' in window) {
      io = new IntersectionObserver(
        (entries) => {
          visibleRef.current = entries.some((e) => e.isIntersecting)
        },
        { root: null, threshold: 0 }
      )
      io.observe(target)
    }

    const onVis = () => {
      visibleRef.current = document.visibilityState === 'visible'
    }
    document.addEventListener('visibilitychange', onVis)

    mountedRef.current = true

    const minDelta = 1000 / Q.fps
    const eps = 0.4 // only update transforms if movement exceeds this many pixels

    const run = (t: number) => {
      if (!mountedRef.current) return
      if (!visibleRef.current) {
        rafRef.current = requestAnimationFrame(run)
        return
      }
      if (startRef.current == null) startRef.current = t
      if (t - lastFrameRef.current < minDelta) {
        rafRef.current = requestAnimationFrame(run)
        return
      }
      lastFrameRef.current = t

      const elapsed = (t - startRef.current) / 1000
      const v = 0.5 + speed * 2.0

      // Compute shared sin/cos once
      const s1 = Math.sin(elapsed * 0.07 * v)
      const s2 = Math.sin(elapsed * 0.011 * v)
      const c1 = Math.cos(elapsed * 0.05 * v)
      const s3 = Math.sin(elapsed * 0.021 * v)

      // Move the whole blob group with one transform (CSS transform is fast in modern engines)
      if (groupRef.current) {
        const px = s1 * 120 + s2 * 40
        const py = c1 * 60 + s3 * 30
        // Use style.transform to hit the CSS transform path (hardware accelerated)
        const style = (groupRef.current as unknown as HTMLElement).style as any
        // only write if changed enough
        const prev = style.transform || ''
        const next = `translate(${px.toFixed(2)}px, ${py.toFixed(2)}px)`
        if (prev !== next) style.transform = next
      }

      // Per-swatch LFO with minimal trig:
      // lfo1 = sin(a * elapsed * v), lfo2 = cos(b * elapsed * v)
      const { f1, f2 } = lfoParams
      for (let i = 0; i < swatchRefs.current.length; i++) {
        const rect = swatchRefs.current[i]
        const base = baseSwatches[i]
        if (!rect || !base) continue

        const a = f1[i] * v
        const b = f2[i] * v
        // sin/cos via single call each
        const lfo1 = Math.sin(elapsed * a)
        const lfo2 = Math.cos(elapsed * b)

        const tx = lfo1 * 24 + lfo2 * 10
        const ty = lfo2 * 18 + lfo1 * 8

        // Use SVG transform list (avoid touching x/y). Only update when it changes enough.
        const tfList = rect.transform.baseVal
        let tfx = swatchTfRefs.current[i]
        if (!tfx) {
          tfx = rect.ownerSVGElement!.createSVGTransform()
          tfList.initialize(tfx)
          swatchTfRefs.current[i] = tfx
        }
        // Read back current values from matrix
        const m = tfList.consolidate()?.matrix
        const curX = m ? m.e : 0
        const curY = m ? m.f : 0
        if (Math.abs(curX - tx) > eps || Math.abs(curY - ty) > eps) {
          tfx.setTranslate(tx, ty)
          tfList.initialize(tfx)
        }
      }

      rafRef.current = requestAnimationFrame(run)
    }

    rafRef.current = requestAnimationFrame(run)
    return () => {
      mountedRef.current = false
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      startRef.current = null
      io?.disconnect()
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [speed, prefersReducedMotion, baseSwatches, lfoParams, Q.fps])

  // Compute tight filter bbox once (leave headroom for motion)
  const swatchBBox = useMemo(() => {
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity
    for (const s of baseSwatches) {
      minX = Math.min(minX, s.x)
      minY = Math.min(minY, s.y)
      maxX = Math.max(maxX, s.x + s.w)
      maxY = Math.max(maxY, s.y + s.h)
    }
    // Allow for translation range (~160px horizontally, ~90px vertically) + lfo ranges
    const paddingX = 220
    const paddingY = 140
    return {
      x: Math.max(0, Math.floor(minX - paddingX)),
      y: Math.max(0, Math.floor(minY - paddingY)),
      w: Math.ceil(maxX - minX + paddingX * 2),
      h: Math.ceil(maxY - minY + paddingY * 2),
    }
  }, [baseSwatches])

  return (
    <svg
      className={`pointer-events-none -z-10 block ${className}`}
      width={VIEW.w}
      height={VIEW.h}
      viewBox={`0 0 ${VIEW.w} ${VIEW.h}`}
    >
      <defs>
        {/* Main blur for the colorful swatches (bounded + filterRes) */}
        <filter
          id='swatchBlur'
          filterUnits='userSpaceOnUse'
          x={swatchBBox.x}
          y={swatchBBox.y}
          width={swatchBBox.w}
          height={swatchBBox.h}
          filterRes={Q.filterRes}
        >
          <feGaussianBlur stdDeviation={Q.swatchBlur} edgeMode='duplicate' />
        </filter>

        {/* Feather the mask edges (bounded + filterRes) */}
        <filter
          id='maskFeather'
          filterUnits='userSpaceOnUse'
          x={CARD_POS.x - SPREAD - Q.maskFeather * 2}
          y={CARD_POS.y - SPREAD - Q.maskFeather * 2}
          width={CARD.w + SPREAD * 2 + Q.maskFeather * 4}
          height={CARD.h + SPREAD * 2 + Q.maskFeather * 4}
          filterRes={Q.filterRes}
        >
          <feGaussianBlur stdDeviation={Q.maskFeather} edgeMode='duplicate' />
        </filter>

        {/* Card & outer “dilated” card for the ring band */}
        <rect
          id='card'
          x={CARD_POS.x}
          y={CARD_POS.y}
          width={CARD.w}
          height={CARD.h}
          rx={CARD.rx}
          ry={CARD.rx}
        />
        <rect
          id='cardOuter'
          x={CARD_POS.x - SPREAD}
          y={CARD_POS.y - SPREAD}
          width={CARD.w + SPREAD * 2}
          height={CARD.h + SPREAD * 2}
          rx={CARD.rx + SPREAD}
          ry={CARD.rx + SPREAD}
        />

        {/* Mask: ring between card and cardOuter, feathered to 0 at both edges */}
        <mask id='edgeGlowMask' maskUnits='userSpaceOnUse'>
          <rect x='0' y='0' width={VIEW.w} height={VIEW.h} fill='black' />
          <g filter='url(#maskFeather)'>
            <use href='#cardOuter' fill='white' />
            <use href='#card' fill='#606060' />
          </g>
        </mask>
      </defs>

      <g mask='url(#edgeGlowMask)'>
        {/* translate on this <g> is applied via CSS transform in the rAF */}
        <g ref={groupRef} filter='url(#swatchBlur)'>
          {baseSwatches.map((s, i) => (
            <rect
              key={i}
              ref={(el) => {
                if (el) swatchRefs.current[i] = el
              }}
              x={s.x}
              y={s.y}
              width={s.w}
              height={s.h}
              fill={s.fill}
            />
          ))}
        </g>
      </g>
    </svg>
  )
}
