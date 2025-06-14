
import { Description, Field, Label, Switch, SwitchGroup } from "@headlessui/react";
import { Fragment, forwardRef } from "react";
import { Control, useController } from "react-hook-form";

interface SwitchButtonProps {
  value: boolean;
  onBlur: () => void;
  onChange: (value: boolean) => void;
}

export const SwitchButton = forwardRef<HTMLButtonElement, SwitchButtonProps>(({ value, ...props }, ref) => (
  <Switch
    {...props}
    checked={value}
    as={Fragment}
  >
    <button ref={ref} class={`${value ? 'bg-primary-400' : 'bg-dark-600'} relative inline-flex h-7 w-14 flex-shrink-0 ring-3 ring-offset-0 cursor-pointer rounded-full border-2 border-primary transition-colors duration-200 ease-in-out focus:outline-none focus:ring-3 focus:ring-primary-200 focus:ring-offset-3 hover:ring-3 ring-primary-400 active:ring-3`}>
      <span
        aria-hidden='true'
        class={
          `inline-block h-6 w-6  transform rounded-full shadow ring-0 transition duration-200 ease-in-out ${value ? 'translate-x-7 bg-slate-400' : 'translate-x-0 bg-slate-400'}`}
      />
    </button>
  </Switch>
));

export interface InputToggleSwitchProps {
  name: string
  control: Control<any, any>;
  defaultValue?: boolean;
  className?: string
  label?: string
  description?: string
}

export default function InputToggleSwitch({ control, name, defaultValue, className, label, description }: InputToggleSwitchProps) {
  const { field } = useController({
    defaultValue: defaultValue ?? false,
    control,
    name
  })

  return (
    <Field as='div' class={`pb-5 sm:col-span-2 ${className ?? ''}`}>
      <Label as='h3' class=' font-display font-semibold leading-6 text-slate-400' passive>
        {label ?? ""}
      </Label>
      <div class='mt-2 sm:flex sm:items-start sm:justify-between'>
        {description && (
          <div class='max-w-xl text-sm text-slate-400'>
            <Description>
              {description}
            </Description>
          </div>
        )}
        <div class='mt-5 sm:ml-6 sm:-mt-2 sm:flex sm:flex-shrink-0 sm:items-center'>
          <SwitchButton {...field} />
        </div>
      </div>
    </Field>
  )
}
