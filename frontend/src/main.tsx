import { render } from 'preact'
import AppRoutes from './AppRoutes'
import Sdk from 'casdoor-js-sdk'
import 'react-toastify/dist/ReactToastify.css'
import './assets/styles/index.css'

declare global {
  interface Window {
    sdk: Sdk
  }
}

const sdkConfig = {
  // TODO: move me to .env file and grab via .process
  serverUrl: 'http://localhost:8000',
  clientId: '58af0da083cabb072706',
  appName: 'application_osib',
  organizationName: 'organization_osib',
  redirectPath: '/callback',
  signinPath: '/api/signin',
}
window.sdk = new Sdk(sdkConfig)

export function App() {
  return <AppRoutes />
}

render(<App />, document.getElementById('app')!)
