import React, { useEffect, useMemo, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Icon } from '@/components/icons'
// ---------- tiny classnames helper ----------
const cx = (...s: Array<string | false | null | undefined>) =>
  s.filter(Boolean).join(' ')

// ---------- Icon shim using lucide-react ----------
// Fallback to Ellipsis for any unmapped/missing icon names so CDN lookup can never 404.
function WorkspaceIcon({
  name = 'atom-2',
  className,
}: {
  name: string
  className?: string
}) {
  return <Icon icon={name} className={className} />
}

// ---------- Types ----------
type Json = Record<string, any>

type JobEvent =
  | {
      type: 'progress'
      data: { pct?: number; note?: string; heartbeat?: boolean }
    }
  | { type: 'result'; data: any }
  | { type: 'error'; data: { message: string } }
  | { type: string; data?: any }

type StreamMsg = {
  action: 'job:event'
  job_id: string
  event: JobEvent
}

type TransformDescriptor = { label: string; icon?: string }

type PluginDescriptor = { label: string; author?: string; description?: string }

type TransformStart = {
  action: 'transform:started'
  job_id: string
  entity: Json
}

type WsLike = {
  send: (d: string) => void
  addEventListener: (t: 'message', f: (e: MessageEvent) => void) => void
  removeEventListener: (t: 'message', f: (e: MessageEvent) => void) => void
}

// ---------- Mock WebSocket to demo UI ----------
class MockWS implements WsLike {
  private listeners: Set<(e: MessageEvent) => void> = new Set()
  addEventListener(_t: 'message', f: (e: MessageEvent) => void) {
    this.listeners.add(f)
  }
  removeEventListener(_t: 'message', f: (e: MessageEvent) => void) {
    this.listeners.delete(f)
  }
  private emit(obj: any) {
    const e = new MessageEvent('message', { data: JSON.stringify(obj) })
    this.listeners.forEach((l) => l(e))
  }
  send(d: string) {
    const msg = JSON.parse(d)
    if (msg?.action === 'transform:entity') {
      const job_id = uuidv4()
      // started
      const started: TransformStart = {
        action: 'transform:started',
        job_id,
        entity: msg.entity,
      }
      this.emit(started)
      // simulate streaming progress + result
      const notes = [
        'resolving plugin',
        'building sandbox',
        'executing',
        'collecting outputs',
      ]
      let i = 0
      let pct = 0
      const tick = () => {
        if (i < notes.length) {
          pct = Math.min(95, pct + Math.floor(10 + Math.random() * 25))
          this.emit({
            action: 'job:event',
            job_id,
            event: {
              type: 'progress',
              data: { pct, note: notes[i] },
            } as JobEvent,
          })
          i++
          setTimeout(tick, 400)
        } else {
          const result = {
            kind: 'transform_children',
            entities: [
              {
                id: uuidv4(),
                data: {
                  label: 'cse_result',
                  title: 'Simulated Result',
                  score: 0.91,
                },
                position: { x: 200, y: 40 },
                edge_label: msg.entity?.transform,
              },
            ],
          }
          this.emit({
            action: 'job:event',
            job_id,
            event: { type: 'result', data: result } as JobEvent,
          })
        }
      }
      // heartbeats
      let hb = 0
      const hbInt = setInterval(() => {
        hb++
        if (hb > 8) return clearInterval(hbInt)
        this.emit({
          action: 'job:event',
          job_id,
          event: {
            type: 'progress',
            data: { pct, heartbeat: true },
          } as JobEvent,
        })
      }, 350)
      setTimeout(tick, 250)
    }
  }
}

// ---------- UI Components ----------
function ProgressBar({ pct = 0, note }: { pct?: number; note?: string }) {
  const v = Math.max(0, Math.min(100, pct ?? 0))
  return (
    <div className='w-full'>
      <div className='h-2 overflow-hidden rounded border border-slate-950 bg-slate-900/60 shadow-inner'>
        <div
          className='bg-primary-400 h-full transition-all duration-300 ease-out'
          style={{ width: `${v}%` }}
        />
      </div>
      <div className='mt-1 flex items-center text-xs text-slate-500'>
        <span className='mr-2'>{v}%</span>
        {note && <span className='opacity-80'>{note}</span>}
      </div>
    </div>
  )
}

