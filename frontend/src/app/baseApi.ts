import { SdkConfig } from 'casdoor-js-sdk/lib/cjs/sdk';

const API_PREFIX = "/api/v1";
const LS_USER_KEY = "ob-user";

const DOMAIN = import.meta.env.VITE_BASE_URL?.replace('https://', '').replace('http://', '')
const BASE_URL = import.meta.env.VITE_BASE_URL;
const WS_URL = DOMAIN + API_PREFIX;

const CASDOOR_CONFIG: SdkConfig = {
  serverUrl: import.meta.env.VITE_CASDOOR_ENDPOINT ?? 'http://localhost:45910',
  clientId: import.meta.env.VITE_CASDOOR_CLIENT_ID ?? '1d69456af504f585b7bf',
  organizationName: import.meta.env.VITE_CASDOOR_ORG_NAME ?? 'org_osintbuddy',
  appName: import.meta.env.VITE_CASDOOR_APP_NAME ?? 'app_osintbuddy',
  redirectPath: "/callback",
  signinPath: "/api/v1/auth/sign-in",
}

// localStorage utilities
export { LS_USER_KEY };

// api utilities
export { BASE_URL, WS_URL, API_PREFIX, CASDOOR_CONFIG };