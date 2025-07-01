import { BASE_URL } from './baseApi';

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterCredentials {
  name: string
  email: string
  password: string
}

export interface RegisterResponse {
  name: string
  email: string
  verified: boolean
  ctime: string
  mtime: string
}

export const authApi = {
  login: async (user: LoginCredentials) => {
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    });

    const data = await response.json()
    if (!data?.token || !response.ok) {
      throw new Error(data.message)
    }
    return data
  },
  register: async (user: RegisterCredentials): Promise<RegisterResponse> => {
    const response = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    });
    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.message || 'Registration failed')
    }
    return data
  },
  logout: async (token: string) => {
    await fetch(`${BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
  },
}

export interface CreateGraphPayload {
  label: string
  description: string
}

export interface GraphResponse {
  id: string
  label: string
  description: string
  createdAt: string
  updatedAt: string
}

export const graphsApi = {
  create: async (payload: CreateGraphPayload, token: string): Promise<GraphResponse> => {
    const response = await fetch(`${BASE_URL}/graphs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.message || 'Failed to create graph')
    }
    return data
  },
}
