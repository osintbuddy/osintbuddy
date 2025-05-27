import type { JSX, ComponentChildren } from "preact";

export type ButtonStyle = "primary" | "danger"

export interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  children: ComponentChildren,
  variant: ButtonStyle
}

const styles = {
  primary: "ring-primary-400/90 hover:ring-primary-400 bg-primary-400/90 hover:bg-primary-400 focus:bg-primary-300/90 hover:stroke-primary-400 stroke-primary-400/90",
  danger: "ring-danger-500/90 hover:ring-danger-500 bg-danger-500/90 hover:bg-danger-500 focus:bg-danger-400/90 hover:stroke-danger-500 stroke-danger-500/90"
}

export default function Button(props: ButtonProps): JSX.Element {
  const { children, className, variant, ...btnProps } = props;

  return (
    <button
      {...btnProps}
      class={`group ring-1 whitespace-nowrap text-left text-sm tracking-wide font-semibold hover:text-slate-200/90 text-slate-200/90 flex scale-100 hover:scale-[99%] items-center hover:ring-inset py-2 px-5 font-display rounded-md hover:shadow justify-center transition-all duration-75 ease-linear ${styles[variant]} ${className ?? ''}`}
    >
      {children}
    </button>
  )
}