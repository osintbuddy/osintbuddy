import { useGraphStore, useGraphsStore } from '@/app/store'
import { Icon } from '@/components/icons'
import { useEffect } from 'preact/hooks'
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

function GraphHeader({ graph }: GraphHeaderProps) {
  const navigate = useNavigate()
  const { deleteGraph, isDeleting } = useGraphsStore()

  const handleDeleteGraph = async () => {
    if (!graph?.id) return
    await deleteGraph({ id: graph.id })
    navigate('/dashboard/graph', { replace: true })
  }

  return (
    <div className='flex w-full flex-col'>
      <div className='from-cod-900/60 to-cod-950/40 flex h-min w-full flex-col overflow-hidden rounded-md border-2 border-slate-950/50 bg-gradient-to-br shadow-2xl shadow-black/25 backdrop-blur-sm'>
        <div className='text-slate-350 relative flex text-sm select-none'>
          <div className='relative flex w-full items-center'>
            <button
              title='Delete this case investigation'
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
              onClick={() => navigate(`/graph/${graph?.id}`, { replace: true })}
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
        <span class='ml-auto text-6xl font-bold'>{value ?? 0}</span>
      </h2>
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
        <GraphHeader graph={graph} />
        <div className='mt-3 flex h-full flex-col'>
          <div class='flex h-full w-full'>
            <div class='flex w-4/5 flex-col pr-3'>
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
              <div className='text-slate-350 from-cod-900/60 to-cod-950/40 group border-cod-900/20 mt-auto mr-auto flex h-full max-h-64 w-full flex-col overflow-hidden rounded-md border-2 bg-gradient-to-br shadow-2xl shadow-black/25 backdrop-blur-sm'>
                <h5 className='font-display flex w-full items-center justify-between px-2 py-1 text-lg font-medium text-inherit'>
                  Recent Case Activity
                </h5>
                <hr class='mb-1 border-1 text-slate-900 transition-all duration-200 group-hover:text-slate-800' />
                <div class='px-2 text-slate-600'>
                  TODO Build out timeline component for case events and comments
                  on the UI and with Rust
                </div>
              </div>
            </div>
            {/* far right dashboard panel */}
            <div className='text-slate-350 from-cod-900/60 to-cod-950/40 border-cod-900/20 mr-auto flex h-full max-w-1/5 min-w-1/5 flex-col overflow-hidden rounded-md border-2 bg-gradient-to-br shadow-2xl shadow-black/25 backdrop-blur-sm'>
              {/* details section: */}
              <section class='group py-2'>
                <h5 className='font-display flex w-full items-center justify-between px-2 text-lg font-medium text-inherit'>
                  {graph?.label}
                </h5>
                <hr class='text-primary-300 mb-1 border-1' />
                <p className='text-md line-clamp-10 max-w-xs px-2 leading-normal'>
                  {graph?.description ? (
                    graph.description
                  ) : (
                    <span class='text-slate-600'>
                      No description could be found for this case. TODO: Double
                      click to create or edit this description.
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
                    value={vertices_count}
                    label='Entities Count'
                  />
                  <SimpleStatCard value={edges_count} label='Edges Count' />
                  <SimpleStatCard value={degree2_count} label='Events Count' />
                </section>
              </section>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
