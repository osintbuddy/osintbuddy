import { NavLink } from 'react-router-dom'

const styles = {
  primary:
    'rounded-full bg-iceland py-2 px-4 text-sm font-semibold text-white hover:border-iceland-500 hover:bg-iceland-500 border-2 border-transparent focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-iceland-400/50 active:bg-iceland-300 hover:shadow',
  secondary:
    'rounded-full bg-slate-800 py-2 px-4 text-sm font-medium text-white hover:bg-slate-700 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50 active:text-slate-400',
}

type Variant = 'primary' | 'secondary'

export function Button({ variant = 'primary', className, href, ...props }: any) {
  className = `${styles[variant]} ${className}`

  return href ? (
    <NavLink to={href} className={className} {...props} />
  ) : (
    <button className={className} {...props} />
  )
}
