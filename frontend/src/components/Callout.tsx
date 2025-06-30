import { Icon } from '@/components/Icons'
import type { JSX } from 'preact/jsx-runtime'

const styles = {
  info: {
    container:
      'bg-radiance-50/5 border-radiance-900/10 !border-l-radiance-500/65  !border-l-amber-500',
    title: '!text-radiance-400/80',
    body: 'text-radiance-800 [--tw-prose-underline:theme(colors.radiance.400)] [--tw-prose-background:theme(colors.radiance.50)] prose-a:text-radiance-900 prose-code:text-radiance-900 dark:text-slate-300 dark:[--tw-prose-underline:theme(colors.primary.700)] dark:prose-code:text-slate-300',
    icon: 'info-circle'
  },
  warning: {
    container:
      'bg-amber-50/5 border-amber-900/10 !border-l-amber-500/65 !border-l-amber-500',
    title: '*:text-amber-400/80 ',
    body: 'text-amber-800 [--tw-prose-underline:theme(colors.amber.400)] [--tw-prose-background:theme(colors.amber.50)] prose-a:text-amber-900 prose-code:text-amber-900 dark:text-slate-300 dark:[--tw-prose-underline:theme(colors.primary.700)] dark:prose-code:text-slate-300',
    icon: 'alert-triangle'
  },
  danger: {
    container:
      'bg-danger-50/5 border-danger-900/10 !border-l-danger-500/65  !border-l-danger-500',
    title: '!text-danger-400/80 ',
    body: 'text-danger-800 [--tw-prose-underline:theme(colors.danger.400)] [--tw-prose-background:theme(colors.danger.50)] prose-a:text-danger-900 prose-code:text-danger-900 dark:text-slate-300 dark:[--tw-prose-underline:theme(colors.primary.700)] dark:prose-code:text-slate-300',
    icon: 'radioactive'
  }
}

export type CalloutType = 'info' | 'warning' | 'danger'

interface CalloutProps {
  type: CalloutType
  title: string
  children: string | JSX.Element | undefined
}

export function Callout({ type = 'info', title, children }: CalloutProps) {
  return (
    // styles[type].container
    <div className={`my-6 py-4 border-[1px] border-l-3 flex px-6 from-black/30 to-black/40 bg-gradient-to-tr rounded-r-lg mx-2 ${styles[type].container}}`}>
      <section>
        <h5 className={`!font-medium !mt-0 flex items-center font-display opacity-85 ${styles[type].title}`}>
          <Icon icon={styles[type].icon} className="h-6 w-6 mr-2 flex-none text-inherit" />
          <span>{title}</span>
        </h5>
        <div className={'prose-p:!text-slate-300 *:text-sm'}>
          {children}
        </div>
      </section>
    </div>
  )
}
