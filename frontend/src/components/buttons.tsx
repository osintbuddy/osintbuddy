import type { JSX, ComponentChildren } from "preact";

export type ButtonStyle = "primary" | "danger"

export interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  children: ComponentChildren,
  variant: ButtonStyle
}

const solidStyles = {
  primary: "hover:ring-primary-400 ring-primary-350 bg-primary-350 hover:bg-primary-400 focus:bg-primary-400 focus:outline-primary-300 disabled:bg-slate-800 disable:border-slate-800 disabled:stroke-slate-800 disable:outline-slate-800 disabled:ring-slate-800 disabled:text-slate-400/80 focus:outline-primary-200 outline-1 outline-primary-350 focus:outline-inset disabled:outline-slate-800 disabled:hover:scale-100",
  danger: "ring-danger-500/90 hover:ring-danger-500 bg-danger-500/90 hover:bg-danger-500 focus:bg-danger-400/90 hover:stroke-danger-500 stroke-danger-500/90"
}

export function Solid(props: ButtonProps): JSX.Element {
  const { children, className, variant, ...btnProps } = props;

  return (
    <button
      {...btnProps}
      class={`group ring-1 whitespace-nowrap text-left text-sm tracking-wide font-semibold text-slate-200/95 text-slate-200 flex scale-100 hover:scale-[99%] items-center hover:ring-inset py-2 px-5 font-display rounded-md hover:shadow justify-center transition-all duration-75 ease-linear ${solidStyles[variant]} ${className ?? ''} `}
    >
      {children}
    </button>
  )
}

const ghostStyles = {
  primary: "ring-primary-350 focus:ring-primary-400/85 hover:ring-primary-400 border-primary-350 focus:border-primary-400/85 hover:border-primary-400 disabled:ring-slate-600 disabled:border-slate-600 disabled:text-slate-500",
  danger: "ring-danger-500/90 focus:ring-danger-500/85 hover:ring-danger-500 border-danger-500/90 focus:border-danger-500/85 hover:border-danger-500"
}

export function Ghost(props: ButtonProps): JSX.Element {
  const { children, className, variant, ...btnProps } = props;

  return (
    <button
      {...btnProps}
      class={` group ring-1  whitespace-nowrap text-left text-sm tracking-wide font-semibold  scale-100 hover:scale-[99%] flex items-center border hover:ring-inset  py-2 px-5 font-display rounded-md hover:shadow justify-center transition-all duration-75 ease-linear text-slate-200/95 text-slate-200 ${ghostStyles[variant]} ${className ?? ''}`}
    >
      {children}
    </button>
  )
}

const Button = {
  Ghost,
  Solid,
};

export default Button;