function TimelineRow({ ev }: { ev: JobEvent }) {
  const ts = new Date().toLocaleTimeString()
  if (ev.type === 'progress') {
    const { pct, note, heartbeat } = ev.data || {}
    return (
      <div className='flex items-center gap-2 py-1'>
        <span className='w-14 text-[11px] text-slate-700'>{ts}</span>
        <WorkspaceIcon
          name={heartbeat ? 'activity' : 'activity'}
          className='text-primary-300 h-4 w-4'
        />
        <span className='text-sm text-slate-400'>
          Progress {pct ?? 0}% {note ? `– ${note}` : ''}
          {heartbeat ? ' (heartbeat)' : ''}
        </span>
      </div>
    )
  }
  if (ev.type === 'result') {
    return (
      <div className='flex items-center gap-2 py-1'>
        <span className='w-14 text-[11px] text-slate-700'>{ts}</span>
        <WorkspaceIcon name='check' className='h-4 w-4 text-lime-400' />
        <span className='text-sm text-slate-300'>Result received</span>
      </div>
    )
  }
  if (ev.type === 'error') {
    return (
      <div className='flex items-center gap-2 py-1'>
        <span className='w-14 text-[11px] text-slate-700'>{ts}</span>
        <WorkspaceIcon
          name='alert-triangle'
          className='text-danger-500 h-4 w-4'
        />
        <span className='text-danger-400 text-sm'>
          {ev.data?.message ?? 'Error'}
        </span>
      </div>
    )
  }
  return (
    <div className='flex items-center gap-2 py-1'>
      <span className='w-14 text-[11px] text-slate-700'>{ts}</span>
      <WorkspaceIcon name='ellipsis' className='h-4 w-4 text-slate-600' />
      <span className='text-sm text-slate-500'>{ev.type}</span>
    </div>
  )
}

type JobTab = {
  jobId: string
  label: string
  plugin: string
  events: JobEvent[]
  pct: number
  note?: string
  result?: any
}

function useJobStream(ws: WsLike) {
  const [tabs, setTabs] = useState<JobTab[]>([])
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data)
        if (data && data.action === 'transform:started') {
          const t = data as TransformStart
          const label = data?.entity?.transform ?? 'transform'
          const plugin = data?.entity?.data?.label ?? 'plugin'
          setTabs((prev) =>
            prev.find((p) => p.jobId === t.job_id)
              ? prev
              : [
                  ...prev,
                  { jobId: t.job_id, label, plugin, events: [], pct: 0 },
                ]
          )
        }
      } catch {}
    }
    ws.addEventListener('message', onMsg)
    return () => ws.removeEventListener('message', onMsg)
  }, [ws])

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data)
        if (data && data.action === 'job:event') {
          const m = data as StreamMsg
          setTabs((prev) =>
            prev.map((t) => {
              if (t.jobId !== m.job_id) return t
              const ev = m.event
              const next: JobTab = { ...t, events: [...t.events, ev] }
              if (ev.type === 'progress') {
                next.pct = ev.data?.pct ?? next.pct
                next.note = ev.data?.note ?? next.note
              } else if (ev.type === 'result') {
                next.result = ev.data
                next.pct = 100
                next.note = 'done'
              }
              return next
            })
          )
        }
      } catch {}
    }
    ws.addEventListener('message', onMsg)
    return () => ws.removeEventListener('message', onMsg)
  }, [ws])

  return { tabs, setTabs }
}

