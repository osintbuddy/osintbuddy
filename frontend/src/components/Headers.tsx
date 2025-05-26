import { MouseEventHandler } from 'preact/compat'
import { PlusIcon } from '@heroicons/react/24/outline';

interface PageHeaderProps {
  title?: string
  header?: string
  btnTxt?: string
  btnAction?: MouseEventHandler<HTMLButtonElement>
}

export function Header({ title, header, btnTxt, btnAction }: PageHeaderProps) {
  return (
    <div class='relative mx-auto flex sm:px-2 lg:px-4 justify-center w-full'>
      <div class='min-w-0 max-w-2xl flex-auto pt-3 lg:max-w-none lg:pr-0 px-2'>
        <section class='space-y-1'>
          {title && (
            <h4 class='font-display text-sm font-medium text-primary-200'>
              {title}
            </h4>
          )}
          {header && (
            <p class='font-display leading-4 text-xl tracking-tight text-slate-400 dark:text-slate-300'>
                {header}
            </p>
          )}
        </section>
      </div>
      {btnTxt && (
        <button
          type='button'
          onClick={btnAction}
          class='ml-auto relative mb-3.5 ring-1 bg-dark-800  pr-3 text-left text-sm font-semibold text-primary-100 hover:text-primary-200 flex items-center border border-primary-200 hover:border-primary-300 py-2 px-3 rounded-md mr-1 z-50'
        >
          {btnTxt}
          <PlusIcon class='ml-2 w-5 h-5 ' />
        </button>
      )
      }
    </div>
  );
};
