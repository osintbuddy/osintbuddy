import { authAtom, tAtom } from "@/app/api";
import Button from "@/components/buttons";
import Input from "@/components/inputs";
import { FingerPrintIcon } from "@heroicons/react/24/outline";
import { useAtom } from "jotai";
import { useEffect } from "preact/hooks";
import { JSX } from "preact/jsx-runtime";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

export default function LoginPage(): JSX.Element {
  const navigate = useNavigate();
  const [{ error, data, mutate, status }] = useAtom(authAtom);

  const onSubmit = (e: any) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email")?.toString();
    const password = formData.get("password")?.toString();
    // check if inputs valid
    const invalidPassword = password === undefined || password.length < 8;
    const invalidEmail = email === undefined || email.length < 5;
    if (invalidPassword)
      toast.warn("Passwords must have a minimum of 8 characters.");
    if (invalidEmail)
      toast.warn("An email is needed to sign in.");

    if (!invalidEmail && !invalidPassword) {
      mutate({ email, password });
      e.currentTarget.reset(); // clear inputs
    }
  };


  useEffect(() => {
    if (status === 'success') {
      navigate("/dashboard", { replace: true });
    }
    if (error?.message && error?.kind) {
      toast.error(error.message)
      console.log(error)
    }
    console.log(data, status)
  }, [data])

  return (
    <>
      <div class="flex flex-col items-center justify-center">
        <div class="shadow-2xl shadow-black/35 px-14 -mt-30 py-8 from-black/25 to-black/30 bg-gradient-to-tr backdrop-blur-sm border-l-3 border-primary/80 transition-all duration-100 rounded-r">
          <h2 class="text-slate-350 mb-12 font-semibold font-display text-2xl relative">
            Sign into OSINTBuddy
          </h2>
          <div class="font-display flex flex-col items-center">
            <form onSubmit={onSubmit} class="grid gap-y-7 max-w-xs w-full">
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
              <Button.Solid type="submit" variant="primary" className="w-full ">
                Sign in
                <FingerPrintIcon class="btn-icon " />
              </Button.Solid>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
