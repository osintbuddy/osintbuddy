import { EyeIcon, EyeSlashIcon, FolderIcon } from "@heroicons/react/20/solid";
import { useState } from "preact/hooks";
import { MouseEventHandler } from "preact/compat";
import type { JSX } from "preact";

interface FileInputProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
  onBtnClick: Function
}

export function TransparentFile(props: FileInputProps) {
  const { onBtnClick } = props;

  return (
    <div className="flex relative w-full ">
      <input
        {...props}
        type="text"
        class="font-sans hover:border-primary border border-slate-900 from-mirage-950/30 to-mirage-900/35 bg-linear-to-br w-full transition-colors duration-75 ease-in-out px-2 rounded-l border-r-0  outline-1 outline-slate-900 focus:outline-2 focus:outline-primary py-1 -mr-0.5 focus:bg-mirage-900 text-slate-300/90"
      />
      <button
        onClick={() => onBtnClick()}
        title="Select a folder"
        className="inset-ring-1 inset-ring-primary-400/95 whitespace-nowrap focus:ring-primary-350 hover:inset-ring-primary-400 text-left text-sm font-medium tracking-wide scale-100 hover:scale-[99%]  flex items-center border-1 border-primary-400/95 focus:border-primary-350 hover:border-primary-400 px-5 font-display  hover:shadow justify-center transition-all duration-100 ease-linear  rounded-xs text-slate-400 hover:text-slate-300/70 hover:scale-105 group"
      >
        <FolderIcon className="h-5 text-slate-400/80 group-hover:text-slate-300/70 group-hover:rotate-5 rotate-0 absolute left-2.5 top-1.5" />
      </button>
    </div>
  )
}

interface PasswordInputProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export function TransparentPassword(props: PasswordInputProps) {
  const [hidePassword, setHidePassword] = useState<"text" | "password">("password")
  const { type: _, className, label } = props;

  return (
    <div className="flex relative flex-col">
      {label && (
        <label for={label} class="text-sm text-slate-300/75 rounded-t absolute -top-6 px-2 -left-1">
          {label}
        </label>
      )}
      <div className="flex relative">
        <input
          {...props}
          type={hidePassword}
          className={`font-sans hover:outline-mirage-900 border-2 border-transparent focus:bg-black/60 from-black/35 to-black/10 hover:from-black/35 hover:to-black/20 bg-linear-to-br transition-all duration-100 ease-in px-2 rounded outline-1 outline-mirage-700 focus-visible:outline-transparent focus:border-2 focus-visible:border-primary py-1 w-64 text-slate-350 placeholder:text-slate-800 ${className ?? ''}`}
        />
        <button
          type="button"
          onClick={() => setHidePassword(hidePassword === "password" ? "text" : "password")}
          className="text-slate-800 absolute right-1 top-1 border-b-primary p-1 rounded focus:outline-primary-400 focus:outline-2"
        >
          {
            hidePassword === "password"
              ? <EyeIcon title="Show Password" className="h-5 relative right-0 top-0  scale-100 rotate-0 hover:rotate-5 hover:scale-110 " />
              : <EyeSlashIcon title="Hide Password" className="h-5 relative right-0 top-0 rotate-0 hover:rotate-5 scale-100 hover:scale-110" />
          }
        </button>
      </div>
    </div >
  )
}

interface InputProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export function Transparent(props: InputProps) {
  const { className, label } = props;
  return (
    <div className="flex flex-col relative">
      {label && (
        <label for={label} class="text-sm text-slate-300/75 rounded-t absolute -top-6 px-2 -left-1 ">
          {label}
        </label>
      )}
      <input
        {...props}
        className={`font-sans hover:outline-mirage-900 border border-transparent focus:bg-black/60 from-black/35 to-black/10 hover:from-black/35 hover:to-black/30 bg-linear-to-br transition-colors duration-100 ease-in-out px-2 rounded outline-1 outline-mirage-700 focus:outline-primary focus:border-primary py-1 w-64 text-slate-350 placeholder:text-slate-800 ${className ?? ''}`}
      />
    </div>
  )
}

interface IconInputProps extends InputProps {
  icon: JSX.Element
  onBtnClick: MouseEventHandler<HTMLButtonElement>
}

export function TransparentIcon(props: IconInputProps) {
  const { className, label, icon, onBtnClick } = props;

  return (
    <div className="flex relative flex-col">
      {label && (
        <label for={label} class="text-sm text-slate-300/75 rounded-t absolute -top-6 px-2 -left-1">
          {label}
        </label>
      )}
      <div className="flex relative">
        <input
          {...props}
          className={`font-sans hover:outline-mirage-900 border-2 border-transparent focus:bg-black/60 from-black/35 to-black/10 hover:from-black/35 hover:to-black/20 bg-linear-to-br transition-all duration-100 ease-in px-2 rounded outline-1 outline-mirage-700 focus-visible:outline-transparent focus:border-2 focus-visible:border-primary py-1 w-64 text-slate-350 placeholder:text-slate-800 ${className ?? ''}`}
        />
        <button
          type="button"
          onClick={onBtnClick}
          className="text-slate-800 focus:text-primary hover:text-primary-350 absolute right-1 top-1 p-1 rounded focus:outline-primary-400 focus:outline-none"
        >
          {icon}
        </button>
      </div>
    </div >
  )
}
const Input = {
  TransparentFile,
  TransparentPassword,
  Transparent,
  TransparentIcon
}

export default Input;