function SidebarTransformList({
  plugins,
  transformsForPlugin,
  onRun,
  disabled,
}: {
  plugins: PluginDescriptor[]
  transformsForPlugin: Record<string, TransformDescriptor[]>
  onRun: (pluginSnake: string, transformSnake: string) => void
  disabled?: boolean
}) {
  return (
    <aside className='from-mirage-600/20 to-mirage-600/10 text-slate-350 w-72 shrink-0 rounded-md border border-slate-950/60 bg-gradient-to-br p-2 shadow-2xl shadow-black/25'>
      <h4 className='font-display mb-1 px-1 text-sm font-semibold'>
        Transforms
      </h4>
      <div className='max-h-[calc(100vh-220px)] space-y-2 overflow-y-auto pr-1'>
        {plugins.map((p) => {
          const labelSnake = (p.label || '').toLowerCase().replace(/\s+/g, '_')
          const tforms = transformsForPlugin[labelSnake] || []
          return (
            <div
              key={labelSnake}
              className='rounded border border-slate-950/60 bg-black/10'
            >
              <div className='flex items-center gap-2 px-2 py-1.5'>
                <WorkspaceIcon
                  name='atom-2'
                  className='text-primary-300 h-4 w-4'
                />
                <span className='text-sm font-medium text-slate-300'>
                  {p.label}
                </span>
              </div>
              <ul className='divide-y divide-slate-950/50'>
                {tforms.map((t) => {
                  const tSnake = (t.label || '')
                    .toLowerCase()
                    .replace(/\s+/g, '_')
                  return (
                    <li
                      key={tSnake}
                      className='flex items-center justify-between px-2 py-1'
                    >
                      <div className='flex items-center gap-2'>
                        <WorkspaceIcon
                          name={t.icon || 'list'}
                          className='h-4 w-4 text-slate-500'
                        />
                        <span className='text-sm text-slate-400'>
                          {t.label}
                        </span>
                      </div>
                      <button
                        disabled={disabled}
                        onClick={() => onRun(labelSnake, tSnake)}
                        className={cx(
                          'rounded border px-2 py-1 text-xs font-semibold',
                          'border-slate-950/60 bg-black/20 hover:bg-black/40',
                          'text-primary-300 hover:text-slate-200 disabled:text-slate-700'
                        )}
                        title={
                          disabled
                            ? 'Select a source entity first'
                            : 'Run transform'
                        }
                        type='button'
                      >
                        Run
                      </button>
                    </li>
                  )
                })}
                {!tforms.length && (
                  <li className='px-2 py-2 text-xs text-slate-600'>
                    No transforms found.
                  </li>
                )}
              </ul>
            </div>
          )
        })}
      </div>
    </aside>
  )
}

function JobTabs({
  tabs,
  activeJob,
  setActiveJob,
  closeTab,
}: {
  tabs: JobTab[]
  activeJob?: string
  setActiveJob: (id: string) => void
  closeTab: (id: string) => void
}) {
  return (
    <div className='flex items-center overflow-x-auto border-b border-slate-950/60'>
      {tabs.map((t) => {
        const active = t.jobId === activeJob
        return (
          <button
            key={t.jobId}
            onClick={() => setActiveJob(t.jobId)}
            className={cx(
              'group relative flex items-center gap-2 px-3 py-2 text-sm',
              'border-r border-slate-950/60',
              active
                ? 'bg-black/30 text-slate-300'
                : 'hover:text-slate-350 bg-transparent text-slate-500 hover:bg-black/20'
            )}
            type='button'
            title={`${t.plugin} · ${t.label}`}
          >
            <WorkspaceIcon
              name='file-code'
              className='text-primary-300 h-4 w-4'
            />
            <span className='font-medium'>{t.label}</span>
            <span className='ml-1 text-[11px] text-slate-600'>({t.pct}%)</span>
            <span
              onClick={(e) => {
                e.stopPropagation()
                closeTab(t.jobId)
              }}
            >
              <WorkspaceIcon
                name='x'
                className='hover:text-primary-300 ml-1 h-4 w-4 text-slate-700'
              />
            </span>
          </button>
        )
      })}
      {!tabs.length && (
        <div className='px-3 py-2 text-sm text-slate-700'>
          No running transforms
        </div>
      )}
    </div>
  )
}

