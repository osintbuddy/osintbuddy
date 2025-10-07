import { FunctionComponent } from 'preact'

type ActivityGridProps = {
  // Map of ISO date (YYYY-MM-DD) to count
  data?: Record<string, number>
  // Cell size in pixels
  size?: number
  // Gap between cells in pixels
  gap?: number
  // Optional max to normalize color scale
  maxCount?: number
  className?: string
}

// Helper to format a Date as YYYY-MM-DD in local time
const fmt = (d: Date) => {
  const year = d.getFullYear()
  const month = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Simple 5-step green scale similar in spirit to GitHub's
const COLOR_SCALE = [
  '#101727', // 0 (very dark bg)
  '#0e4429', // 1
  '#006d32', // 2
  '#26a641', // 3
  '#39d353', // 4 (bright)
]

const levelFor = (count: number, max: number) => {
  if (max <= 0) return 0
  // Map count to 0..4
  if (count <= 0) return 0
  const r = count / max
  if (r < 0.25) return 1
  if (r < 0.5) return 2
  if (r < 0.75) return 3
  return 4
}

const ActivityGrid: FunctionComponent<ActivityGridProps> = ({
  data = {},
  size = 13,
  gap = 4,
  maxCount,
  className = '',
}) => {
  // Fixed display window of ~1 year
  const WEEKS = 53
  // Build a matrix of days ending today, column = week, row = weekday (Sun..Sat)
  const today = new Date()
  // Align to end of current week (so the last column is current week)
  const end = new Date(today)
  const daysToSunday = end.getDay() // 0=Sun
  // We want last column to end on Saturday; shift to Saturday of current week
  const endShift = 6 - daysToSunday
  end.setDate(end.getDate() + endShift)

  const totalDays = WEEKS * 7
  const dates: Date[] = []
  for (let i = totalDays - 1; i >= 0; i--) {
    const d = new Date(end)
    d.setDate(end.getDate() - i)
    dates.push(d)
  }

  // Compute max for color normalization if not provided
  let computedMax = 0
  if (maxCount == null) {
    for (const d of dates) {
      const key = fmt(d)
      const v = data[key] ?? 0
      if (v > computedMax) computedMax = v
    }
  }
  const MAX = maxCount ?? computedMax

  // Grid template: columns = weeks, rows = 7
  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: `repeat(${WEEKS}, ${size}px)`,
    gridTemplateRows: `repeat(7, ${size}px)`,
    gridAutoFlow: 'column',
    gap: `${gap}px`,
  } as any

  // Left day labels column uses same row sizing to align with grid
  const dayColStyle = {
    display: 'grid',
    gridTemplateRows: `repeat(7, ${size}px)`,
    gap: `${gap}px`,
  } as any

  // Month labels row aligned with columns
  const monthRowStyle = {
    display: 'grid',
    gridTemplateColumns: `repeat(${WEEKS}, ${size}px)`,
    gap: `${gap}px`,
  } as any

  // Compute month segments that span entire month across columns
  type MonthSeg = { startCol: number; span: number; label: string }
  const monthSegs: MonthSeg[] = []
  for (let c = 0; c < WEEKS; c++) {
    const startIdx = c * 7
    const startDate = dates[startIdx]
    if (!startDate) continue
    const curMonth = startDate.getMonth()
    const curYear = startDate.getFullYear()
    const curLabel = `${startDate.toLocaleString(undefined, { month: 'short' })}`
    if (monthSegs.length === 0) {
      monthSegs.push({ startCol: c + 1, span: 1, label: curLabel })
      continue
    }
    const last = monthSegs[monthSegs.length - 1]
    const lastStartIdx = (last.startCol - 1) * 7
    const lastDate = dates[lastStartIdx]
    const lastMonth = lastDate?.getMonth()
    const lastYear = lastDate?.getFullYear()
    if (lastMonth === curMonth && lastYear === curYear) {
      last.span += 1
    } else {
      monthSegs.push({ startCol: c + 1, span: 1, label: curLabel })
    }
  }

  return (
    <div className={`flex flex-col items-center group relative  w-full place-items-start`}>
      
      <div className='w-full rounded-md border border-slate-900/50 bg-cod-900/60 p-3  pt-2 flex items-center flex-col shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_20px_60px_-20px_rgba(0,0,0,0.6)] backdrop-blur-md'>
         <div className='my-3 inline-flex items-center rounded-sm border border-slate-700/60 bg-slate-900/60 px-2 py-1 font-mono text-[10px] tracking-[0.25em] text-slate-300/80 uppercase'>
              activity // events overview
            </div>
     {/* Month labels row */}
        <div className='flex items-start'>
          {/* Spacer to align with day labels column */}
          <div style={{ width: 26 }} />
          <div style={monthRowStyle} className='ml-1 mt-0.5 text-[10px] text-slate-500'>
            {monthSegs.map((seg, idx) => (
              <div
                key={`${seg.label}-${idx}`}
                style={{ gridColumn: `${seg.startCol} / span ${seg.span}` }}
                className='truncate'
                title={seg.label}
              >
                {seg.label}
              </div>
            ))}
          </div>
        </div>
        {/* Grid with left day labels */}
        <div className='mt-1 flex items-start'>
          {/* Day labels: Mon Wed Fri */}
          <div style={dayColStyle} className=' text-[10px] text-slate-500'>
            {[0, 1, 2, 3, 4, 5, 6].map((row) => (
              <div key={row} className='flex items-center justify-end pr-1.5' style={{ width: 26 }}>
                {row === 1 ? 'Mon' : row === 3 ? 'Wed' : row === 5 ? 'Fri' : ''}
              </div>
            ))}
          </div>
          <div style={gridStyle} aria-label='Activity heatmap grid'>
            {dates.map((d) => {
              const key = fmt(d)
              const count = data[key] ?? 0
              const level = levelFor(count, MAX)
              const bg = COLOR_SCALE[level]
              return (
                <div
                  key={key}
                  title={`${key}: ${count} event${count === 1 ? '' : 's'}`}
                  style={{
                    width: `${size}px`,
                    height: `${size}px`,
                    backgroundColor: bg,
                    borderRadius: 2,
                    border: '1px solid rgba(15,23,42,0.6)',
                  }}
                />
              )
            })}
          </div>
        </div>
        {/* Legend */}
        <div className='mt-3 mr-auto flex items-center justify-end gap-2 text-[10px] text-slate-500'>
          Less
          {[0, 1, 2, 3, 4].map((lvl) => (
            <span
              key={lvl}
              style={{
                width: `${size}px`,
                height: `${size}px`,
                backgroundColor: COLOR_SCALE[lvl],
                borderRadius: 2,
                border: '1px solid rgba(15,23,42,0.6)',
                display: 'inline-block',
              }}
            />
          ))}
          More
        </div>
      </div>
    </div>
  )
}

export default ActivityGrid

// Utility to build a dataset from an array of ISO strings
export const buildActivityData = (isoDates: string[]): Record<string, number> => {
  const map: Record<string, number> = {}
  for (const iso of isoDates) {
    // Normalize to local date (YYYY-MM-DD)
    const d = new Date(iso)
    const key = fmt(d)
    map[key] = (map[key] ?? 0) + 1
  }
  return map
}
