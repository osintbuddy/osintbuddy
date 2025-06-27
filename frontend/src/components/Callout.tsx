import { Icon } from '@/components/Icons'

const styles = {
  note: {
    container:
      'bg-sky-50 dark:bg-slate-800/60 dark:ring-1 dark:ring-slate-300/10',
    title: 'text-primary-900 dark:text-primary-100',
    body: 'text-primary-800 [--tw-prose-background:theme(colors.primary.50)] prose-a:text-primary-900 prose-code:text-primary-900 dark:text-slate-300 dark:prose-code:text-slate-300',
  },
  warning: {
    container:
      'bg-amber-50 dark:bg-slate-800/60 dark:ring-1 dark:ring-slate-300/10',
    title: 'text-amber-900 dark:text-amber-500',
    body: 'text-amber-800 [--tw-prose-underline:theme(colors.amber.400)] [--tw-prose-background:theme(colors.amber.50)] prose-a:text-amber-900 prose-code:text-amber-900 dark:text-slate-300 dark:[--tw-prose-underline:theme(colors.primary.700)] dark:prose-code:text-slate-300',
  },
}

export function Callout({ type = 'note', title, children }) {

  return (
    // styles[type].container
    <div className={'my-8 flex rounded-3xl p-6'}>
      <Icon icon={type} className="h-8 w-8 flex-none" />
      <div className="ml-4 flex-auto">
        {/* styles[type].title */}
        <p className={'m-0 font-display text-xl'}>
          {title}
        </p>
        {/* styles[type].body */}
        <div className={'prose mt-2.5'}>
          {children}
        </div>
      </div>
    </div>
  )
}
