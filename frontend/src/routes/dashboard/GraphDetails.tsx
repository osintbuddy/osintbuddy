import { Graph, CaseActivityItem, casesApi, CaseStats, ChordNode, ChordLink } from '@/app/api'
import { useAuthStore, useGraphStore, useGraphsStore } from '@/app/store'
import { Icon } from '@/components/icons'
import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import ActivityGrid from '@/components/ActivityGrid'
import ChordDiagram from '@/components/charts/ChordDiagram'

interface GraphHeaderProps {
  graph: any
}

interface ActionButtonProps {
  onClick: () => void
  label: string
  disabled?: boolean
  icon: string
  title?: string
}

function ActionButton({
  onClick,
  label,
  disabled = false,
  icon,
  title,
}: ActionButtonProps) {
  return (
    <button
      title={title}
      onClick={onClick}
      class={`font-display group text-slate-350 before:bg-primary-300 relative flex h-full items-center bg-black/10 px-4 py-2 font-semibold transition-all duration-300 before:absolute before:bottom-0 before:left-1/2 before:flex before:h-0.5 before:w-0 before:-translate-1/2 before:items-center before:transition-all before:duration-200 before:content-[""] hover:bg-black/40 hover:text-slate-300 hover:before:w-full disabled:text-slate-600 disabled:before:content-none disabled:hover:bg-black/10`}
      disabled={disabled}
      type='button'
    >
      <Icon
        icon={icon}
        className='group-hover:text-primary-300 text-primary-300 group-hover:animate-wiggle mr-2 h-5 w-5 group-disabled:text-slate-600'
      />
      {label}
    </button>
  )
}

function CaseAppbarPanel({ graph }: GraphHeaderProps) {
  const navigate = useNavigate()
  const { deleteGraph, isDeleting } = useGraphsStore()

  const handleDeleteGraph = async () => {
    // TODO: open 'confirm delete?' dialog before deletion
    if (!graph?.id) return
    await deleteGraph({ id: graph.id })
    navigate('/dashboard/case', { replace: true })
  }

  return (
    <div className='flex w-full flex-col'>
      <div className='from-cod-900/60 to-cod-950/40 flex h-min w-full flex-col overflow-hidden rounded-md border-2 border-slate-950/50 bg-gradient-to-br shadow-2xl shadow-black/25 backdrop-blur-sm'>
        <div className='text-slate-350 relative flex text-sm select-none'>
          <div className='relative flex w-full items-center'>
            <button
              title='Click to mark this case deleted this case.'
              class='font-display text-danger-500 hover:text-danger-600 group mr-auto flex h-full items-center bg-black/10 px-4 py-2 font-semibold hover:bg-black/40'
            >
              <Icon
                icon='trash'
                className='text-danger-500 group-hover:text-danger-600 group-hover:animate-wiggle-8 mr-2 h-5 w-5'
              />
              {isDeleting ? 'Deleting...' : 'Delete case'}
            </button>
            <ActionButton
              title="This feature isn't ready for use yet! Give us time to build it out"
              onClick={() =>
                toast.warn("This functionality isn't ready for use yet.")
              }
              label='Alerts'
              disabled={true}
              icon='alert-hexagon'
            />
            <ActionButton
              title="This feature isn't ready for use yet! Give us time to build it out"
              onClick={() =>
                toast.warn("This functionality isn't ready for use yet.")
              }
              label='Feeds'
              disabled={true}
              icon='rss'
            />
            <ActionButton
              title="This feature isn't ready for use yet! Give us time to build it out"
              onClick={() =>
                toast.warn("This functionality isn't ready for use yet.")
              }
              label='Attachments'
              disabled={true}
              icon='file'
            />
            <ActionButton
              title="This feature isn't ready for use yet! Give us time to build it out"
              onClick={() =>
                toast.warn("This functionality isn't ready for use yet.")
              }
              label='Graph view'
              disabled={true}
              icon='chart-dots-3'
            />

            <ActionButton
              title='View and edit the flow graph'
              onClick={() => navigate(`/flow/${graph?.id}`, { replace: true })}
              label='Flow view'
              icon='chart-dots-3'
            />
            <ActionButton
              title="This feature isn't ready for use yet! Give us time to build it out"
              onClick={() =>
                toast.warn("This functionality isn't ready for use yet.")
              }
              label='Table view'
              disabled={true}
              icon='table'
            />
          </div>
        </div>
      </div>
    </div>
  )
}

interface SimpleStatCardProps {
  value?: number | null
  label: string
}

