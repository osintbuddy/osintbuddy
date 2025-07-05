import { toast } from 'react-toastify';
import { BASE_URL } from './baseApi';

// Base API middleware for authenticated requests
interface ApiOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
}

export interface ApiError {
  kind: string
  message: string
}

export interface Paginate {
  skip: number
  limit: number
}

type TokenTypes =  'bearer'

export interface Tokens {
  access_token: string
  refresh_token: string
  token_type: TokenTypes
}

export const request = async <T>(
  endpoint: string,
  token: string,
  options: ApiOptions = {},
  onExp?: () => void
): Promise<T> => {
  const { method = 'GET', headers = { 'Content-Type': 'application/json' } } = options;
  let { body } = options;
  if (typeof body !== "string") body = JSON.stringify(body);
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    body,
    method,
    headers: { 'Authorization': `Bearer ${token}`, ...headers },
  });
  if (!response.ok) {
    const error = await response.json() as ApiError;
    // TODO: handle refresh logic
    if (error.message.toLowerCase().includes("token")) {
      toast.error("Includes token!! REFRESHING")
    }
    toast.warn(error.message);
    if (onExp) onExp();
    throw error;
  }
  const data = await response.json();
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

export interface Registered {
  name: string
  email: string
  verified: boolean
  ctime: string
  mtime: string
}


export const authApi = {
  login: async (user: LoginCredentials): Promise<Tokens> => {
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify(user),
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw await response.json() as ApiError;
    }
    const data = await response.json()
    return data
  },
  register: async (user: RegisterCredentials): Promise<Registered> => {
    const response = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      body: JSON.stringify(user),
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
      throw await response.json() as ApiError;
    }
    const data = await response.json()
    return data
  },
  logout: async (tokens: Tokens) => {
    const response: { message: string } = await request('/auth/logout', tokens.access_token, {
      method: 'POST',
      body: JSON.stringify(tokens)
    });
    toast.success(response.message)
  },
  refresh: async (refreshToken: string): Promise<Tokens> => {
    const response = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${refreshToken}`,
        'Content-Type': 'application/json' 
      }
    });

    if (!response.ok) {
      throw await response.json() as ApiError;
    }
    const data = await response.json()
    return data as Tokens
  },
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

export interface FavoriteEntityPayload {
  entity_id: string
  is_favorite: boolean
}

export interface Entity {
  id: string
  label: string
  description: string
  author: string
  source: string
  ctime: string
  mtime: string
}

export interface ListEntitiesResponse {
  entities: Entity[]
  favorites: string[]
}

export const entitiesApi = {
  create: async (
    payload: CreateEntityPayload,
    token: Tokens['access_token'],
    onExp?: () => void
  ): Promise<Entity> => {
    return request<Entity>('/entities/', token, {
      method: 'POST',
      body: JSON.stringify(payload)
    }, onExp);
  },
  list: async (
    token: Tokens['access_token'], 
    payload: Paginate,
    onExp?: () => void
  ): Promise<ListEntitiesResponse> => {
    const { skip, limit } = payload;
    return request<ListEntitiesResponse>(`/entities/?skip=${skip}&limit=${limit}`, token, {}, onExp);
  },
  getById: async (
    id: string, 
    token: Tokens['access_token'], 
    onExp?: () => void
  ): Promise<Entity> => {
    return request<Entity>(`/entities/${id}`, token, {}, onExp);
  },
  update: async (
    payload: UpdateEntityPayload, 
    token: Tokens['access_token'], 
    onExp?: () => void
  ): Promise<Entity> => {
    return request<Entity>('/entities/', token, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    }, onExp);
  },
  delete: async (
    payload: DeleteEntityPayload, 
    token:  Tokens['access_token'], 
    onExp?: () => void
  ): Promise<void> => {
    return request<void>('/entities/', token, {
      method: 'DELETE',
      body: JSON.stringify(payload)
    }, onExp);
  },
  favorite: async (
    payload: FavoriteEntityPayload, 
    token: Tokens['access_token'], 
    onExp?: () => void
  ): Promise<void> => {
    return request<void>('/entities/favorite', token, {
      method: 'POST',
      body: JSON.stringify(payload)
    }, onExp);
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

export interface DeleteGraphPayload {
  id: number
}

export interface FavoriteGraphPayload {
  graph_id: string
  is_favorite: boolean
}

export interface Graph {
  id: string
  label: string
  description: string
  ctime: string
  mtime: string
}

export interface ListGraphsResponse {
  graphs: Graph[]
  favorites: string[]
}

export interface GraphDetails {
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

export const graphsApi = {
  create: async (
    payload: CreateGraphPayload, 
    token: Tokens['access_token'], 
    onExp?: () => void
  ): Promise<Graph> => {
    return request<Graph>('/graphs', token, {
      method: 'POST',
      body: JSON.stringify(payload)
    }, onExp);
  },
  list: async (
    payload: Paginate,
    token: Tokens['access_token'],
    onExp?: () => void
  ): Promise<ListGraphsResponse> => {
    const { skip, limit } = payload;
    return request<ListGraphsResponse>(`/graphs/?skip=${skip}&limit=${limit}`, token, {}, onExp);
  },
  getById: async (
    id: string, 
    token: Tokens['access_token'], 
    onExp?: () => void
  ): Promise<GraphDetails> => {
    return request<GraphDetails>(`/graphs/${id}`, token, {}, onExp);
  },
  update: async (
    payload: UpdateGraphPayload, 
    token: Tokens['access_token'], 
    onExp?: () => void
  ): Promise<Graph> => {
    return request<Graph>('/graphs/', token, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    }, onExp);
  },
  delete: async (
    payload: DeleteGraphPayload, 
    token: Tokens['access_token'], 
    onExp?: () => void
  ): Promise<void> => {
    return request<void>('/graphs/', token, {
      method: 'DELETE',
      body: JSON.stringify(payload)
    }, onExp);
  },
  favorite: async (
    payload: FavoriteGraphPayload, 
    token: Tokens['access_token'], 
    onExp?: () => void
  ): Promise<void> => {
    return request<void>('/graphs/favorite', token, {
      method: 'POST',
      body: JSON.stringify(payload)
    }, onExp);
  },

}
