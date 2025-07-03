import { useState } from "preact/hooks";
import { MouseEventHandler } from "preact/compat";
import type { JSX } from "preact";
import { Icon } from "./icons";

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
        class="font-sans hover:border-primary border border-slate-900 from-mirage-950/30 to-mirage-900/35 bg-linear-to-br w-full transition-colors duration-75 ease-in-out px-2 rounded-l border-r-0  outline-1 outline-mirage-500 hover:outline-mirage-400 focus:outline-2 focus:outline-primary py-1 -mr-0.5 focus:bg-mirage-400 text-slate-300/90"
      />
      <button
        onClick={() => onBtnClick()}
        title="Select a folder"
        className="inset-ring-1 inset-ring-primary-400/95 whitespace-nowrap focus:ring-primary-350 hover:inset-ring-primary-400 text-left text-sm font-medium tracking-wide scale-100 hover:scale-[99%]  flex items-center border-1 border-primary-400/95 focus:border-primary-350 hover:border-primary-400 px-5 font-display  hover:shadow justify-center transition-all duration-100 ease-linear  rounded-xs text-slate-400 hover:text-slate-300/70 hover:scale-105 group"
      >
        <Icon icon='folder' className="h-5 text-slate-400/80 group-hover:text-slate-300/70 group-hover:rotate-5 rotate-0 absolute left-2.5 top-1.5" />
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
    <div className="flex relative flex-col w-full mt-7">
      {label && (
        <label for={label} class="text-sm text-slate-350 rounded-t absolute font-display -top-6 px-2 -left-1">
          {label}
        </label>
      )}
      <div className="flex relative w-full ">
        <input
          {...props}
          type={hidePassword}
          className={`font-sans hover:outline-mirage-400 border-2 border-transparent focus:bg-black/60 from-black/35 to-black/10 hover:from-black/35 hover:to-black/20 bg-linear-to-br transition-all duration-100 ease-in px-2 rounded outline-1 outline-mirage-500 focus-visible:outline-transparent focus:border-2 focus-visible:border-primary py-1 w-64 text-slate-350 placeholder:text-slate-800 ${className ?? ''}`}
        />
        <button
          type="button"
          onClick={() => setHidePassword(hidePassword === "password" ? "text" : "password")}
          className="text-slate-800 absolute right-1 top-1  p-1 rounded outline-hidden focus:outline-hidden focus:text-slate-600"
        >
          {
            hidePassword === "password"
              ? <Icon icon='eye' title="Show Password" className="h-6 w-6 relative right-0 -top-0.5  scale-100 rotate-0 hover:rotate-5 hover:scale-110 " />
              : <Icon icon='eye-off' title="Hide Password" className="h-6 w-6 relative right-0 -top-0.5 rotate-0 hover:rotate-5 scale-100 hover:scale-110 !text-primary-350" />
          }
        </button>
      </div>
    </div >
  )
}

interface InputProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
  label?: string | JSX.Element | undefined
}

export function Transparent(props: InputProps) {
  const { className, label } = props;
  return (
    <div className="flex flex-col relative w-full mt-7">
      {label && (
        <label class="text-sm font-medium text-slate-350/90 font-display rounded-t absolute -top-6 px-2 -left-1 ">
          {label}
        </label>
      )}
      <input
        {...props}
        className={`font-sans hover:outline-mirage-400 border border-transparent focus:bg-black/60 from-black/35 to-black/10 hover:from-black/35 hover:to-black/30 bg-linear-to-br transition-colors duration-100 ease-in-out px-2 rounded outline-1 outline-mirage-500 focus:outline-primary focus:border-primary py-1 w-64 text-slate-350 placeholder:text-slate-800 ${className ?? ''}`}
      />
    </div>
  )
}


interface TextareaProps extends JSX.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
}

