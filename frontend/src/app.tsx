import { Provider } from 'jotai'
import SDK from 'casdoor-js-sdk';
import AppRoutes from './AppRoutes'

window.sdk = new SDK({
  serverUrl: import.meta.env.VITE_CASDOOR_ENDPOINT ?? 'http://localhost:45910',
  clientId: import.meta.env.VITE_CASDOOR_CLIENT_ID ?? '1d69456af504f585b7bf',
  organizationName: import.meta.env.VITE_CASDOOR_ORG_NAME ?? 'org_osintbuddy',
  appName: import.meta.env.VITE_CASDOOR_APP_NAME ?? 'app_osintbuddy',
  redirectPath: "/callback",
  signinPath: "/api/v1/auth/sign-in",
});

export function App() {
  return (
    <Provider>
      <AppRoutes />
    </Provider>
  )
}
