import { useParams } from 'react-router-dom'
import { Icon } from '@/components/icons'
import { formatPGDate } from '@/app/utilities'
import { useEntityStore } from '@/app/store'
import EntityEditor from '@/components/editor/EntityEditor'
import { useEffect } from 'preact/hooks'

export default function EntityDetailsPage() {
  const { hid = '' } = useParams()

  const { entity, getEntity } = useEntityStore()
  useEffect(() => getEntity(hid), [hid])

  return (
    <div className='flex w-full flex-col items-center justify-center'>
      <div className='flex'>
        <section className='relative flex h-full flex-col px-2'>
          <div className='from-mirage-300/30 to-mirage-100/20 border-mirage-400 mx-auto grid max-w-6xl min-w-2xl place-items-start rounded-md border bg-gradient-to-tr from-40% px-12 py-6'>
            <h1 className='border-primary-400 flex w-full items-center border-b-2 pr-2 text-3xl font-bold text-slate-300/80 lg:text-4xl'>
              <Icon icon='ghost-3' className='mr-2.5 h-10 w-10' />
              <span className='w-full'>
                {entity?.label || 'Unknown Entity'}
              </span>
            </h1>
            <p className='max-w-xl pt-4 text-slate-300/80'>
              {entity?.description ||
                `No description was found for the ${entity?.label?.toLowerCase() || 'entity'}.`}
            </p>
            <div className='flex items-center justify-between'>
              <p className='max-w-xl pt-2 text-xs text-slate-300/80'>
                Created by{' '}
                <span className='font-bold'>{entity?.author || 'Unknown'}</span>
              </p>
            </div>
            <p className='max-w-xl pt-2 text-xs text-slate-300/80'>
              Created on{' '}
              <span className='font-bold'>
                {entity?.ctime ? formatPGDate(entity.ctime) : 'Unknown'}
              </span>
            </p>
            <p className='max-w-xl pt-2 text-xs text-slate-300/80'>
              Last edited on{' '}
              <span className='font-bold'>
                {entity?.mtime ? formatPGDate(entity.mtime) : 'Unknown'}
              </span>
            </p>
          </div>
          <div className='flex w-full items-center justify-center'>
            <EntityEditor entity={entity} />
          </div>
        </section>
      </div>
      <span className='px-2 pt-2 text-slate-500'>
        TODO: Create a visual entity builder for this page
      </span>
    </div>
  )
}
