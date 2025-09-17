import { useState } from 'preact/hooks'
import { MouseEventHandler } from 'preact/compat'
import type { JSX } from 'preact'
import { Icon } from './icons'

interface FileInputProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
  onBtnClick: Function
}

export function AltFile(props: FileInputProps) {
  const { onBtnClick, ...inputProps } = props

  return (
    <div className='relative flex w-full'>
      <input
        {...inputProps}
        type='text'
        class='hover:border-primary from-mirage-950/30 to-mirage-900/35 outline-mirage-500 hover:outline-mirage-400 focus:outline-primary focus:bg-mirage-400 -mr-0.5 w-full rounded-l border border-r-0 border-slate-900 bg-linear-to-br px-2 py-1 font-sans text-slate-300/90 outline-1 transition-colors duration-75 ease-in-out focus:outline-2'
      />
      <button
        onClick={() => onBtnClick()}
        title='Select a folder'
        className='inset-ring-primary-400/95 focus:ring-primary-350 hover:inset-ring-primary-400 border-primary-400/95 focus:border-primary-350 hover:border-primary-400 font-display group flex scale-100 items-center justify-center rounded-xs border-1 px-5 text-left text-sm font-medium tracking-wide whitespace-nowrap text-slate-400 inset-ring-1 transition-all duration-100 ease-linear hover:scale-105 hover:scale-[99%] hover:text-slate-300/70 hover:shadow'
      >
        <Icon
          icon='folder'
          className='absolute top-1.5 left-2.5 h-5 rotate-0 text-slate-400/80 group-hover:rotate-5 group-hover:text-slate-300/70'
        />
      </button>
    </div>
  )
}

interface PasswordInputProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export function AltPassword(props: PasswordInputProps) {
  const [hidePassword, setHidePassword] = useState<'text' | 'password'>(
    'password'
  )
  const { type: _, className, label, ...inputProps } = props

  return (
    <div className='relative mt-7 flex w-full flex-col'>
      {label && (
        <label
          for={label}
          class='text-slate-350 font-display absolute -top-6 -left-1 rounded-t px-2 text-sm'
        >
          {label}
        </label>
      )}
      <div className='relative flex w-full'>
        <input
          {...inputProps}
          type={hidePassword}
          className={`hover:outline-mirage-400 outline-mirage-500 focus-visible:border-primary text-slate-350 w-64 rounded border-2 border-transparent bg-linear-to-br from-black/35 to-black/10 px-2 py-1 font-sans outline-1 transition-all duration-100 ease-in placeholder:text-slate-800 hover:from-black/35 hover:to-black/20 focus:border-2 focus:bg-black/60 focus-visible:outline-transparent ${className ?? ''}`}
        />
        <button
          type='button'
          onClick={() =>
            setHidePassword(hidePassword === 'password' ? 'text' : 'password')
          }
          className='absolute top-1 right-1 rounded p-1 text-slate-800 outline-hidden focus:text-slate-600 focus:outline-hidden'
        >
          {hidePassword === 'password' ? (
            <Icon
              icon='eye'
              title='Show Password'
              className='relative -top-0.5 right-0 h-6 w-6 scale-100 rotate-0 hover:scale-110 hover:rotate-5'
            />
          ) : (
            <Icon
              icon='eye-off'
              title='Hide Password'
              className='!text-primary-350 relative -top-0.5 right-0 h-6 w-6 scale-100 rotate-0 hover:scale-110 hover:rotate-5'
            />
          )}
        </button>
      </div>
    </div>
  )
}

interface InputProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
  label?: string | JSX.Element | undefined
}

export function AltText(props: InputProps) {
  const { className, label, ...inputProps } = props
  return (
    <div className='relative mt-7 flex w-full flex-col'>
      {label && (
        <label class='text-slate-350/90 font-display absolute -top-6 -left-1 rounded-t px-2 text-sm font-medium'>
          {label}
        </label>
      )}
      <input
        {...inputProps}
        className={`hover:outline-mirage-400 outline-mirage-500 focus-visible:border-primary text-slate-350 w-64 rounded border-2 border-transparent bg-transparent bg-linear-to-br from-black/35 to-black/10 px-2 py-1 font-sans outline-1 transition-all duration-100 ease-in placeholder:text-slate-800 hover:from-black/35 hover:to-black/20 focus:border-2 focus:bg-black/60 focus-visible:outline-transparent ${className ?? ''}`}
      />
    </div>
  )
}

interface TextareaProps
  extends JSX.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
}

