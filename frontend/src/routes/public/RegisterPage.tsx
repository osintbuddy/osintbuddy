import Button from "@/components/buttons/Button";
import { TransparentInput, TransparentPasswordInput } from "@/components/inputs";
import { JSX } from "preact/jsx-runtime";

export default function RegisterPage(): JSX.Element {
  return (
    <div className="flex items-center justify-center w-full -mt-30">
      <div class="from-gray-950/55 to-gray-950/40 bg-gradient-to-tr backdrop-blur-sm rounded-lg shadow-sm shadow-gray-600/60 p-16 pt-4 font-display">
        <div className="flex justify-between py-10 ">
          <h2 className="text-slate-300/90 text-2xl border-b-4 border-b-primary relative">
            Sign up for OSINTBuddy
          </h2>
        </div>
        <form className="grid gap-y-7">
          <TransparentInput label="Username" type="text" className="w-full" />
          <TransparentInput label="Email" type="email" className="w-full" />
          <TransparentPasswordInput label="Password" className="w-full" />
          <TransparentInput label="Confirm Password" type="password" className="w-full" />

          <Button variant="primary" className="w-full">
            Sign up
          </Button>
        </form>
      </div>
    </div>
  )
}
