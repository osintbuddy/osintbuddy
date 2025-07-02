import type { JSX, ComponentChildren } from "preact";

export type ButtonStyle = "primary" | "danger"

export interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  children: ComponentChildren,
  variant: ButtonStyle
}

const solid = {
  primary: "hover:ring-primary-400 ring-primary-350 bg-primary-350 hover:bg-primary-400 focus:bg-primary-400 focus:outline-primary-300 disabled:bg-slate-800 disable:border-slate-800 disabled:stroke-slate-800 disable:outline-slate-800 disabled:ring-slate-800 disabled:text-slate-400/80 focus:outline-primary-200 outline-1 outline-primary-350 focus:outline-2 disabled:outline-slate-800 disabled:hover:scale-100 shadow-md shadow-primary-900/30 hover:shadow-primary-950 hover:shadow-2xs ",
  danger: "ring-danger-500/90 hover:ring-danger-500 bg-danger-500/90 hover:bg-danger-500 focus:bg-danger-400/90 hover:stroke-danger-500 stroke-danger-500/90"
}

export function Solid(props: ButtonProps): JSX.Element {
  const { children, className, variant, ...btnProps } = props;

  return (
    <button
      {...btnProps}
      class={`group ring-1 whitespace-nowrap text-left text-sm tracking-wide font-semibold flex scale-100 hover:scale-[99%] items-center hover:ring-inset py-2 px-5 font-display rounded-md justify-center transition-all duration-75 ease-in text-slate-200/99 hover:text-slate-200 ${solid[variant]} ${className ?? ''} `}
    >
      {children}
    </button>
  )
}

const ghost = {
  primary: "shadow-primary-900/50 bg-primary/1 backdrop-brightness-100 hover:backdrop-brightness-90 hover:bg-primary/7 ring-primary-350 outline-primary-350 border-primary-350 hover:ring-primary-400 hover:shadow-primary-900 hover:border-primary-400 hover:shadow-2xs focus:ring-primary-350 focus:bg-primary/6 active:bg-primary/5 focus:border-primary-350 focus:outline-0 focus:backdrop-brightness-85 active:backdrop-brightness-85 active:ring-primary-300 active:outline-primary-300 active:border-primary-300 disabled:ring-slate-600 disabled:border-slate-600 disabled:text-slate-500 shadow-lg",
  danger: "ring-danger-500/90 focus:ring-danger-500/85 hover:ring-danger-500 border-danger-500/90 focus:border-danger-500/85 hover:border-danger-500"
}

export function Ghost(props: ButtonProps): JSX.Element {
  const { children, className, variant, ...btnProps } = props;

  return (
    <button
      {...btnProps}
      class={` group ring-1 whitespace-nowrap text-left text-sm flex items-center justify-center tracking-wide font-semibold scale-100 hover:scale-[99%] border hover:ring-inset py-2 px-5 font-display rounded-md transition-all duration-75 ease-in text-slate-300/99 hover:text-slate-300 ${ghost[variant]} ${className ?? ''}`}
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