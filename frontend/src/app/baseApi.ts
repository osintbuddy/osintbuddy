const API_PREFIX = "/api";
const USER_KEY = "osibUser";

// strip https/http for WS URL
const DOMAIN = import.meta.env.VITE_BASE_URL?.replace('https://', '').replace('http://', '')
const BASE_URL = import.meta.env.VITE_BASE_URL + API_PREFIX;
const WS_URL = DOMAIN + API_PREFIX;

// localStorage keys
export { USER_KEY };

// api utilities
export { BASE_URL, WS_URL, API_PREFIX };