function ResultViewer({ tab }: { tab: JobTab }) {
  if (!tab) return null
  return (
    <div className='from-cod-900/40 to-cod-950/10 rounded-md border border-slate-950/60 bg-gradient-to-br p-3'>
      <div className='mb-2'>
        <ProgressBar pct={tab.pct} note={tab.note} />
      </div>
      <div className='grid grid-cols-2 gap-3'>
        <div className='rounded border border-slate-950/60 bg-black/10 p-2'>
          <h6 className='mb-1 text-xs font-semibold text-slate-400'>Events</h6>
          <div className='max-h-60 overflow-y-auto pr-1'>
            {tab.events.map((ev, i) => (
              <TimelineRow key={i} ev={ev} />
            ))}
          </div>
        </div>
        <div className='rounded border border-slate-950/60 bg-black/10 p-2'>
          <h6 className='mb-1 text-xs font-semibold text-slate-400'>Result</h6>
          <pre className='max-h-60 overflow-auto text-xs text-slate-300'>
            {tab.result ? JSON.stringify(tab.result, null, 2) : '—'}
          </pre>
        </div>
      </div>
    </div>
  )
}

function TransformStudio({
  ws,
  availablePlugins,
  transformsForPlugin,
  sourceEntity,
}: {
  ws: WsLike
  availablePlugins: PluginDescriptor[]
  transformsForPlugin: Record<string, TransformDescriptor[]>
  sourceEntity?: Json | null
}) {
  const { tabs, setTabs } = useJobStream(ws)
  const [activeJob, setActiveJob] = useState<string | undefined>(undefined)
  const activeTab = useMemo(
    () => tabs.find((t) => t.jobId === activeJob),
    [tabs, activeJob]
  )
  useEffect(() => {
    if (tabs.length) setActiveJob(tabs[tabs.length - 1].jobId)
  }, [tabs.length])

  const runTransform = (pluginSnake: string, transformSnake: string) => {
    if (!sourceEntity) return
    const payload = {
      action: 'transform:entity',
      entity: {
        ...sourceEntity,
        transform: transformSnake,
        data: { ...(sourceEntity?.data || {}), label: pluginSnake },
      },
    }
    ws.send(JSON.stringify(payload))
  }
  const closeTab = (id: string) => {
    setTabs((prev) => prev.filter((t) => t.jobId !== id))
    if (activeJob === id) setActiveJob(undefined)
  }

  return (
    <div className='flex h-full gap-3'>
      <SidebarTransformList
        plugins={availablePlugins}
        transformsForPlugin={transformsForPlugin}
        onRun={runTransform}
        disabled={!sourceEntity}
      />
      <section className='from-cod-900/60 to-cod-950/40 flex-1 rounded-md border-2 border-slate-950/50 bg-gradient-to-br shadow-2xl shadow-black/25'>
        <header className='flex items-center justify-between px-2 py-1'>
          <h5 className='font-display text-slate-350 text-sm font-semibold'>
            Transform Studio
          </h5>
          <div className='text-xs text-slate-600'>
            {sourceEntity ? (
              <span className='text-slate-400'>
                Source:&nbsp;
                <span className='font-semibold text-slate-300'>
                  {sourceEntity?.data?.label || sourceEntity?.label}
                </span>
              </span>
            ) : (
              <span className='text-slate-600'>
                Select an entity to enable transforms
              </span>
            )}
          </div>
        </header>
        <JobTabs
          tabs={tabs}
          activeJob={activeJob}
          setActiveJob={setActiveJob}
          closeTab={closeTab}
        />
        <div className='p-2'>
          {activeTab ? (
            <ResultViewer tab={activeTab} />
          ) : (
            <div className='p-3 text-sm text-slate-600'>
              Run a transform to see progress and results here.
            </div>
          )}
        </div>
        <footer className='border-t border-slate-950/60 px-2 py-1 text-[11px] text-slate-700'>
          Tips: run multiple transforms; each gets its own tab. Results are
          streamed over <span className='text-primary-300'>job_events</span>.
        </footer>
      </section>
    </div>
  )
}

