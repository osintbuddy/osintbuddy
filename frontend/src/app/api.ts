import { toast } from 'react-toastify'
import { BASE_URL } from './baseApi'
import { useAuthStore } from './store'

// Base API middleware for authenticated requests
interface ApiOptions {
  method?: string
  headers?: Record<string, string>
  body?: any
}

export interface ApiError {
  kind: string
  message: string
}

export interface Paginate {
  skip: number
  limit: number
}

type AccessToken = `${string}`

export const request = async <T>(
  endpoint: string,
  token: string,
  options: ApiOptions = {}
): Promise<T> => {
  const { method = 'GET', headers = { 'Content-Type': 'application/json' } } =
    options
  let { body } = options
  if (typeof body !== 'string') body = JSON.stringify(body)

  const appRequest = async (authToken: string) => {
    return fetch(`${BASE_URL}${endpoint}`, {
      body,
      method,
      headers: { Authorization: `Bearer ${authToken}`, ...headers },
    })
  }
  let response = await appRequest(token)
  if (response.status >= 400 || response.status < 200) {
    const error = (await response.json()) as ApiError
    if (error.message.toLowerCase().includes('token')) {
      useAuthStore.setState({
        user: null,
        accessToken: null,
        isAuthenticated: false,
      })
      toast.error('Session expired. Please login again.')
      throw error
    } else {
      toast.error(error.message)
      throw error
    }
  }

  const data = await response.json()
  return data
}

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
  login: async (user: LoginCredentials): Promise<AccessToken> => {
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify(user),
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      throw (await response.json()) as ApiError
    }
    const data = await response.json()
    return data
  },
  register: async (user: RegisterCredentials): Promise<Registered> => {
    const response = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      body: JSON.stringify(user),
      headers: { 'Content-Type': 'application/json' },
    })
    if (!response.ok) {
      throw (await response.json()) as ApiError
    }
    const data = await response.json()
    return data
  },
  logout: async (token: AccessToken) => {
    const response: { message: string } = await request('/auth/logout', token, {
      method: 'POST',
      body: JSON.stringify(token),
    })
    toast.success(response.message)
  },
  refresh: async (refreshToken: string): Promise<AccessToken> => {
    const response = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${refreshToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw (await response.json()) as ApiError
    }
    const data = await response.json()
    return data
  },
}

export interface CreateEntityPayload {
  label: string
  description: string
  author: string
  source: string
}

export interface UpdateEntityPayload {
  id: string
  label: string
  description: string
  author: string
  source: string
}

