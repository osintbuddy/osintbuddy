import { useGraphStore, useGraphsStore } from '@/app/store'
import Button from '@/components/buttons'
import { Icon } from '@/components/icons'
import { useEffect } from 'preact/hooks'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'

interface GraphHeaderProps {
  graph: any
}

interface ActionButtonProps {
  action: () => void
  label: string
  disabled?: boolean
  icon: string
  title?: string
}

function ActionButton({
  action,
  label,
  disabled = false,
  icon,
  title,
}: ActionButtonProps) {
  return (
    <button
      title={title}
      onClick={action}
      class={`font-display group text-slate-350 before:bg-primary-300 relative flex h-full items-center bg-black/10 px-4 py-2 font-semibold transition-all duration-300 before:absolute before:bottom-0 before:left-1/2 before:flex before:h-0.5 before:w-0 before:-translate-1/2 before:items-center before:transition-all before:duration-200 before:content-[""] hover:bg-black/40 hover:text-slate-300 hover:before:w-full disabled:text-slate-600 disabled:before:content-none disabled:hover:bg-black/10`}
      disabled={disabled}
    >
      <Icon
        icon={icon}
        className='group-hover:text-primary-300 text-primary-300 group-hover:animate-wiggle mr-2 h-5 w-5 group-disabled:text-slate-600'
      />
      <span className={``}>{label}</span>
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
    <div className='flex w-full flex-col px-4'>
      <div className='from-cod-900/60 to-cod-950/40 flex h-min w-full flex-col overflow-hidden rounded-md border-2 border-slate-950/50 bg-gradient-to-br shadow-2xl shadow-black/25 backdrop-blur-sm'>
        <div className='text-slate-350 relative flex text-sm select-none'>
          <div className='relative flex w-full items-center'>
            <button
              title='Delete this case investigation'
              class='font-display text-danger-500 hover:text-danger-600 group mr-auto flex h-full items-center bg-black/20 px-4 py-2 font-semibold hover:bg-black/60'
            >
              <Icon
                icon='trash'
                className='text-danger-500 group-hover:text-danger-600 group-hover:animate-wiggle-8 mr-2 h-5 w-5'
              />
              {isDeleting ? 'Deleting...' : 'Delete case'}
            </button>
            <ActionButton
              title="This feature isn't ready for use yet! Give us time to build it out"
              action={() =>
                toast.warn("This functionality isn't ready for use yet.")
              }
              label='Alerts'
              disabled={true}
              icon='alert-hexagon'
            />
            <ActionButton
              title="This feature isn't ready for use yet! Give us time to build it out"
              action={() =>
                toast.warn("This functionality isn't ready for use yet.")
              }
              label='Feeds'
              disabled={true}
              icon='rss'
            />
            <ActionButton
              title="This feature isn't ready for use yet! Give us time to build it out"
              action={() =>
                toast.warn("This functionality isn't ready for use yet.")
              }
              label='Attachments'
              disabled={true}
              icon='file'
            />
            <ActionButton
              title="This feature isn't ready for use yet! Give us time to build it out"
              action={() =>
                toast.warn("This functionality isn't ready for use yet.")
              }
              label='Graph view'
              disabled={true}
              icon='chart-dots-3'
            />

            <ActionButton
              title='View and edit the flow graph'
              action={() => () => navigate(`/graph/${graph?.id}`)}
              label='Flow view'
              icon='chart-dots-3'
            />
            <ActionButton
              title="This feature isn't ready for use yet! Give us time to build it out"
              action={() =>
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
    <div class='flex h-full w-full flex-col'>
      <header class='flex w-full'>
        <GraphHeader graph={graph} />
      </header>
      <li className='text-slate-350 mr-auto flex w-full pt-4 pl-4'>
        <section class='w-11/12'>
          <h5 className='font-display flex w-full items-center justify-between truncate font-medium whitespace-nowrap text-inherit'>
            {graph?.label}
          </h5>
          <p
            title={graph?.description}
            className='whitespace-norma line-clamp-1 max-w-6xl truncate text-sm leading-normal'
          >
            {graph?.description}
          </p>
        </section>
        <section class='relative z-10 flex w-full flex-col gap-y-4 px-4'>
          <div class='from-cod-900/60 to-cod-950/40 relative w-full rounded-sm border-2 border-slate-950/50 bg-gradient-to-tr px-6 py-3 shadow-sm'>
            <h2 class='text-slate-350 flex items-end'>
              Total Entities{' '}
              <span class='ml-auto font-sans text-6xl font-semibold'>
                {vertices_count ?? 0}
              </span>
            </h2>
          </div>
          <div class='from-cod-900/60 to-cod-950/40 relative w-full rounded-sm border-2 border-slate-950/50 bg-gradient-to-tr px-6 py-3 shadow-sm'>
            <h2 class='text-slate-350 flex items-end'>
              Total Relationships
              <span class='ml-auto font-sans text-6xl font-semibold'>
                {edges_count ?? 0}
              </span>
            </h2>
          </div>
          <div class='from-cod-900/60 to-cod-950/40 relative w-full rounded-sm border-2 border-slate-950/50 bg-gradient-to-tr px-6 py-3 shadow-sm'>
            <h2 class='text-slate-350 flex items-end'>
              2nd Degree Entities
              <span class='ml-auto font-sans text-6xl font-semibold'>
                {degree2_count ?? 0}
              </span>
            </h2>
          </div>
        </section>
      </li>

      <h2 class='px-4 text-slate-600'>
        TODO: Add something here{' '}
        <a
          class='text-radiance-900'
          href='https://medevel.com/notion-style-editors-21991/'
        >
          (maybe editors?
        </a>{' '}
        or table view of entities, or ???)
      </h2>
    </div>
  )
}
