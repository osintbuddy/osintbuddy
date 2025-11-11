import { FunctionComponent, ComponentChildren } from 'preact'

type Props = {
  text?: string
  disabled?: boolean
  speed?: number /** milliseconds per sweep */
  className?: string
  children?: ComponentChildren
}

const ShinyText: FunctionComponent<Props> = ({
  text,
  disabled = false,
  speed = 900,
  className = '',
  children,
}) => {
  return (
    <span
      className={`${
        disabled
          ? 'text-mirage-700'
          : 'animate-shine bg-[linear-gradient(90deg,#475569D5,#4D5D72,#475569D5)] bg-[length:500%_100%] bg-clip-text text-transparent'
      } ${className}`}
      style={{ ['--shine-speed' as any]: `${speed}ms` }}
    >
      {text && text}
      {children && children}
    </span>
  )
}

export default ShinyText
