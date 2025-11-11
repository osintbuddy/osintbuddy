import { BASE_URL } from '@/app/baseApi'
import { useAuthStore } from '@/app/store'
import Button from '@/components/buttons'
import { Icon } from '@/components/icons'
import { useEffect, useState } from 'preact/hooks'
import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom'

function inIframe() {
  try {
    return window !== window.parent
  } catch (e) {
    return true
  }
}

export default function Callback() {
  let [params, _] = useSearchParams()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  const { setIsAuthenticated, setAccessToken } = useAuthStore()

  const code = params.get('code')
  const state = params.get('state')

  if (!code || !state || error) {
    return (
      <div className='text-slate-350 my-40 flex w-full flex-col items-center'>
        <div className='flex flex-col'>
          <h1>
            We ran into an issue authenticating your account. Please sign in
            again.
            {error && (
              <p className='flex flex-col'>
                <br />
                <span className='text-danger mt-4 font-semibold'>
                  Error details:
                </span>
                <span>{error}</span>
              </p>
            )}
          </h1>
          <div className='flex items-start gap-x-4 pt-4'>
            <Button.Ghost onClick={() => navigate('/')} variant='primary'>
              Return Home
              <Icon icon='home' />
            </Button.Ghost>
          </div>
        </div>
      </div>
    )
  }

  useEffect(() => {
    window.sdk
      .signin(BASE_URL, '/auth/sign-in', code, state)
      .then((resp: JSONObject) => {
        if (resp?.token) {
          setAccessToken(resp.token)
          setIsAuthenticated(true)
          if (inIframe())
            window.parent.postMessage(
              {
                tag: 'Casdoor',
                type: 'SilentSignin',
                data: 'success',
              },
              '*'
            )
          navigate('/dashboard/cases', { replace: true })
        } else {
          setIsAuthenticated(false)
          console.warn(resp)
          setError(resp?.msg ?? null)
        }
      })
  }, [code, state])

  return <></>
}
