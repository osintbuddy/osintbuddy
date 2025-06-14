import Button from "@/components/buttons";
import Input from "@/components/inputs";
import { FingerPrintIcon } from "@heroicons/react/24/outline";
import { JSX } from "preact/jsx-runtime";

export default function RegisterPage(): JSX.Element {
  return (
    <div class="flex flex-col items-center justify-center">
      <div class="shadow-2xl shadow-black/35 px-14 -mt-30 py-8 from-black/25 to-black/30 bg-gradient-to-tr backdrop-blur-sm  border-l-3 border-primary/80 transition-all duration-100 rounded-r">
        <h2 class="text-slate-300/85 mb-12 font-medium font-display text-2xl relative">
          Sign up for an account
        </h2>
        <div class="font-display flex flex-col">
          <form class="grid gap-y-7">
            <Input.Transparent
              name="username"
              label="Username"
              type="text"
              className="w-full"
              placeholder="Your username"
            />
            <Input.Transparent
              name="email"
              label="Email"
              type="email"
              className="w-full"
              placeholder="you@provider.com"
            />
            <Input.TransparentPassword
              name="password"
              label="Password"
              className="w-full"
              placeholder="Your password"
            />
            <Input.Transparent
              name="confirm"
              label="Confirm Password"
              type="password"
              className="w-full"
              placeholder="Confirm your password"
            />

            <Button.Solid type="submit" variant="primary" className="w-full">
              Sign up
              <FingerPrintIcon class="btn-icon " />
            </Button.Solid>
          </form>
        </div>
      </div>
    </div>
  );
}