function SimpleStatCard({ value, label }: SimpleStatCardProps) {
  return (
    <div class='from-cod-900/60 to-cod-950/10 hover:to-cod-950/15 relative w-full rounded-xs border-b border-slate-900 bg-gradient-to-tr px-3 py-2.5 text-slate-400 shadow-sm transition-all duration-100 hover:text-slate-300'>
      <h2 class='text-md flex items-end font-sans'>
        {label}
        <span class='ml-auto text-4xl font-bold'>{value ?? 0}</span>
      </h2>
    </div>
  )
}

function CaseActivityPanel({ graphId }: { graphId: string }) {
  const [events, setEvents] = useState<CaseActivityItem[]>([])
  const [skip, setSkip] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [mineOnly, setMineOnly] = useState(false)
  const limit = 10
  const token = useAuthStore.getState().access_token as string
  const me = useAuthStore.getState().user as any
  const myId = (me?.sub ?? '').toString()

  const colorByCategory: Record<string, string> = useMemo(
    () => ({
      entity: 'from-emerald-400/70 to-emerald-200/70',
      edge: 'from-amber-300/70 to-amber-200/70',
      default: 'from-primary-350/70 to-primary-200/70',
    }),
    []
  )

  const iconByEvent = useMemo(
    () => ({
      'entity:create': 'plus',
      'entity:update': 'pencil',
      'entity:delete': 'trash',
      'edge:create': 'link',
      'edge:update': 'link',
      'edge:delete': 'link-off',
    }),
    []
  )

  const titleByEvent = (e: CaseActivityItem) =>
    `${e.category.charAt(0).toUpperCase()}${e.category.slice(1)} ${e.event_type
    }`

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      month: 'short',
      day: '2-digit',
    })

  const describe = (e: CaseActivityItem) => {
    try {
      if (e.category === 'entity') {
        const label = e.payload?.data?.label
        return label ? `Entity: ${label}` : `Entity ${e.event_type}`
      }
      if (e.category === 'edge') {
        const src = e.payload?.source
        const dst = e.payload?.target
        return src && dst ? `Link ${src} → ${dst}` : `Edge ${e.event_type}`
      }
    } catch { }
    return `${e.category}:${e.event_type}`
  }
  const loadMore = async () => {
    if (loading || !hasMore) return
    setLoading(true)
    try {
      const page = await casesApi.activity(graphId, { skip, limit }, token)
      const newEvents = page.events ?? []
      setEvents((prev) => [...prev, ...newEvents])
      setSkip(skip + newEvents.length)
      if (newEvents.length < limit) setHasMore(false)
    } catch (e) {
      setHasMore(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // reset on graph change
    setEvents([])
    setSkip(0)
    setHasMore(true)
    setLoading(false)
    loadMore()
  }, [graphId])

  const listRef = useRef<HTMLOListElement>(null)
  const onScroll = (e: Event) => {
    const el = e.currentTarget as HTMLOListElement
    if (!el) return
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 16
    if (nearBottom) loadMore()
  }

  return (
    <div className='text-slate-350 from-cod-900/60 to-cod-950/40 group border-cod-900/20 mt-auto mr-auto flex h-full max-h-55 w-full flex-col overflow-hidden rounded-md border-2 bg-gradient-to-br shadow-2xl shadow-black/25 backdrop-blur-sm'>
      <h5 className='font-display flex w-full items-center justify-between px-2 text-lg font-medium text-inherit'>
        Recent Case Activity
        <button
          type='button'
          onClick={() => setMineOnly(!mineOnly)}
          class={`rounded px-2 py-0.5 text-xs transition-colors ${mineOnly
              ? 'bg-primary-500/20 text-primary-200'
              : 'bg-black/10 text-slate-500 hover:bg-black/30 hover:text-slate-300'
            }`}
          title='Show only my activity'
        >
          Mine only
        </button>
      </h5>
      <hr class='mb-1 border-1 text-slate-900 transition-all duration-200 group-hover:text-slate-800' />
      <div class='flex h-full min-h-[14rem] w-full flex-col'>
        <ol
          ref={listRef}
          onScroll={onScroll as any}
          class='relative h-full overflow-y-auto border-l border-slate-900 px-2 pb-3'
        >
          {(mineOnly
            ? events.filter((e) => {
              const actorMatch =
                e.actor_id != null && String(e.actor_id) === myId
              const payloadMatch =
                e.payload?.actor?.id &&
                String(e.payload.actor.id) === myId
              return actorMatch || payloadMatch
            })
            : events
          ).map((e) => {
            const key = `${e.category}:${e.event_type}`
            const icon = iconByEvent[key as keyof typeof iconByEvent] ?? 'dots'
            const ring =
              colorByCategory[e.category] ?? colorByCategory['default']
            const actorRaw =
              e.payload?.actor?.name ??
              e.actor_name ??
              (e.actor_id != null ? String(e.actor_id) : 'osib')
            const actorName =
              typeof actorRaw === 'string'
                ? actorRaw
                : actorRaw != null
                ? String(actorRaw)
                : ''
            const initials = (actorName || 'os')
              .toString()
              .split(/\s+/)
              .map((w: string) => w.slice(0, 1))
              .join('')
              .slice(0, 2)
              .toUpperCase()
            return (
              <li key={e.seq} class='ml-10 py-2'>
                <span
                  class={`ring-mirage-800/30 ${ring} absolute left-2 flex h-8 w-8 items-center justify-center rounded-full bg-radial-[at_10%_65%] from-65% ring-6`}
                >
                  {actorName ? (
                    <span class='text-[10px] font-bold text-black/80 uppercase'>
                      {initials}
                    </span>
                  ) : (
                    <Icon icon={icon} className='h-4 w-4' />
                  )}
                </span>
                <div class='flex items-center gap-2'>
                  <h3 class='text-base font-semibold text-slate-300'>
                    {titleByEvent(e)}
                  </h3>
                  <time class='ml-auto text-xs font-normal text-slate-500'>
                    {formatTime(e.recorded_at)}
                  </time>
                </div>
                <p class='mb-0.5 text-sm text-slate-500'>{describe(e)}</p>
                <div class='text-xs text-slate-600'>
                  by{' '}
                  <span class='text-slate-400'>{actorName || 'unknown'}</span>
                </div>
              </li>
            )
          })}
          {loading && (
            <li class='ml-10 py-2 text-xs text-slate-600'>Loading…</li>
          )}
          {!loading && !hasMore && events.length === 0 && (
            <li class='ml-10 py-2 text-xs text-slate-600'>No activity yet.</li>
          )}
        </ol>
      </div>
    </div>
  )
}

