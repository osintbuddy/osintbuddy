import type { JSX } from "preact";
import { ButtonProps } from "./Button";

const styles = {
  primary: "ring-primary-400/90 focus:ring-primary-400/85 hover:ring-primary-400 border-primary-400/90 focus:border-primary-400/85 hover:border-primary-400",
  danger: ""
}

export default function ButtonGhost(props: ButtonProps): JSX.Element {
  const { children, className, variant } = props;

  return (
    <button class={`group ring-1 whitespace-nowrap text-left text-sm tracking-wide font-semibold  scale-100 hover:scale-[99%] flex items-center border hover:ring-inset py-2 px-5 font-display rounded-md hover:shadow justify-center transition-all duration-75 ease-linear hover:text-slate-200/80 text-slate-300/80 ${styles[variant]} ${className ?? ''}`}>
      {children}
    </button>
  )
}