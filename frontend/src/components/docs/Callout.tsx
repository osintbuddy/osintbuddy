import { Icon } from '@/components/icons'
import type { JSX } from 'preact/jsx-runtime'

export type CalloutType = 'info' | 'warning' | 'danger'

interface CalloutProps {
  type: CalloutType
  title: string
  children: string | JSX.Element | undefined
}

const styles = {
  info: {
    container:
      'bg-blue-50/5 border-blue-900/10 !border-l-blue-500/65  !border-l-amber-500',
    title: '!text-blue-400/80',
    body: 'text-blue-800 [--tw-prose-underline:theme(colors.blue.400)] [--tw-prose-background:theme(colors.blue.50)] prose-a:text-blue-900 prose-code:text-blue-900 dark:text-slate-300 dark:[--tw-prose-underline:theme(colors.primary.700)] dark:prose-code:text-slate-300',
    icon: 'info-circle',
  },
  warning: {
    container:
      'bg-amber-50/5 border-amber-900/10 !border-l-amber-500/65 !border-l-amber-500',
    title: '*:text-amber-400/80 ',
    body: 'text-amber-800 [--tw-prose-underline:theme(colors.amber.400)] [--tw-prose-background:theme(colors.amber.50)] prose-a:text-amber-900 prose-code:text-amber-900 dark:text-slate-300 dark:[--tw-prose-underline:theme(colors.primary.700)] dark:prose-code:text-slate-300',
    icon: 'alert-triangle',
  },
  danger: {
    container:
      'bg-danger-50/5 border-danger-900/10 !border-l-danger-500/65  !border-l-danger-500',
    title: '!text-danger-400/80 ',
    body: 'text-danger-800 [--tw-prose-underline:theme(colors.danger.400)] [--tw-prose-background:theme(colors.danger.50)] prose-a:text-danger-900 prose-code:text-danger-900 dark:text-slate-300 dark:[--tw-prose-underline:theme(colors.primary.700)] dark:prose-code:text-slate-300',
    icon: 'radioactive',
  },
}

export function Callout({ type = 'info', title, children }: CalloutProps) {
  return (
    // styles[type].container
    <div
      className={`mx-2 my-6 flex rounded-r-lg border-[1px] border-l-3 bg-gradient-to-tr from-black/30 to-black/40 px-6 py-4 ${styles[type].container}}`}
    >
      <section>
        <h5
          className={`font-display !mt-0 flex items-center !font-medium opacity-85 ${styles[type].title}`}
        >
          <Icon
            icon={styles[type].icon}
            className='mr-2 h-6 w-6 flex-none text-inherit'
          />
          <span>{title}</span>
        </h5>
        <div className={'prose-p:!text-slate-300 *:!pb-0 *:text-sm'}>
          {children}
        </div>
      </section>
    </div>
  )
}