export function Textarea(props: TextareaProps) {
  const { className, label } = props;
  return (
    <div className="flex flex-col relative w-full mt-7">
      {label && (
        <label for={label} class="text-sm font-medium text-slate-350/90 font-display rounded-t absolute -top-6 px-2 -left-1 ">
          {label}
        </label>
      )}

      <textarea
        {...props}
        className={`font-sans p-2 hover:outline-mirage-400 border border-transparent focus:bg-black/60 from-black/35 to-black/10 outline-mirage-500 hover:from-black/35 hover:to-black/30 bg-linear-to-br transition-colors duration-100 ease-in-out rounded outline-1  focus:outline-primary focus:ring-primary focus:border-primary py-1 w-64 text-slate-350 placeholder:text-slate-800 ${className ?? ''}`}
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
    <div className="flex relative flex-col w-full">
      {label && (
        <label class="text-sm text-slate-350 font-medium  font-display rounded-t absolute -top-6 px-2 -left-1 mt-7">
          {label}
        </label>
      )}
      <div className="flex relative w-full">
        <input
          {...props}
          className={`font-sans hover:outline-mirage-400 border-2 border-transparent focus:bg-black/60 from-black/35 to-black/10 hover:from-black/35 hover:to-black/20 bg-linear-to-br transition-all duration-100 ease-in px-2 rounded outline-1 outline-mirage-500 focus-visible:outline-transparent focus:border-2 focus-visible:border-primary py-1 w-64 text-slate-350 placeholder:text-slate-800 ${className ?? ''}`}
        />
        <button
          type="button"
          onClick={onBtnClick}
          className="text-slate-800 h-6 w-6 focus:text-primary hover:text-primary-350 absolute top-1 p-0.5 rounded focus:outline-primary-400 focus:outline-hidden right-4"
        >
          {icon}
        </button>
      </div>
    </div >
  )
}



interface ToggleSwitchProps {
  label?: string;
  description?: string;
  className?: string;
  name?: string;
  checked?: boolean;
  defaultChecked?: boolean;
}

export function ToggleSwitch(props: ToggleSwitchProps) {
  const { label, description, className, defaultChecked = false } = props;

  const [isChecked, setIsChecked] = useState(defaultChecked);

  const handleToggle = () => {
    setIsChecked(!isChecked);
  };

  return (
    <div class={`${className ?? ''}`}>
      <label htmlFor={props.name} class='text-sm font-display font-medium leading-3 text-slate-350'>
        {label ?? ""}
      </label>
      <div class='sm:flex sm:items-start sm:justify-between'>
        {description && (
          <div class='max-w-xl text-sm text-slate-350'>
            <p>
              {description}
            </p>
          </div>
        )}
        <div class='mt-5 sm:ml-6 sm:-mt-3 sm:flex sm:shrink-0 sm:items-center'>
          {/* Hidden checkbox for form submission and accessibility */}
          <input
            type='checkbox'
            checked={isChecked}
            onChange={handleToggle}
            name={props.name}
            id={props.name}
            class='sr-only'
          />

          {/* Visual toggle button */}
          <button
            type="button"
            onClick={handleToggle}
            class={`${isChecked ? 'bg-primary-400' : 'bg-cod-600/50'
              } relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-primary transition-colors duration-200 ease-in-out focus:ring-1 hover:ring-1 hover:ring-primary-400 focus:appearance-none outline-hidden`}
            role="switch"
            aria-checked={isChecked}
            aria-labelledby={props.name}
          >
            <span class="sr-only">{label}</span>
            <span
              aria-hidden='true'
              class={`${isChecked ? 'translate-x-7 bg-slate-200' : 'translate-x-0 bg-slate-300'
                } inline-block h-5 w-5 transform rounded-full shadow transition duration-200 ease-in-out mt-0.5`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}

export function Checkbox(props: InputProps) {
  const { label, className } = props;
  return (
    <div className={`flex items-center justify-between text-slate-350 relative ${className ?? ''}`}>
      <label for={label?.toString()} class="text-sm hover:text-slate-300">{label}</label>
      <input {...props} type="checkbox" id={label?.toString()} className="ms-2 text-sm font-sans checked:accent-primary-350/95 h-4.5 w-4.5 text-mirage-500 bg-black/40 hover:text-mirage-400 appearance-none border p-2 rounded checked:bg-primary-350 checked:hover:bg-primary-400 checked:border-primary-350 checked:hover:border-primary-400 checked:before:content-['\2713\0020'] checked:before:-top-2.5 checked:before:right-[0.3rem] checked:before:relative checked:before:text-slate-200 peer" />
    </div>
  )
}

const Input = {
  TransparentFile,
  TransparentPassword,
  Transparent,
  TransparentIcon,
  Textarea,
  ToggleSwitch,
  Checkbox
}

export default Input;