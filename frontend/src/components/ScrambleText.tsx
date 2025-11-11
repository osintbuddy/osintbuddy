import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { CSSProperties } from 'react-dom/src'

type ScrambleProps = {
  phrases?: string[]
  text?: string
  speed?: number
  hold?: number
  delay?: number
  charset?: string
  className?: string
  style?: CSSProperties
  onDone?: (finalText: string) => void
}

export default function ScrambleText({
  phrases,
  text,
  speed = 40,
  hold = 275,
  delay = 0,
  charset = '!<>-_\\/[]{}—=+*^?#☲☶♅♁♇♯⚎⚶______________',
  className,
  onDone,
  style,
}: ScrambleProps) {
  const [display, setDisplay] = useState<string>('')
  const [phaseIdx, setPhaseIdx] = useState(0)
  const target = phrases?.length ? phrases[phaseIdx] : (text ?? '')
  const chars = useMemo(() => charset.split(''), [charset])

  const [delayed, setDelayed] = useState(false)

  const rafRef = useRef<number | null>(null)
  const animRef = useRef<{
    i: number // current index we’re decoding
    fixed: string // already-decoded left segment
    lastCharAt: number // timestamp of last “lock” step
    running: boolean
  } | null>(null)

  useEffect(() => {
    if (target == null) return

    cancel()
    setDisplay((prev) => prev)

    animRef.current = {
      i: 0,
      fixed: '',
      lastCharAt: performance.now(),
      running: true,
    }
    const tick = (ts: number) => {
      const st = animRef.current
      if (!st || !st.running) return

      if (ts - st.lastCharAt >= speed) {
        if (st.i < target.length) {
          st.fixed += target[st.i]
        }
        st.i += 1
        st.lastCharAt = ts
      }

      if (st.i >= target.length) {
        setDisplay(target)
        st.running = false
        onDone?.(target)

        if (phrases?.length) {
          const id = window.setTimeout(() => {
            setPhaseIdx((idx) => (idx + 1) % phrases.length)
          }, hold)
          // store timeout id (negative to distinguish from RAF id)
          rafRef.current = -id
        }
        return
      }

      const scrambled = randomChar(chars)
      const restBlanks = target.slice(st.i + 1).replace(/./g, ' ')
      setDisplay(st.fixed + wrapDud(scrambled) + restBlanks)

      rafRef.current = requestAnimationFrame(tick)
    }
    if (!delayed) {
      setTimeout(() => {
        rafRef.current = requestAnimationFrame(tick)
        setDelayed(true)
      }, delay)
    }
    return cancel

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, speed, hold, charset, phrases?.length])

  function cancel() {
    if (rafRef.current != null) {
      if (rafRef.current >= 0) cancelAnimationFrame(rafRef.current)
      else window.clearTimeout(-rafRef.current)
      rafRef.current = null
    }
    if (animRef.current) {
      animRef.current.running = false
      animRef.current = null
    }
  }

  return (
    <span
      style={style}
      className={className}
      dangerouslySetInnerHTML={{ __html: display }}
    />
  )
}

function randomChar(pool: string[]) {
  return pool[(Math.random() * pool.length) | 0] || ''
}

function wrapDud(ch: string) {
  return `<span class="dud">${escapeHTML(ch)}</span>`
}

function escapeHTML(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// TODO: Compile this into something that sounds nice...
/* there are no secrets—only information waiting to be discovered.
foundation upon which truths are built.
it's not just about finding answers; it's about asking the right questions...
there are no closed doors
Knowledge is like a double-edged sword: it cuts through deception but can just as easily carve into trust.
In the information age, knowing is not just half the battle — it’s the whole war.
The age of secrets is over — today, only the lazy keep their lives hidden.
Technology advances, but human nature remains the same.
If you can predict how someone will react, you control the outcome.
Fear opens doors that logic would otherwise keep shut.
The most dangerous thing you can give a stranger is your trust.
Trust is a currency — it can be exchanged, spent, or stolen.
We trust the familiar, but it is the familiar that often betrays us.
To break someone’s defenses, first gain their trust.
The bait is always something intriguing; the trap is always invisible until it’s too late.
People can’t resist a mystery, but they often don’t think about the consequences of solving it.
Persuasion is not about forcing someone to act — it’s about making them want to act.
Just because you can gather information doesn’t mean you should.
The line between right and wrong in OSINT is often blurred, but it’s up to us to define it.
Awareness is the key to building a strong human firewall.
Fear is a powerful motivator — but so is curiosity.
In the future, the line between truth and deception will become even harder to distinguish.
The world is full of information, but it’s how we use it that defines us.
*/

// usage:
//  <ScrambleText
//               phrases={useCustom ? undefined : phrases}
//               text={useCustom ? customText : undefined}
//               perCharMs={speed}
//               holdMs={hold}
//               className="[text-wrap:balance]"
//             />
