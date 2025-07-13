import { JSX } from 'preact/jsx-runtime'
import { Icon } from '../icons'
import Button from '../buttons'

export function Timelines({
  children,
}: {
  children: JSX.Element | JSX.Element[] | undefined
}) {
  return (
    <ol class='dark:border-mirage-300 relative border-l border-gray-200'>
      {children}
    </ol>
  )
}

export interface TimelineProps {
  title: string
  releaseDate: string
  description: string
  downloadLink: string
}

export function Timeline({
  title,
  releaseDate,
  description,
  downloadLink,
}: TimelineProps) {
  return (
    <li class='ml-6'>
      <span class='ring-mirage-800/30 from-primary-350 to-primary-200 absolute -left-3 flex h-8 w-8 items-center justify-center rounded-full bg-radial-[at_10%_65%] from-65% ring-8'>
        <Icon icon='calendar-week' className='h-4 w-4' />
      </span>
      <h3 class='mb-1 flex items-center text-xl font-semibold text-gray-900 dark:text-slate-300'>
        {' '}
        {title}
        {downloadLink && (
          <span class='bg-primary-350 text-radiance-50 mr-2 ml-3 rounded px-2.5 py-0.5 text-sm font-medium'>
            Latest
          </span>
        )}
      </h3>
      <time class='mb-2 block text-sm leading-none font-normal text-slate-400'>
        {releaseDate}
      </time>
      <p class='mb-4 text-base font-normal text-slate-600 dark:text-slate-400'>
        {description}
      </p>
      {downloadLink && (
        <Button.Ghost variant='primary' className='!my-4 max-w-xs min-w-min'>
          <a
            href={downloadLink}
            className='!font-display !text-sm !text-inherit'
          >
            Download Source Code
          </a>
          <Icon icon='world-download' className='btn-icon' />
        </Button.Ghost>
      )}
    </li>
  )
}