export interface DeleteEntityPayload {
  id: number | string
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

export interface AttachmentItem {
  attachment_id: string
  filename: string
  media_type: string
  size: number
  created_at: string
}

export interface PluginEntity {
  label: string
  description: string
  author?: string
  [key: string]: any
}

export interface EntityWithTransforms {
  label: string
  description: string
  author?: string
  blueprint?: any
  transforms?: any[]
  [key: string]: any
}

export interface Plugins {
  entities: Entity[]
  favorites: string[]
}

export interface PluginsFull {
  entities: any[]
  favorites: string[]
}

export const entitiesApi = {
  create: async (
    payload: CreateEntityPayload,
    token: AccessToken
  ): Promise<Entity> => {
    return request<Entity>('/entities', token, {
      method: 'POST',
      body: payload,
    })
  },
  list: async (
    payload: Paginate,
    token: AccessToken
  ): Promise<ListEntitiesResponse> => {
    const { skip, limit } = payload
    return request<ListEntitiesResponse>(
      `/entities?skip=${skip}&limit=${limit}`,
      token,
      {}
    )
  },
  getById: async (id: string, token: AccessToken): Promise<Entity> => {
    return request<Entity>(`/entities/${id}`, token, {})
  },
  update: async (
    payload: UpdateEntityPayload,
    token: AccessToken
  ): Promise<Entity> => {
    return request<Entity>('/entities', token, {
      method: 'PATCH',
      body: payload,
    })
  },
  delete: async (
    payload: DeleteEntityPayload,
    token: AccessToken
  ): Promise<void> => {
    return request<void>('/entities', token, {
      method: 'DELETE',
      body: payload,
    })
  },
  favorite: async (
    payload: FavoriteEntityPayload,
    token: AccessToken
  ): Promise<void> => {
    return request<void>('/entities/favorite', token, {
      method: 'POST',
      body: payload,
    })
  },
  listAttachments: async (
    graph_id: string,
    entity_id: string,
    token: AccessToken
  ): Promise<AttachmentItem[]> => {
    return request<AttachmentItem[]>(
      `/entities/attachments?graph_id=${encodeURIComponent(graph_id)}&entity_id=${encodeURIComponent(entity_id)}`,
      token,
      {}
    )
  },
  // New plugin-related endpoints
  getPluginEntities: async (token: AccessToken): Promise<Plugins> => {
    return request<Plugins>('/entity', token, {})
  },
  // Full plugin entities including blueprint and transforms (via ob entities json)
  getPluginEntitiesFull: async (token: AccessToken): Promise<PluginsFull> => {
    return request<PluginsFull>('/entity/plugins/all', token, {})
  },
  getEntityDetails: async (
    hid: string,
    token: AccessToken
  ): Promise<EntityWithTransforms> => {
    return request<EntityWithTransforms>(`/entity/details/${hid}`, token, {})
  },
  getEntityTransforms: async (
    label: string,
    token: AccessToken
  ): Promise<any[]> => {
    return request<any[]>(
      `/entity/plugins/transform/?label=${encodeURIComponent(label)}`,
      token,
      {}
    )
  },
}

export interface CreateGraphPayload {
  label: string
  description: string
}

export interface UpdateGraphPayload {
  id: string
  label: string
  description: string
}

export interface DeleteGraphPayload {
  id: string
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
  graph: Graph
  vertices_count: number
  edges_count: number
  degree2_count: number
}

// Case Activity
export interface CaseActivityItem {
  seq: number
  category: string
  event_type: string
  payload: any
  version: number
  valid_from: string
  valid_to: string | null
  recorded_at: string
  actor_id?: number | null
  actor_name?: string | null
}

export interface CaseActivityPage {
  events: CaseActivityItem[]
}

export const graphsApi = {
  create: async (
    payload: CreateGraphPayload,
    token: AccessToken
  ): Promise<Graph> => {
    return request<Graph>('/graphs', token, {
      method: 'POST',
      body: payload,
    })
  },
  list: async (
    payload: Paginate,
    token: AccessToken
  ): Promise<ListGraphsResponse> => {
    const { skip, limit } = payload
    return request<ListGraphsResponse>(
      `/graphs?skip=${skip}&limit=${limit}`,
      token,
      {}
    )
  },
  getById: async (id: string, token: AccessToken): Promise<GraphDetails> => {
    return request<GraphDetails>(`/graphs/${id}`, token, {})
  },
  update: async (
    payload: UpdateGraphPayload,
    token: AccessToken
  ): Promise<Graph> => {
    return request<Graph>('/graphs', token, {
      method: 'PATCH',
      body: payload,
    })
  },
  delete: async (
    payload: DeleteGraphPayload,
    token: AccessToken
  ): Promise<void> => {
    return request<void>('/graphs', token, {
      method: 'DELETE',
      body: payload,
    })
  },
  favorite: async (
    payload: FavoriteGraphPayload,
    token: AccessToken
  ): Promise<void> => {
    return request<void>('/graphs/favorite', token, {
      method: 'POST',
      body: payload,
    })
  },
}

export const casesApi = {
  chord: async (id: string, token: AccessToken): Promise<ChordResponse> => {
    return request<ChordResponse>(`/cases/${id}/chord`, token, {})
  },
  activity: async (
    id: string,
    payload: Paginate,
    token: AccessToken
  ): Promise<CaseActivityPage> => {
    const { skip, limit } = payload
    return request<CaseActivityPage>(
      `/cases/${id}/activity?skip=${skip}&limit=${limit}`,
      token,
      {}
    )
  },
  activitySummary: async (
    id: string,
    days: number,
    token: AccessToken
  ): Promise<CaseActivitySummary> => {
    return request<CaseActivitySummary>(
      `/cases/${id}/activity/summary?days=${days}`,
      token,
      {}
    )
  },
  stats: async (id: string, token: AccessToken): Promise<CaseStats> => {
    return request<CaseStats>(`/cases/${id}/stats`, token, {})
  },
}

export interface CaseStats {
  entities_count: number
  edges_count: number
  events_count: number
}

// Activity summary for heatmap
export interface CaseActivityBucket {
  date: string
  count: number
}

export interface CaseActivitySummary {
  start: string
  end: string
  buckets: CaseActivityBucket[]
}

// Chord diagram response
export interface ChordNode {
  id: string
  label: string
  color: string
}

export interface ChordLink {
  source: string
  target: string
  value: number
}

export interface ChordResponse {
  nodes: ChordNode[]
  links: ChordLink[]
}
