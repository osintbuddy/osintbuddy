import { MouseEventHandler } from 'preact/compat'
import { Icon } from './icons'

interface PageHeaderProps {
  title?: string
  header?: string
  btnTxt?: string
  btnAction?: MouseEventHandler<HTMLButtonElement>
}

export function Header({ title, header, btnTxt, btnAction }: PageHeaderProps) {
  return (
    <div class='relative mx-auto flex w-full justify-center sm:px-2 lg:px-4'>
      <div class='max-w-2xl min-w-0 flex-auto px-2 pt-3 lg:max-w-none lg:pr-0'>
        <section class='space-y-1'>
          {title && (
            <h4 class='font-display text-primary-200 text-sm font-medium'>
              {title}
            </h4>
          )}
          {header && (
            <p class='font-display text-xl leading-4 tracking-tight text-slate-400 dark:text-slate-300'>
              {header}
            </p>
          )}
        </section>
      </div>
      {btnTxt && (
        <button
          type='button'
          onClick={btnAction}
          class='bg-dark-800 text-primary-100 hover:text-primary-200 border-primary-200 hover:border-primary-300 relative z-50 mr-1 mb-3.5 ml-auto flex items-center rounded-md border px-3 py-2 pr-3 text-left text-sm font-semibold ring-1'
        >
          {btnTxt}
          <Icon icon='plus' className='ml-2 h-5 w-5' />
        </button>
      )}
    </div>
  )
}
