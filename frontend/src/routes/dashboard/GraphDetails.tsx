import { useGraphStore, useGraphsStore } from '@/app/store'
import Button from '@/components/buttons'
import { Icon } from '@/components/icons'
import { useEffect } from 'preact/hooks'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'

interface GraphHeaderProps {
  graph: any
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
      <div className='from-cod-900/60 to-cod-950/40 flex h-min w-full flex-col overflow-hidden rounded-sm border-2 border-slate-950/50 bg-gradient-to-br py-2 shadow-2xl shadow-black/25 backdrop-blur-sm'>
        <ol className='text-slate-350 relative flex px-4 text-sm select-none'>
          <div className='flex w-full items-center justify-between space-x-4'>
            <div class='flex gap-x-4'>
              <Button.Solid
                variant='primary'
                onClick={() => navigate(`/graph/${graph?.id}`)}
              >
                View graph
                <Icon icon='chart-dots-3' className='btn-icon' />
              </Button.Solid>
              <Button.Solid
                variant='primary'
                onClick={() => navigate(`/graph/${graph?.id}`)}
                className=''
              >
                View table
                <Icon icon='table' className='btn-icon' />
              </Button.Solid>
            </div>
            <Button.Ghost
              onClick={handleDeleteGraph}
              className=''
              variant='danger'
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete case'}
              <Icon icon='trash' className='!text-danger-500 ml-2 h-5 w-5' />
            </Button.Ghost>
          </div>
        </ol>
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
    <div class='flex h-screen w-full flex-col'>
      <header class='flex w-full'>
        <GraphHeader graph={graph} />
      </header>
      <li className='text-slate-350 mr-auto flex w-full'>
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
