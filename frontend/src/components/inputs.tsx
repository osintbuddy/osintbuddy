import { EyeIcon, EyeSlashIcon, FolderIcon } from "@heroicons/react/20/solid";
import { useState } from "preact/hooks";

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
        class="font-sans hover:border-primary border border-slate-900 bg-mirage-300/20 w-full transition-colors duration-75 ease-in-out px-2 rounded-l border-r-0  outline-1 outline-slate-900 focus:outline-2 focus:outline-primary py-1 -mr-0.5 focus:bg-mirage-900 text-slate-300/90"
      />
      <button
        onClick={() => onBtnClick()}
        title="Select a folder"
        className="inset-ring-1 inset-ring-primary-400/95 whitespace-nowrap focus:ring-primary-300/90 hover:inset-ring-primary-400 text-left text-sm font-medium tracking-wide scale-100 hover:scale-[99%]  flex items-center border-1 border-primary-400/95 focus:border-primary-300/90 hover:border-primary-400 px-5 font-display  hover:shadow justify-center transition-all duration-100 ease-linear  rounded-xs text-slate-400 hover:text-slate-300/70 hover:scale-105 group"
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
        <label for={label} class="text-sm text-slate-300/85 rounded-t absolute -top-6 px-2 -left-1">
          {label}
        </label>
      )}
      <div className="flex relative">
        <input
          {...props}
          type={hidePassword}
          className={`font-sans hover:border-primary border border-mirage-300/90 focus:bg-black/60 from-mirage-800/30 to-mirage-700/20 bg-linear-to-br transition-colors duration-75 ease-in-out px-2 rounded-sm outline-1 outline-slate-900  focus:outline-primary focus:border-primary py-1 w-64 text-slate-300/85 ${className ?? ''}`}
        />
        <button
          type="button"
          onClick={() => setHidePassword(hidePassword === "password" ? "text" : "password")}
          className="text-slate-600 w-0"
        >
          {
            hidePassword === "password"
              ? <EyeIcon className="h-5 relative -left-7 scale-100 rotate-0 hover:rotate-5 hover:scale-110" />
              : <EyeSlashIcon className="h-5 relative -left-7 rotate-0 hover:rotate-5 scale-100 hover:scale-110" />
          }
        </button>
      </div>
    </div>
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
        <label for={label} class="text-sm text-slate-300/85 rounded-t absolute -top-6 px-2 -left-1 ">
          {label}
        </label>
      )}
      <input
        {...props}
        className={`font-sans hover:border-primary border border-mirage-300/90 focus:bg-black/60 from-mirage-800/30 to-mirage-700/20 bg-linear-to-br transition-colors duration-75 ease-in-out px-2 rounded-sm outline-1 outline-slate-900  focus:outline-primary focus:border-primary py-1 w-64 text-slate-300/85 ${className ?? ''}`}
      />
    </div>
  )
}


const Input = {
  TransparentFile,
  TransparentPassword,
  Transparent
}

export default Input;