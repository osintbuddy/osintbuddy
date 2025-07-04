import { toast } from 'react-toastify';
import { BASE_URL } from './baseApi';

// Base API middleware for authenticated requests
interface ApiOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

export const appRequest = async <T>(
  endpoint: string,
  token: string,
  options: ApiOptions = {}
): Promise<T> => {
  const { method = 'GET', headers = {}, body } = options;
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...headers,
    },
    body,
  });

  const data = await response.json();
  
  if (!response.ok) {
    const errorMsg = data.message ?? `Your request failed! ${response.status}`
    toast.warn(errorMsg)
    throw new Error(errorMsg);
  }
  
  return data;
};

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
      body: JSON.stringify(user),
      headers: {
      'Content-Type': 'application/json',
      }
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
      body: JSON.stringify(user),
      headers: {
      'Content-Type': 'application/json',
      }
    });
    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.message ?? 'Registration failed!')
    }
    return data
  },
  logout: async (token: string) => {
    const response: { message: string } = await appRequest('/auth/logout', token, {
      method: 'GET',
    });
    toast.success(response.message)
  },
}

export interface CreateGraphPayload {
  label: string
  description: string
}

export interface UpdateGraphPayload {
  id: number
  label: string
  description: string
}

export interface UpdateGraphResponse {
  id: number
  label: string
  description: string
  ctime: string
  mtime: string
}

export interface DeleteGraphPayload {
  id: number
}

export interface GraphResponse {
  id: string
  label: string
  description: string
  ctime: string
  mtime: string
}

export interface GraphDetailsResponse {
  graph: {
    id: number
    label: string
    description: string
    ctime: string
    mtime: string
  }
  vertices_count: number
  edges_count: number
  degree2_count: number
}

export interface CreateEntityPayload {
  label: string
  description: string
  author: string
  source: string
}

export interface UpdateEntityPayload {
  id: number
  label: string
  description: string
  author: string
  source: string
}

export interface DeleteEntityPayload {
  id: number
}

export interface EntityResponse {
  id: number
  label: string
  description: string
  author: string
  source: string
  ctime: string
  mtime: string
}

export const entitiesApi = {
  create: async (payload: CreateEntityPayload, token: string): Promise<EntityResponse> => {
    return appRequest<EntityResponse>('/entities/', token, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  list: async (token: string, skip: number = 0, limit: number = 50): Promise<EntityResponse[]> => {
    return appRequest<EntityResponse[]>(`/entities/?skip=${skip}&limit=${limit}`, token);
  },
  getById: async (id: number, token: string): Promise<EntityResponse> => {
    return appRequest<EntityResponse>(`/entities/${id}`, token);
  },
  update: async (payload: UpdateEntityPayload, token: string): Promise<EntityResponse> => {
    return appRequest<EntityResponse>('/entities/', token, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  },
  delete: async (payload: DeleteEntityPayload, token: string): Promise<void> => {
    return appRequest<void>('/entities/', token, {
      method: 'DELETE',
      body: JSON.stringify(payload)
    });
  },
}

export const graphsApi = {
  create: async (payload: CreateGraphPayload, token: string): Promise<GraphResponse> => {
    return appRequest<GraphResponse>('/graphs', token, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  list: async (token: string, skip: number = 0, limit: number = 50): Promise<GraphResponse[]> => {
    return appRequest<GraphResponse[]>(`/graphs/?skip=${skip}&limit=${limit}`, token);
  },
  getById: async (id: string, token: string): Promise<GraphDetailsResponse> => {
    return appRequest<GraphDetailsResponse>(`/graphs/${id}`, token);
  },
  update: async (payload: UpdateGraphPayload, token: string): Promise<UpdateGraphResponse> => {
    return appRequest<UpdateGraphResponse>('/graphs/', token, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  },
  delete: async (payload: DeleteGraphPayload, token: string): Promise<void> => {
    return appRequest<void>('/graphs/', token, {
      method: 'DELETE',
      body: JSON.stringify(payload)
    });
  },
}
