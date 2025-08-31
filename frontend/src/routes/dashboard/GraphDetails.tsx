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
export default function GraphDetails() {
  const { hid = '' } = useParams()
  const { getGraph, graph, vertices_count, edges_count, degree2_count } =
    useGraphStore()

  useEffect(() => getGraph(hid), [hid])

  return (
    <>
      <div class='flex w-full flex-col pl-4'>
        <GraphHeader graph={graph} />
        <div className='mt-3 flex h-full flex-col'>
          <div class='flex h-full w-full'>
            <div class='flex w-5/6 flex-col pr-4'>
              <div className='flex'>
                <h2 className='text-slate-600'>
                  Main content in center here. Plan to add some graphs/diagrams
                  here for case stats, maybe could have world map tab if case
                  has entities that are tied to locations, etc. I'll keep
                  brainstorming this part
                </h2>
              </div>
              <div className='bg-teal text-slate-350 from-cod-900/60 to-cod-950/40 group mt-auto mr-auto flex h-full max-h-64 w-full flex-col overflow-hidden rounded-md border-2 border-slate-950/50 bg-gradient-to-br shadow-2xl shadow-black/25 backdrop-blur-sm'>
                <h5 className='font-display flex w-full items-center justify-between px-2 py-1 text-lg font-semibold text-inherit'>
                  Recent Case Activity
                </h5>
                <hr class='group-hover:text-primary-400 mb-1 border-1 text-slate-900 transition-all duration-200' />
                <div class='text-slate-600'>
                  TODO Build out timeline component for case events and comments
                  on the UI and with Rust
                </div>
              </div>
            </div>
            <div className='text-slate-350 from-cod-900/60 to-cod-950/40 mr-auto flex h-full max-w-1/5 min-w-1/5 flex-col overflow-hidden rounded-md border-2 border-slate-950/50 bg-gradient-to-br shadow-2xl shadow-black/25 backdrop-blur-sm'>
              <section class='group py-2'>
                <h5 className='font-display flex w-full items-center justify-between px-2 text-lg font-semibold text-inherit'>
                  {graph?.label}
                </h5>
                <hr class='group-hover:text-primary-400 mb-1 border-1 text-slate-900 transition-all duration-200' />
                <p className='text-md line-clamp-10 max-w-xs px-2 leading-normal'>
                  {graph?.description}
                </p>
              </section>
              <section class='relative z-10 mt-auto flex w-full flex-col gap-y-3'>
                <section class='group'>
                  <h5 className='font-display flex w-full items-center justify-between px-2 text-lg font-semibold text-inherit'>
                    Case Statistics
                  </h5>
                  <hr class='group-hover:text-primary-400 mb-1 border-1 text-slate-900 transition-all duration-200' />
                  <div class='from-cod-900/60 to-cod-950/40 relative w-full rounded-sm border-b border-slate-900 bg-gradient-to-tr px-6 py-3 shadow-sm'>
                    <h2 class='text-slate-350 flex items-end'>
                      Total Entities{' '}
                      <span class='ml-auto font-sans text-6xl font-semibold'>
                        {vertices_count ?? 0}
                      </span>
                    </h2>
                  </div>
                  <div class='from-cod-900/60 to-cod-950/40 relative w-full rounded-sm border-b border-slate-900 bg-gradient-to-tr px-6 py-3 shadow-sm'>
                    <h2 class='text-slate-350 flex items-end'>
                      Total Relationships
                      <span class='ml-auto font-sans text-6xl font-semibold'>
                        {edges_count ?? 0}
                      </span>
                    </h2>
                  </div>
                  <div class='from-cod-900/60 to-cod-950/40 relative w-full rounded-sm border-b border-slate-900 bg-gradient-to-tr px-6 py-3 shadow-sm'>
                    <h2 class='text-slate-350 flex items-end'>
                      2nd Degree Entities
                      <span class='ml-auto font-sans text-6xl font-semibold'>
                        {degree2_count ?? 0}
                      </span>
                    </h2>
                  </div>
                </section>
              </section>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
