import { accountAtom } from "@/app/atoms";
import { BASE_URL } from "@/app/baseApi";
import { useMountEffect } from "@/app/hooks";
import { useAtom } from "jotai";
import { useLocation, useNavigate } from "react-router-dom";

export default function CallbackPage() {
  const navigate = useNavigate();
  const location = useLocation()
  const params = new URLSearchParams(location.search)

  const [_, setAccount] = useAtom(accountAtom);

  function inIframe() {
    try {
      return window !== window.parent;
    } catch (e) {
      return true;
    }
  }

  function login() {
    window.sdk.signin(
      BASE_URL as string,
      '/api/v1/auth/sign-in',
      // @ts-ignore
      params.code, params.state
    ).then((resp: JSONObject) => {
      if (resp?.status === "ok") {
        setAccount({ isAuthenticated: true })
        if (inIframe()) window.parent.postMessage({
          tag: "Casdoor",
          type: "SilentSignin",
          data: "success"
        }, "*");
        navigate("/dashboard/graph", { replace: true })
        } else {
        console.error(resp)
        setAccount({ isAuthenticated: false })
        navigate("/", { replace: true })
      }
    })
  }

  useMountEffect(() => login())

  return <></>
}