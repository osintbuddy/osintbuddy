import Button from "@/components/buttons";
import Input from "@/components/inputs";
import { FingerPrintIcon } from "@heroicons/react/24/outline";
import { JSX } from "preact/jsx-runtime";
import { NavLink } from "react-router-dom";
import { toast } from "react-toastify";

export default function RegisterPage(): JSX.Element {

  const onSubmit = (e: any) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const username = formData.get("username")?.toString();
    const email = formData.get("email")?.toString();
    const password = formData.get("password")?.toString();
    const confirm = formData.get("confirm")?.toString();
    const tos = formData.get("tos") === 'on';

    // check if inputs valid
    const invalidPassword = password === undefined || password.length < 8;
    const invalidEmail = email === undefined || email.length < 5;
    const invalidUsername = username === undefined || username.length < 3;
    if (invalidEmail)
      toast.error("A valid email is needed to sign up.");
    if (invalidPassword)
      toast.error("Passwords must have a minimum of 8 characters.");
    if (password !== confirm)
      toast.error("Passwords do not match.")
    if (invalidUsername)
      toast.error("A username is required and must be 3 or more characters.")
    if (!tos)
      toast.error("Please agree to the terms and conditions to sign up.")
    if (!invalidEmail && !invalidPassword && !invalidUsername && password === confirm && tos) {
      // mutate({ email, password });
      e.currentTarget.reset(); // clear inputs after successful submission
    }
  };


  return (
    <div class="flex flex-col items-center justify-center">
      <div class="shadow-2xl shadow-black/35 -mt-30 py-6 from-black/25 to-black/30 bg-gradient-to-tr backdrop-blur-sm border-l-3 border-primary/80 transition-all duration-100 rounded-r flex flex-col items-center">
        <h2 class="text-slate-350 mb-4 ml-3 text-center font-semibold font-display text-2xl relative">
          Sign up for OSINTBuddy
        </h2>

        <div class="font-display flex flex-col items-center px-5">
          <form onSubmit={onSubmit} class="grid gap-y-2 max-w-2xs w-full">
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
            <Input.Checkbox
              label={<>I agree to the <NavLink class="border-b-3 border-primary-350 hover:border-primary text-slate-300 hover:text-slate-100" to="/terms" >terms and conditions</NavLink>.</>}
              name="tos"
              placeholder="Your password"
              className="mt-2 mb-4"
            />
            <Button.Solid type="submit" variant="primary" className="w-full">
              Sign up
              <FingerPrintIcon class="btn-icon " />
            </Button.Solid>
          </form>

          <hr class="w-sm text-slate-900 mt-6 mb-4" />
          <section class="text-sm flex flex-col items-center text-slate-400">
            <p class="font-display">Already have an account?</p>
            <NavLink
              to='/login'
              class="border-b-2 border-transparent hover:text-slate-350 hover:border-primary"
            >
              Sign in here
            </NavLink>
          </section>
        </div>
      </div>
    </div>
  );
}