interface CaseOverviewProps {
  graph: Graph
}

function CaseContextPanel({ graph }: CaseOverviewProps) {
  const token = useAuthStore.getState().access_token as string
  const [stats, setStats] = useState<CaseStats | null>(null)
  const [loading, setLoading] = useState(false)
  const { updateGraph, isUpdating } = useGraphsStore()
  const { getGraph } = useGraphStore()

  // Inline edit state
  const [editing, setEditing] = useState<null | 'label' | 'description'>(null)
  const [labelVal, setLabelVal] = useState<string>('')
  const [descVal, setDescVal] = useState<string>('')
  const [saving, setSaving] = useState<boolean>(false)
  const labelRef = useRef<HTMLTextAreaElement>(null)
  const descRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    // Reset edit values on graph change
    setEditing(null)
    setLabelVal('')
    setDescVal('')
  }, [graph?.id])

  const autosize = (el: HTMLTextAreaElement | null) => {
    if (!el) return
    el.style.height = '0px'
    el.style.height = Math.min(Math.max(el.scrollHeight, 24), 300) + 'px'
  }

  const beginEdit = (field: 'label' | 'description') => {
    if (!graph) return
    setEditing(field)
    if (field === 'label') {
      const v = graph.label ?? ''
      setLabelVal(v)
      setTimeout(() => {
        if (labelRef.current) {
          autosize(labelRef.current)
          labelRef.current.focus()
          labelRef.current.select()
        }
      }, 0)
    } else {
      const v = graph.description ?? ''
      setDescVal(v)
      setTimeout(() => {
        if (descRef.current) {
          autosize(descRef.current)
          descRef.current.focus()
        }
      }, 0)
    }
  }

  const cancelEdit = () => {
    setEditing(null)
    setLabelVal('')
    setDescVal('')
  }

  const commitEdit = async () => {
    if (!graph || saving) return
    const newLabel = editing === 'label' ? labelVal.trim() : graph.label
    const newDesc = editing === 'description' ? descVal.trim() : (graph.description ?? '')
    const changed = newLabel !== graph.label || newDesc !== (graph.description ?? '')
    if (!changed) {
      cancelEdit()
      return
    }
    try {
      setSaving(true)
      await updateGraph({ id: graph.id, label: newLabel, description: newDesc })
      // Refresh details view store
      await getGraph(graph.id)
      toast.success('Case details updated')
    } catch (e) {
      toast.error('Failed to update case')
    } finally {
      setSaving(false)
      cancelEdit()
    }
  }

  useEffect(() => {
    if (!graph?.id) return
    let cancelled = false
    setLoading(true)
    casesApi
      .stats(graph.id, token)
      .then((s) => !cancelled && setStats(s))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [graph?.id])

  const entities = stats?.entities_count ?? 0
  const edges = stats?.edges_count ?? 0
  const events = stats?.events_count ?? 0

  return (
    <div className='text-slate-350 from-cod-900/60 to-cod-950/40 border-cod-900/20 mr-auto flex h-full max-w-2/8 min-w-2/8 flex-col overflow-hidden rounded-md border-2 bg-gradient-to-br shadow-2xl shadow-black/25 backdrop-blur-sm'>
      {/* details section: */}
      <section class='group'>
        <h5 className='font-display flex w-full items-center justify-between px-2 text-lg font-medium text-inherit'>
          {editing === 'label' ? (
            <textarea
              ref={labelRef}
              value={labelVal}
              onInput={(e: any) => {
                setLabelVal(e.currentTarget.value)
                autosize(labelRef.current)
              }}
              onKeyDown={(e: any) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  ;(e.currentTarget as HTMLTextAreaElement).blur()
                } else if (e.key === 'Escape') {
                  e.preventDefault()
                  cancelEdit()
                }
              }}
              onBlur={commitEdit}
              rows={1}
              disabled={saving || isUpdating}
              className='bg-transparent w-full border-none outline-none resize-none text-inherit p-0 m-0 focus:ring-0 focus:outline-none'
              placeholder='Enter case title'
            />
          ) : (
            <span
              className='w-full cursor-text'
              onDblClick={() => beginEdit('label')}
              title='Double-click to edit title'
            >
              {graph?.label}
            </span>
          )}
        </h5>
        <hr class='text-primary-300 mb-1 border-1' />
        <div className='text-md max-w-xs px-2 leading-normal'>
          {editing === 'description' ? (
            <textarea
              ref={descRef}
              value={descVal}
              onInput={(e: any) => {
                setDescVal(e.currentTarget.value)
                autosize(descRef.current)
              }}
              onKeyDown={(e: any) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  e.preventDefault()
                  ;(e.currentTarget as HTMLTextAreaElement).blur()
                } else if (e.key === 'Escape') {
                  e.preventDefault()
                  cancelEdit()
                }
              }}
              onBlur={commitEdit}
              rows={3}
              disabled={saving || isUpdating}
              className='bg-transparent w-full border-none outline-none resize-none text-inherit p-0 m-0 focus:ring-0 focus:outline-none'
              placeholder='Add a description for this case'
            />
          ) : graph?.description ? (
            <p
              className='text-md whitespace-pre-wrap cursor-text'
              onDblClick={() => beginEdit('description')}
              title='Double-click to edit description'
            >
              {graph.description}
            </p>
          ) : (
            <p
              className='text-md text-slate-600 cursor-text'
              onDblClick={() => beginEdit('description')}
              title='Double-click to add description'
            >
              No description yet. Double-click to add one.
            </p>
          )}
        </div>
      </section>
      {/* stats section: */}
      <section class='relative z-10 mt-auto flex flex-col'>
        <section class='group'>
          <h5 className='font-display flex w-full items-center justify-between px-2 text-lg font-medium text-inherit'>
            Case Statistics
          </h5>
          <hr class='mb-1 border-1 text-slate-900 transition-all duration-200 group-hover:text-slate-800' />
          <SimpleStatCard
            value={loading ? null : entities}
            label='Entities Count'
          />
          <SimpleStatCard value={loading ? null : edges} label='Edges Count' />
          <SimpleStatCard
            value={loading ? null : events}
            label='Events Count'
          />
        </section>
      </section>
    </div>
  )
}

