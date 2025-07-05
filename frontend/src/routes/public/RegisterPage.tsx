import { useAuthStore } from "@/app/store";
import Button from "@/components/buttons";
import { HeroBackground } from "@/components/docs/HeroBackground";
import { Icon } from "@/components/icons";
import Input from "@/components/inputs";
import { useEffect } from "preact/hooks";
import { JSX } from "preact/jsx-runtime";
import { NavLink } from "react-router-dom";
import { toast } from "react-toastify";

export default function RegisterPage(): JSX.Element {
  const { register, isRegistering, error: registerError } = useAuthStore();


  const onSubmit = (e: any) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get("username")?.toString();
    const email = formData.get("email")?.toString();
    const password = formData.get("password")?.toString();
    const confirm = formData.get("confirm")?.toString();
    const tos = formData.get("tos") === 'on';

    // check if inputs valid
    const invalidPassword = password === undefined || password.length < 8;
    const invalidEmail = email === undefined || email.length < 5;
    const invalidUsername = name === undefined || name.length < 3;
    if (invalidEmail)
      toast.error("A valid email is needed to sign up.");
    if (invalidPassword)
      toast.error("Passwords must have a minimum of 8 characters.");
    if (password !== confirm)
      toast.error("Passwords do not match.");
    if (invalidUsername)
      toast.error("A username is required and must be 3 or more characters.");
    if (!tos)
      toast.error("Please agree to the terms and conditions to sign up.");

    // attempt register when valid
    if (!invalidEmail && !invalidPassword && !invalidUsername && password === confirm && tos) {
      e.currentTarget.reset();
      register({ email, password, name })
        .then((registeredUser) => {
          toast.success(`Welcome to OSINTBuddy ${registeredUser.name}! Your account has been created! You can try signing in now.`)
        })
        .catch((err) => {
          toast.error(err.message)
        });
    }
  };

  return (
    <div class="flex flex-col items-center justify-center my-20 py-20">
      <div className="select-none fixed bottom-1/6 -z-50 [mask-image:linear-gradient(#05050520,,#050505)] right-5/11 md:right-1/11">
        <HeroBackground className="absolute  -rotate-90 lg:right-[40%]  translate-y-[-60%]" />
      </div>
      <div class="shadow-2xl shadow-black/35 -mt-30 py-6 from-black/50 to-black/30 bg-gradient-to-tr backdrop-blur-sm border-l-3 border-primary/80 transition-all duration-100 rounded-r-lg flex flex-col items-center w-11/12 md:w-auto">
        <h2 class="text-slate-350 mb-4 md:-ml-2 text-center font-semibold font-display text-2xl relative">
          Sign up for OSINTBuddy
        </h2>

        <div class="font-display flex flex-col items-center md:px-5">
          <form id="register" onSubmit={onSubmit} class="grid gap-y-2 max-w-2xs w-full px-2 md:px-0">
            <Input.Transparent
              name="username"
              label="Username"
              type="text"
              className="w-full"
              placeholder="Your username"
              required
            />
            <Input.Transparent
              name="email"
              label="Email"
              type="email"
              className="w-full"
              placeholder="you@provider.com"
              required
            />
            <Input.TransparentPassword
              name="password"
              label="Password"
              className="w-full"
              placeholder="Your password"
              required
            />
            <Input.Transparent
              name="confirm"
              label="Confirm Password"
              type="password"
              className="w-full"
              placeholder="Confirm your password"
              required
            />
            <Input.Checkbox
              label={<>I agree to the <NavLink class="border-b-3 border-primary-350 hover:border-primary hover:text-slate-200 text-base" to="/terms">terms and conditions</NavLink>.</>}
              name="tos"
              placeholder="Your password"
              className="mt-2 mb-4 "
              required
            />
            <Button.Solid disabled={isRegistering} type="submit" variant="primary" className="w-full">
              {isRegistering ? <>Creating account... <div class="dot-flashing !top-[3px] ml-2.5" /></> : 'Sign up'}
              {!isRegistering && <Icon icon='user-plus' className="btn-icon " />}
            </Button.Solid>
          </form>

          <hr class="w-xs md:w-sm text-mirage-700 mt-6 mb-4" />
          <section class="text-sm flex flex-col items-center text-slate-400">
            <p>Already have an account?</p>
            <NavLink
              to='/login'
              class="border-b-2 border-transparent hover:text-slate-200 hover:border-primary active:border-primary"
            >
              Sign in here
            </NavLink>
          </section>
        </div>
      </div>
    </div>
  );
}
