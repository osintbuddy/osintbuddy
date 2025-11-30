import { HTMLAttributes } from 'preact/compat'
import Sprite from '../assets/images/osib-sprite.svg'

interface OsibProps extends HTMLAttributes<SVGSVGElement> {
  icon: string
  className?: string
}

export function Icon({ icon, className, ...props }: OsibProps) {
  return (
    <>
      <svg
        {...props}
        className={`${className ?? 'h-5 w-5 text-inherit'}`}
        // fill='none'
        // stroke='currentColor'
      >
        <use href={`${Sprite}#osib-${icon}`} />
      </svg>
    </>
  )
}
