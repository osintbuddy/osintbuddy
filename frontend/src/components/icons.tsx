import { HTMLAttributes } from 'preact/compat'
import Sprite from '../assets/images/tabler-sprite.svg'

interface TablerIconProps extends HTMLAttributes<SVGSVGElement> {
  icon: string
  className?: string
}

interface IconProps {
  className?: string
}

export function Icon(props: TablerIconProps) {
  const { icon, className, ...svgProps } = props
  return (
    <>
      <svg
        {...svgProps}
        className={` ${className ?? 'h-5 w-5 text-inherit'}`}
        fill='none'
        stroke='currentColor'
      >
        <use href={`${Sprite}#tabler-${icon}`} />
      </svg>
    </>
  )
}

export function GripIcon({ className }: IconProps) {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      className={className}
      width='24'
      height='24'
      strokeWidth='2'
      stroke='currentColor'
      fill='none'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <path stroke='none' d='M0 0h24v24H0z' fill='none'></path>
      <path d='M9 5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0'></path>
      <path d='M9 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0'></path>
      <path d='M9 19m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0'></path>
      <path d='M15 5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0'></path>
      <path d='M15 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0'></path>
      <path d='M15 19m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0'></path>
    </svg>
  )
}
