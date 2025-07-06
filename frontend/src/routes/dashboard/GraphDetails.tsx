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
    console.log(graph)
    if (!graph?.id) return
    await deleteGraph({ id: graph.id.toString() })
    navigate('/dashboard/graph', { replace: true })
  }

  return (
    <div className='flex w-full flex-col px-4'>
      <div className='bg-mirage-800/50 border-mirage-800/40 relative flex w-full rounded-b-md border-2 shadow'>
        <div className='mx-auto w-full'>
          <section className='relative flex flex-col items-start justify-between px-6 py-4 md:flex-row md:items-center lg:flex-row lg:items-center'>
            <div className='flex w-full flex-col'>
              <h3 className='text-lg leading-normal font-semibold whitespace-nowrap text-slate-300'>
                {graph?.label}
              </h3>
              <p className='max-w-6xl truncate text-sm leading-normal whitespace-normal text-slate-400'>
                {graph?.description}
              </p>
            </div>
            <div className='relative mt-auto flex w-full items-center gap-x-4'>
              <Button.Ghost
                onClick={handleDeleteGraph}
                className='ml-auto'
                variant='danger'
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete graph'}
                <Icon icon='trash' className='!text-danger-500 ml-2 h-5 w-5' />
              </Button.Ghost>
              <Button.Ghost
                variant='primary'
                onClick={() =>
                  navigate(`/graph/${graph?.id}`, { replace: true })
                }
              >
                Open graph
                <Icon icon='eye' className='btn-icon' />
              </Button.Ghost>
            </div>
          </section>
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
    <div class='flex h-screen w-full flex-col'>
      <header class='flex w-full'>
        <GraphHeader graph={graph} />
      </header>
      <section class='relative z-10 flex w-full p-4'>
        <div class='bg-mirage-300/40 border-mirage-800/50 relative mr-4 w-full rounded-md border-2 px-6 py-3 shadow-sm'>
          <h2 class='flex items-end text-slate-300/80'>
            Total Entities{' '}
            <span class='ml-auto font-sans text-6xl font-semibold'>
              {vertices_count ?? 0}
            </span>
          </h2>
        </div>
        <div class='bg-mirage-300/40 border-mirage-800/50 relative mx-2 w-full rounded-md border-2 px-6 py-3 shadow-sm'>
          <h2 class='flex items-end text-slate-300/80'>
            Total Relationships
            <span class='ml-auto font-sans text-6xl font-semibold'>
              {edges_count ?? 0}
            </span>
          </h2>
        </div>
        <div class='bg-mirage-300/40 border-mirage-800/50 relative ml-4 w-full rounded-md border-2 px-6 py-3 shadow-sm'>
          <h2 class='flex items-end text-slate-300/80'>
            2nd Degree Entities
            <span class='ml-auto font-sans text-6xl font-semibold'>
              {degree2_count ?? 0}
            </span>
          </h2>
        </div>
      </section>
      <h2 class='px-4 text-slate-600'>
        TODO: Add notes here{' '}
        <a
          class='text-radiance-900'
          href='https://medevel.com/notion-style-editors-21991/'
        >
          (editors)
        </a>
      </h2>
    </div>
  )
}
