import React, { useCallback, useMemo, useRef, useState } from 'react'

/**
 * Tailwind v4 + React + TypeScript implementation of the parallax tilt cards.
 */

type TiltEffect = 'normal' | 'reverse'

interface Vars {
  rX: number
  rY: number
  bX: number
  bY: number
}

interface CardProps {
  label: string
  effect?: TiltEffect
  className?: string
  imageUrl: string
}

export default function ParallaxCard({
  label,
  effect = 'reverse',
  imageUrl,
  className,
}: CardProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const [active, setActive] = useState(false)

  // Rotation + background position variables
  const [vars, setVars] = useState<Vars>({ rX: 0, rY: 0, bX: 50, bY: 80 })

  const handleMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const el = wrapRef.current
      if (!el) return

      const rect = el.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const w = rect.width
      const h = rect.height

      // Reduced tilt magnitude for subtlety
      const intensity = 0.5
      let X: number
      let Y: number

      if (effect === 'reverse') {
        X = ((x - w / 2) / 3 / 3) * intensity
        Y = (-(y - h / 2) / 3 / 3) * intensity
      } else {
        X = (-(x - w / 2) / 3 / 3) * intensity
        Y = ((y - h / 2) / 3 / 3) * intensity
      }

      const rY = +X.toFixed(2)
      const rX = +Y.toFixed(2)

      const bY = 50 - +(X / 4).toFixed(2)
      const bX = 50 - +(Y / 4).toFixed(2)

      setVars({ rX, rY, bX, bY })
    },
    [effect]
  )

  const handleEnter = useCallback(() => setActive(true), [])
  const handleLeave = useCallback(() => {
    setActive(false)
    setVars({ rX: 0, rY: 0, bX: 50, bY: 50 })
  }, [])

  // Added a tad more delay to transitions for smoother hover-in/out
  const transitionStyle = useMemo<React.CSSProperties>(
    () =>
      active
        ? { transition: 'transform 750ms ease-out 0.05s' }
        : { transition: 'transform 750ms ease-in 0.01s' },
    [active]
  )

  return (
    <div
      ref={wrapRef}
      onMouseMove={handleMove}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      className={`group cursor-pointer [perspective:100rem] [transform-style:preserve-3d] ${className ?? ''}`}
    >
      <div
        className='grid-gradient-cover relative flex h-[26rem] w-[42rem] items-end rounded-xl border-slate-400 px-14 shadow-[0_0_3rem_.5rem_rgba(0,0,0,0.2)]'
        style={{
          ...transitionStyle,
          transform: `rotateX(${vars.rX}deg) rotateY(${vars.rY}deg)`,
          backgroundImage: `linear-gradient(hsla(0,0%,0%,.1), hsla(0,0%,0%,0.1)), url(${imageUrl})`,
          backgroundPosition: `${vars.bX}% ${vars.bY}%`,
          backgroundSize: '36rem auto',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div className='opacity-5s0 pointer-events-none absolute top-8 right-8 z-20 h-8 w-8 border border-b-0 border-l-0 border-slate-400 transition-all duration-300 group-hover:h-[calc(100%-4rem)] group-hover:w-[calc(100%-4rem)]' />
        <div className='pointer-events-none absolute bottom-8 left-8 z-20 h-8 w-8 border border-t-0 border-r-0 border-slate-400 opacity-30 transition-all duration-300 group-hover:h-[calc(100%-4rem)] group-hover:w-[calc(100%-4rem)]' />
        <p className='!text-art text-slate-400 uppercase select-none'>
          {label}
        </p>
      </div>
    </div>
  )
}