export default function GraphDetails() {
  const { hid = '' } = useParams()
  const { getGraph, graph, vertices_count, edges_count, degree2_count } =
    useGraphStore()
  useEffect(() => getGraph(hid), [hid])
  const token = useAuthStore.getState().access_token as string
  const [activityData, setActivityData] = useState<Record<string, number>>({})
  useEffect(() => {
    let cancelled = false
    setActivityData({})
    if (!hid) return
    // Build a full-year (53 weeks) date map initialized to 0 so the UI always
    // renders a complete year regardless of returned buckets.
    const buildFullYearMap = (): Record<string, number> => {
      const map: Record<string, number> = {}
      const sizeWeeks = 53
      const end = new Date()
      const daysToSunday = end.getDay()
      const endShift = 6 - daysToSunday
      end.setDate(end.getDate() + endShift)
      const totalDays = sizeWeeks * 7
      for (let i = totalDays - 1; i >= 0; i--) {
        const d = new Date(end)
        d.setDate(end.getDate() - i)
        const year = d.getFullYear()
        const month = `${d.getMonth() + 1}`.padStart(2, '0')
        const day = `${d.getDate()}`.padStart(2, '0')
        const key = `${year}-${month}-${day}`
        map[key] = 0
      }
      return map
    }

    casesApi
      .activitySummary(hid, 365, token)
      .then((res) => {
        if (cancelled) return
        const map = buildFullYearMap()
        for (const b of res.buckets ?? []) {
          map[b.date] = b.count ?? 0
        }
        setActivityData(map)
      })
      .catch(() => !cancelled && setActivityData({}))
    return () => {
      cancelled = true
    }
  }, [hid, token])

  // chord data from API
  const [chordNodes, setChordNodes] = useState<ChordNode[]>([])
  const [chordLinks, setChordLinks] = useState<ChordLink[]>([])
  useEffect(() => {
    let cancelled = false
    setChordNodes([])
    setChordLinks([])
    if (!hid || !token) return
    casesApi
      .chord(hid, token)
      .then((res) => {
        if (cancelled) return
        setChordNodes(res.nodes || [])
        setChordLinks(res.links || [])
      })
      .catch(() => {
        if (!cancelled) {
          setChordNodes([])
          setChordLinks([])
        }
      })
    return () => {
      cancelled = true
    }
  }, [hid, token])

  // zoom & pan for chord diagram (panel stays fixed)
  const [chordZoom, setChordZoom] = useState(1)
  const [chordPan, setChordPan] = useState({ x: 0, y: 0 })
  const zoomIn = () => setChordZoom((z) => Math.min(2, Number((z + 0.1).toFixed(2))))
  const zoomOut = () => setChordZoom((z) => Math.max(0.5, Number((z - 0.1).toFixed(2))))
  const resetView = () => {
    setChordZoom(1)
    setChordPan({ x: 0, y: 0 })
  }

  return (
    <>
      <div class='flex w-full flex-col pl-3'>
        <CaseAppbarPanel graph={graph} />
        <div className='mt-3 flex h-full flex-col w-full overflow-y-scroll'>
          <div class='flex h-full w-full justify-between'>
            <div class='flex flex-col w-full gap-y-3 pr-3 max-w-6/8 min-w-6/8'>
              <ActivityGrid data={activityData} />
              <div className='text-slate-350 from-cod-900/60 to-cod-950/40 py-0 flex min-h-0 flex-col overflow-hidden rounded-md bg-gradient-to-br shadow-2xl shadow-black/25 backdrop-blur-sm'>

                <div className='relative flex py-3 flex-col items-center justify-center' style={{ width: '100%', height: '100%' }}>
                  {/* TODO: Add dropdown+tag based queries+filters for multiple diagrams */}
                  <div className=' inline-flex items-center rounded-sm border border-slate-700/60 bg-slate-900/60 px-2 py-1 font-mono text-[10px] tracking-[0.25em] text-slate-300/80 uppercase'>
                    entity types // relationships
                  </div>
                  <div className='absolute right-2 top-2 z-10 flex gap-1'>
                    <button
                      type='button'
                      onClick={zoomOut}
                      className='rounded bg-black/40 px-2 py-1 text-slate-300 hover:bg-black/60'
                      title='Zoom out'
                    >
                      −
                    </button>
                    <button
                      type='button'
                      onClick={zoomIn}
                      className='rounded bg-black/40 px-2 py-1 text-slate-300 hover:bg-black/60'
                      title='Zoom in'
                    >
                      +
                    </button>
                    <button
                      type='button'
                      onClick={resetView}
                      className='rounded bg-black/40 px-2 py-1 text-slate-300 hover:bg-black/60'
                      title='Reset view'
                    >
                      ○
                    </button>
                  </div>
                  {/* TODO: clean me up, info box pan instructions */}
                  <div className='absolute flex items-center left-2 bottom-2 z-10 rounded bg-black/40 group p-1 justify-center text-xs text-slate-300 transition-all'>
                    <Icon icon='help' className="btn-icon  !mx-1.5 px-0 text-slate-400 group-hover:text-slate-350" />
                    <span className="  w-px text-nowrap h-4 text-transparent group-hover:text-slate-350 group-hover:w-30 transition-all duration-150">Click and drag to pan</span>
                  </div>
                  <ChordDiagram
                    width={450}
                    height={300}
                    nodes={chordNodes as any}
                    links={chordLinks as any}
                    scale={chordZoom}
                    panX={chordPan.x}
                    panY={chordPan.y}
                  />
                </div>
              </div>
              <CaseActivityPanel graphId={hid} />
            </div>
            {/* far right case context panel */}
            <CaseContextPanel graph={graph as Graph} />
          </div>
        </div>
      </div>
    </>
  )
}