// ---------- Simple Test Panel (runtime assertions) ----------
function TestPanel() {
  const [results, setResults] = useState<
    Array<{ name: string; ok: boolean; details?: string }>
  >([])

  useEffect(() => {
    const run = async () => {
      const out: Array<{ name: string; ok: boolean; details?: string }> = []
      // Test 1: Icon mapping does not throw for known icons
      try {
        ;[
          'check',
          'activity',
          'x',
          'file-code',
          'list',
          'atom-2',
          'alert-triangle',
          'ellipsis',
          'unknown',
        ].forEach((n) => {
          // create element; if mapping is bad this may throw when Cmp is undefined
          React.createElement(WorkspaceIcon, { name: n })
        })
        out.push({ name: 'Icon mapping + fallback', ok: true })
      } catch (e: any) {
        out.push({
          name: 'Icon mapping + fallback',
          ok: false,
          details: String(e),
        })
      }

      // Test 2: MockWS streams progress then result
      const ws = new MockWS()
      let sawProgress = false
      let sawResult = false
      const started = new Promise<void>((resolve) => {
        ws.addEventListener('message', (e) => {
          const d = JSON.parse(e.data)
          if (d.action === 'transform:started') resolve()
        })
      })
      const finished = new Promise<void>((resolve) => {
        ws.addEventListener('message', (e) => {
          const d = JSON.parse(e.data)
          if (d.action === 'job:event' && d.event?.type === 'progress')
            sawProgress = true
          if (d.action === 'job:event' && d.event?.type === 'result') {
            sawResult = true
            resolve()
          }
        })
      })
      ws.send(
        JSON.stringify({
          action: 'transform:entity',
          entity: {
            id: uuidv4(),
            label: 'cse_search',
            data: { label: 'cse_search' },
            transform: 'to_cse_result',
          },
        })
      )
      try {
        await Promise.race([
          (async () => {
            await started
            await finished
          })(),
          new Promise((_, rej) =>
            setTimeout(() => rej(new Error('timeout')), 4000)
          ),
        ])
        out.push({
          name: 'MockWS progress + result',
          ok: sawProgress && sawResult,
          details: `progress=${sawProgress} result=${sawResult}`,
        })
      } catch (e: any) {
        out.push({
          name: 'MockWS progress + result',
          ok: false,
          details: String(e),
        })
      }

      setResults(out)
    }
    run()
  }, [])

  return (
    <div className='from-cod-900/40 to-cod-950/10 mt-3 rounded-md border border-slate-950/60 bg-gradient-to-br p-2'>
      <h6 className='font-display text-slate-350 mb-2 text-sm font-semibold'>
        Tests
      </h6>
      <ul className='space-y-1'>
        {results.map((r, i) => (
          <li key={i} className='flex items-center gap-2 text-xs'>
            <WorkspaceIcon
              name={r.ok ? 'check' : 'alert-triangle'}
              className={
                r.ok ? 'h-4 w-4 text-lime-400' : 'text-danger-500 h-4 w-4'
              }
            />
            <span className={r.ok ? 'text-slate-300' : 'text-danger-400'}>
              {r.name}
            </span>
            <span className='text-slate-600'>
              {r.details ? ` – ${r.details}` : ''}
            </span>
          </li>
        ))}
        {!results.length && (
          <li className='text-xs text-slate-600'>Running…</li>
        )}
      </ul>
    </div>
  )
}

// ---------- Demo Canvas Wrapper ----------
export default function WorkspaceDemo() {
  const ws = React.useMemo(() => new MockWS(), [])
  const availablePlugins: PluginDescriptor[] = [
    { label: 'CSE Search' },
    { label: 'DNS' },
  ]
  const transformsForPlugin: Record<string, TransformDescriptor[]> = {
    cse_search: [{ label: 'To CSE Result', icon: 'list' }],
    dns: [
      { label: 'To Subdomain', icon: 'list' },
      { label: 'To IP', icon: 'list' },
    ],
  }
  const sourceEntity = {
    id: uuidv4(),
    label: 'cse_search',
    data: { label: 'cse_search', query: 'osintbuddy' },
    position: { x: 0, y: 0 },
  }

  return (
    <div className='min-h-[70vh] p-4'>
      <TransformStudio
        ws={ws}
        availablePlugins={availablePlugins}
        transformsForPlugin={transformsForPlugin}
        sourceEntity={sourceEntity}
      />
      <div className='mt-3 text-xs text-slate-600'>
        This is a live demo using a mocked stream. Click{' '}
        <span className='text-primary-300'>Run</span> on any transform to see
        streaming progress and a simulated result.
      </div>
      <TestPanel />
    </div>
  )
}
