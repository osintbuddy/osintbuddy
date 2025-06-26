
import { BASE_URL } from './baseApi';


export const AuthApi = {
  login: async (user: any) => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    });
    const data = await res.json()
    if (!data?.token) {
      throw data
    }
    return data
  }
}


export const api = {
  auth: AuthApi
}