export function Textarea(props: TextareaProps) {
  const { className, label, ...inputProps } = props
  return (
    <div className='relative mt-7 flex w-full flex-col'>
      {label && (
        <label
          for={label}
          class='text-slate-350/90 font-display absolute -top-6 -left-1 rounded-t px-2 text-sm font-medium'
        >
          {label}
        </label>
      )}

      <textarea
        {...inputProps}
        className={`hover:outline-mirage-400 outline-mirage-500 focus:outline-primary focus:ring-primary focus:border-primary text-slate-350 w-64 rounded border border-transparent bg-linear-to-br from-black/35 to-black/10 p-2 py-1 font-sans outline-1 transition-colors duration-100 ease-in-out placeholder:text-slate-800 hover:from-black/35 hover:to-black/30 focus:bg-black/60 ${className ?? ''}`}
      />
    </div>
  )
}
interface IconInputProps extends InputProps {
  icon: JSX.Element
  onBtnClick?: MouseEventHandler<HTMLButtonElement>
}

export function AltIcon(props: IconInputProps) {
  const { className, label, icon, onBtnClick, ...inputProps } = props

  return (
    <div className='relative flex w-full flex-col'>
      {label && (
        <label class='text-slate-350 font-display absolute -top-6 -left-1 mt-7 rounded-t px-2 text-sm font-medium'>
          {label}
        </label>
      )}
      <div className='group relative flex w-full'>
        <input
          {...inputProps}
          className={`hover:outline-mirage-400 outline-mirage-500 focus-visible:border-primary text-slate-350 w-64 rounded border-2 border-transparent bg-linear-to-br from-black/35 to-black/10 px-2 py-1 font-sans outline-1 transition-all duration-100 ease-in placeholder:text-slate-800 hover:from-black/35 hover:to-black/20 focus:border-2 focus:bg-black/60 focus-visible:outline-transparent ${className ?? ''}`}
        />
        <button
          type='button'
          onClick={onBtnClick}
          className='focus:text-primary hover:text-primary-350 focus:outline-primary-400 absolute top-1 right-0 h-6 w-6 rounded p-0.5 text-slate-800 focus:outline-hidden'
        >
          {icon}
        </button>
      </div>
    </div>
  )
}

interface ToggleSwitchProps {
  label?: string
  description?: string
  className?: string
  name?: string
  checked?: boolean
  defaultChecked?: boolean
}

export function ToggleSwitch(props: ToggleSwitchProps) {
  const { label, description, className, defaultChecked = false } = props

  const [isChecked, setIsChecked] = useState(defaultChecked)

  const handleToggle = () => {
    setIsChecked(!isChecked)
  }

  return (
    <div class={`${className ?? ''}`}>
      <label
        htmlFor={props.name}
        class='font-display text-slate-350 text-sm leading-3 font-medium'
      >
        {label ?? ''}
      </label>
      <div class='sm:flex sm:items-start sm:justify-between'>
        {description && (
          <div class='text-slate-350 max-w-xl text-sm'>
            <p>{description}</p>
          </div>
        )}
        <div class='mt-5 sm:-mt-3 sm:ml-6 sm:flex sm:shrink-0 sm:items-center'>
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
            type='button'
            onClick={handleToggle}
            class={`${
              isChecked ? 'bg-primary-400' : 'bg-cod-600/50'
            } border-primary hover:ring-primary-400 relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 outline-hidden transition-colors duration-200 ease-in-out hover:ring-1 focus:appearance-none focus:ring-1`}
            role='switch'
            aria-checked={isChecked}
            aria-labelledby={props.name}
          >
            <span class='sr-only'>{label}</span>
            <span
              aria-hidden='true'
              class={`${
                isChecked
                  ? 'translate-x-7 bg-slate-200'
                  : 'translate-x-0 bg-slate-300'
              } mt-0.5 inline-block h-5 w-5 transform rounded-full shadow transition duration-200 ease-in-out`}
            />
          </button>
        </div>
      </div>
    </div>
  )
}

export function Checkbox(props: InputProps) {
  const { label, className, ...inputProps } = props
  return (
    <div
      className={`text-slate-350 relative flex items-center justify-between ${className ?? ''}`}
    >
      <label for={label?.toString()} class='text-sm'>
        {label}
      </label>
      <input
        {...inputProps}
        type='checkbox'
        id={label?.toString()}
        className="checked:accent-primary-350/95 text-mirage-500 hover:text-mirage-400 checked:bg-primary-350 checked:hover:bg-primary-400 checked:border-primary-350 checked:hover:border-primary-400 peer ms-2 h-4.5 w-4.5 appearance-none rounded border bg-black/40 p-2 font-sans text-sm checked:before:relative checked:before:-top-2.5 checked:before:right-[0.3rem] checked:before:text-slate-200 checked:before:content-['\2713\0020']"
      />
    </div>
  )
}

const Input = {
  AltFile,
  AltPassword,
  AltText,
  AltIcon,
  Textarea,
  ToggleSwitch,
  Checkbox,
}

export default Input
