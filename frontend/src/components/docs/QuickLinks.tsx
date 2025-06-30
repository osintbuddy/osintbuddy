
import { Icon } from '@/components/icons'
import { NavLink } from 'react-router-dom'

export function QuickLinks({ children }: any) {
  return (
    <div className="not-prose my-12 grid grid-cols-1 gap-6 sm:grid-cols-2">
      {children}
    </div>
  )
}

export function QuickLink({ title, description, href, icon }: any) {
  return (
    <NavLink to={href} className="group relative rounded-xl border border-mirage-900/60 from-black/25 to-black/10  hover:from-black/50 hover:to-black/35 bg-gradient-to-tr hover:border-primary-350 transition-all duration-100 ease-in-out">
      <div className="absolute -inset-px rounded-xl border-2 border-transparent opacity-0  group-hover:opacity-100" />
      <div className="relative overflow-hidden rounded-xl p-6">
        <Icon icon={icon} className="h-8 w-8 bg-gradient-to-bl text-primary-300 group-hover:text-primary-200 text-clip" />
        <h2 className="mt-4 font-display text-base text-slate-900 dark:text-slate-300">
          {title}
        </h2>
        <p className="mt-1 text-sm text-slate-700 dark:text-slate-400">
          {description}
        </p>
      </div>
    </NavLink>
  )
}
