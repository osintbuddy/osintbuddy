
import Button from "@/components/buttons";
import Input from "@/components/inputs";
import { FingerPrintIcon } from "@heroicons/react/24/outline";
import { JSX } from "preact/jsx-runtime";
import { NavLink, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

export default function LoginPage(): JSX.Element {
  const navigate = useNavigate();

  const onSubmit = (e: any) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email")?.toString();
    const password = formData.get("password")?.toString();
    // check if inputs valid
    const invalidPassword = password === undefined || password.length < 8;
    const invalidEmail = email === undefined || email.length < 5;
    if (invalidEmail)
      toast.error("An email is required to sign in.");
    if (invalidPassword)
      toast.error("Passwords must have a minimum of 8 characters.");

    if (!invalidEmail && !invalidPassword) {
      // mutate({ email, password });
      e.currentTarget.reset(); // clear inputs
    }
  };

  return (
    <>
      <div class="flex flex-col items-center justify-center">
        <div class="shadow-2xl shadow-black/35 -mt-30 py-6 from-black/60 to-black/30 bg-gradient-to-tr backdrop-blur-sm border-l-3 border-primary/80 transition-all duration-100 rounded-r flex flex-col items-center w-11/12 md:w-auto">
          <h2 class="text-slate-350 mb-4 md:-ml-3 font-semibold font-display text-2xl relative">
            Sign into OSINTBuddy
          </h2>

          <div class="font-display flex flex-col items-center md:px-5">
            <form onSubmit={onSubmit} class="grid gap-y-2 max-w-2xs w-full px-2 md:px-0">
              <Input.Transparent
                label="Email"
                type="email"
                className="w-full "
                name="email"
                placeholder="you@provider.com"
              />
              <Input.TransparentPassword
                label="Password"
                className="w-full"
                name="password"
                placeholder="Your password"
              />
              <Input.Checkbox
                label="Remember me?"
                name="remember"
                placeholder="Your password"
                className="mt-2 mb-3"
              />

              <Button.Solid type="submit" variant="primary" className="w-full ">
                Sign in
                <FingerPrintIcon class="btn-icon " />
              </Button.Solid>
            </form>

            <hr class="w-sm text-mirage-700 mt-6 mb-4" />
            <section class="text-sm flex flex-col items-center text-slate-400">
              <p class="font-display">Don't have an account yet?</p>
              <NavLink
                to='/register'
                class="border-b-2 border-transparent hover:text-slate-350 hover:border-primary font-display"
              >
                Sign up here
              </NavLink>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
