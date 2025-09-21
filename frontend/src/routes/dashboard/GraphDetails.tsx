import { Graph, CaseActivityItem, casesApi, CaseStats } from '@/app/api'
import { useAuthStore, useGraphStore, useGraphsStore } from '@/app/store'
import { Icon } from '@/components/icons'
import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'

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
    `${e.category.charAt(0).toUpperCase()}${e.category.slice(1)} ${
      e.event_type
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
    } catch {}
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
          class={`rounded px-2 py-0.5 text-xs transition-colors ${
            mineOnly
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
            ? events.filter(
                (e) =>
                  (e.actor_id && e.actor_id === myId) ||
                  (e.payload?.actor?.id && e.payload.actor.id === myId)
              )
            : events
          ).map((e) => {
            const key = `${e.category}:${e.event_type}`
            const icon = iconByEvent[key as keyof typeof iconByEvent] ?? 'dots'
            const ring =
              colorByCategory[e.category] ?? colorByCategory['default']
            const actorName =
              e.payload?.actor?.name ||
              (e.actor_id === 'osib' ? 'osib' : e.actor_id || '')
            const initials = (actorName || 'os')
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

function CaseOverviewPanel({ graph }: CaseOverviewProps) {
  const token = useAuthStore.getState().access_token as string
  const [stats, setStats] = useState<CaseStats | null>(null)
  const [loading, setLoading] = useState(false)

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
    <div className='text-slate-350 from-cod-900/60 to-cod-950/40 border-cod-900/20 mr-auto flex h-full max-w-2/9 min-w-2/9 flex-col overflow-hidden rounded-md border-2 bg-gradient-to-br shadow-2xl shadow-black/25 backdrop-blur-sm'>
      {/* details section: */}
      <section class='group'>
        <h5 className='font-display flex w-full items-center justify-between px-2 text-lg font-medium text-inherit'>
          {graph?.label}
        </h5>
        <hr class='text-primary-300 mb-1 border-1' />
        <p className='text-md line-clamp-24 max-w-xs px-2 leading-normal'>
          {graph?.description ? (
            graph.description
          ) : (
            <span class='text-slate-600'>
              No description could be found for this case. TODO: Double click to
              create or edit this description.
            </span>
          )}
        </p>
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

  return (
    <>
      <div class='flex w-full flex-col pl-3'>
        <CaseAppbarPanel graph={graph} />
        <div className='mt-3 flex h-full flex-col'>
          <div class='flex h-full w-full'>
            <div class='flex w-7/9 flex-col pr-3'>
              <div className='flex'>
                <h2 className='text-slate-600'>
                  TODO Add content to center area here... Plan to add some
                  graphs/diagrams for more case stats, maybe an activity
                  (alerts?) heatmap, chord diagrams, sankey diagrams, opinion
                  spectrum (if public?), need a reporting ui that can export to
                  pdf/markdown or something too, also maybe traffic stats for
                  (public?) cases could go here, maybe could have world map tab
                  if case has entities that are tied to locations too, etc. I'll
                  keep brainstorming for now...
                </h2>
              </div>
              <CaseActivityPanel graphId={hid} />
            </div>
            {/* far right dashboard panel */}
            <CaseOverviewPanel graph={graph as Graph} />
          </div>
        </div>
      </div>
    </>
  )
}
