import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  graphsApi,
  Graph,
  UpdateGraphPayload,
  DeleteGraphPayload,
  FavoriteGraphPayload,
  entitiesApi,
  Entity,
  CreateEntityPayload,
  UpdateEntityPayload,
  DeleteEntityPayload,
  FavoriteEntityPayload,
  authApi,
  LoginCredentials,
  RegisterCredentials,
  Registered,
  Paginate,
  CreateGraphPayload,
} from './api'
import { jwtParse } from './utilities'
import {
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  Node,
  Edge,
  Connection,
  NodeChange,
  EdgeChange,
  MarkerType,
} from '@xyflow/react'

// Auth store
type UserRoles = 'user' | 'admin'
export interface User {
  email: string
  ctime: string
  exp: number
  iat: number
  name: string
  roles: UserRoles
  sub: number
}

interface AuthState {
  user: User | null
  access_token: string | null
  refresh_token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  isRegistering: boolean
  error: string | null
  login: (credentials: LoginCredentials) => Promise<void>
  register: (credentials: RegisterCredentials) => Promise<Registered>
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      access_token: null,
      refresh_token: null,
      isAuthenticated: false,
      isLoading: false,
      isRegistering: false,
      error: null,
      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true, error: null })
        try {
          const response = await authApi.login(credentials)
          const { access_token, refresh_token } = response
          const user = jwtParse(access_token)
          set({
            user,
            access_token,
            refresh_token,
            isAuthenticated: true,
            isLoading: false,
          })
        } catch (error: any) {
          set({
            error: error.message,
            isLoading: false,
          })
          throw error
        }
      },
      register: async (credentials: RegisterCredentials) => {
        set({ isRegistering: true, error: null })
        try {
          const registeredUser = await authApi.register(credentials)
          set({ isRegistering: false })
          return registeredUser
        } catch (error) {
          set({
            error: error.message,
            isRegistering: false,
          })
          throw error
        }
      },
      logout: async () => {
        set({ isLoading: true, error: null })
        await authApi
          .logout({
            access_token: get().access_token as string,
            refresh_token: get().refresh_token as string,
            token_type: 'bearer',
          })
          .then(() =>
            set({
              user: null,
              refresh_token: null,
              access_token: null,
              isAuthenticated: false,
              isLoading: false,
            })
          )
          .catch((err) => {
            set({
              user: null,
              refresh_token: null,
              access_token: null,
              isAuthenticated: false,
              isLoading: false,
              error: err.message,
            })
          })
      },
    }),
    {
      name: 'auth',
      // Don't persist loading states and errors
      partialize: (state) => ({
        user: state.user,
        access_token: state.access_token,
        refresh_token: state.refresh_token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)

interface GraphState {
  graph: Graph | null
  vertices_count: number | null
  edges_count: number | null
  degree2_count: number | null
  isLoading: boolean
  isError: boolean
  error: string | null
  getGraph: (id: string) => void
}

export const useGraphStore = create<GraphState>()((set, get) => ({
  graph: null,
  vertices_count: null,
  edges_count: null,
  degree2_count: null,
  isLoading: true,
  isError: false,
  error: null,
  getGraph: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      const token = useAuthStore.getState().access_token as string
      const data = await graphsApi.getById(id, token)
      set({ ...data, isLoading: false, isError: false, error: null })
    } catch (error) {
      set({ error: error.message, isLoading: false, graph: null })
    }
  },
}))

// Graphs store
interface GraphsState {
  graphs: Graph[]
  favorites: string[]
  isLoading: boolean
  isCreating: boolean
  isUpdating: boolean
  isDeleting: boolean
  error: string | null
  fetchGraphs: (payload: Paginate) => Promise<void>
  createGraph: (payload: CreateGraphPayload) => Promise<Graph>
  updateGraph: (payload: UpdateGraphPayload) => Promise<Graph>
  deleteGraph: (payload: DeleteGraphPayload) => Promise<void>
  favoriteGraph: (payload: FavoriteGraphPayload) => Promise<void>
  unfavoriteGraph: (payload: FavoriteGraphPayload) => Promise<void>
}

export const useGraphsStore = create<GraphsState>()((set, get) => ({
  graphs: [],
  favorites: [],
  isLoading: false,
  isCreating: false,
  isUpdating: false,
  isDeleting: false,
  error: null,
  fetchGraphs: async (payload: Paginate) => {
    set({ isLoading: true, error: null })
    try {
      const token = useAuthStore.getState().access_token as string
      const { graphs, favorites } = await graphsApi.list(payload, token)
      set({ graphs, favorites, isLoading: false })
    } catch (error) {
      set({ error: error.message, isLoading: false })
    }
  },

  createGraph: async (payload: CreateGraphPayload) => {
    set({ isCreating: true, error: null })
    try {
      const token = useAuthStore.getState().access_token as string
      const newGraph = await graphsApi.create(payload, token)

      // Add the new graph to the graphs list
      const currentGraphs = get().graphs
      set({ graphs: [...currentGraphs, newGraph], isCreating: false })
      return newGraph
    } catch (error) {
      set({ error: error.message, isCreating: false })
      throw error
    }
  },
  updateGraph: async (payload: UpdateGraphPayload) => {
    set({ isUpdating: true, error: null })
    try {
      const token = useAuthStore.getState().access_token as string
      const updatedGraph = await graphsApi.update(payload, token)

      // Update the graphs list if the updated graph is in it
      const currentGraphs = get().graphs
      const updatedGraphs = currentGraphs.map((graph) =>
        graph.id === updatedGraph.id.toString()
          ? {
              ...graph,
              label: updatedGraph.label,
              description: updatedGraph.description,
            }
          : graph
      )

      set({ graphs: updatedGraphs, isUpdating: false })

      return updatedGraph
    } catch (error) {
      set({ error: error.message, isUpdating: false })
      throw error
    }
  },
  deleteGraph: async (payload: DeleteGraphPayload) => {
    set({ isDeleting: true, error: null })
    try {
      const token = useAuthStore.getState().access_token as string
      await graphsApi.delete(payload, token)

      // Remove the deleted graph from the graphs list
      const currentGraphs = get().graphs
      const filteredGraphs = currentGraphs.filter(
        (graph) => graph.id !== payload.id.toString()
      )

      set({ graphs: filteredGraphs, isDeleting: false })
    } catch (error) {
      set({ error: error.message, isDeleting: false })
      throw error
    }
  },
  favoriteGraph: async (payload: FavoriteGraphPayload) => {
    try {
      const token = useAuthStore.getState().access_token as string
      await graphsApi.favorite({ ...payload, is_favorite: true }, token)
      const currentFavorites = get().favorites
      if (!currentFavorites.includes(payload.graph_id)) {
        set({ favorites: [...currentFavorites, payload.graph_id] })
      }
    } catch (error) {
      set({ error: error.message })
      throw error
    }
  },
  unfavoriteGraph: async (payload: FavoriteGraphPayload) => {
    try {
      const token = useAuthStore.getState().access_token as string
      await graphsApi.favorite({ ...payload, is_favorite: false }, token)
      const currentFavorites = get().favorites
      set({
        favorites: currentFavorites.filter((id) => id !== payload.graph_id),
      })
    } catch (error) {
      set({ error: error.message })
      throw error
    }
  },
}))

interface EntityState {
  entity: Entity | null
  isLoading: boolean
  error: string | null
  getEntity: (id: string) => void
}

export const useEntityStore = create<EntityState>()((set, get) => ({
  entity: null,
  isLoading: true,
  error: null,
  getEntity: async (id: string) => {
    set({ isLoading: true })
    try {
      const token = useAuthStore.getState().access_token as string
      const entity = await entitiesApi.getById(id, token)
      set({ entity, isLoading: false })
    } catch (error) {
      set({ error: error.message, isLoading: false, entity: null })
    }
  },
}))
interface Transform {
  label: string
  icon: string
}

interface Transforms {
  [any: string]: Transform[]
}

// TODO: type frfr ong
interface Blueprint {
  [any: string]: {
    [any: string]: any
    value: string
  }
}

// Entities store
interface EntitiesState {
  entities: Entity[]
  favorites: string[]
  plugins: Entity[]
  blueprints: Blueprint[]
  currentEntity: Entity | null
  transforms: Transforms
  isLoading: boolean
  isLoadingEntity: boolean
  isLoadingPlugins: boolean
  isLoadingTransforms: boolean
  isCreating: boolean
  isUpdating: boolean
  isDeleting: boolean
  error: string | null
  entityError: string | null
  fetchEntities: (payload: Paginate) => Promise<void>
  createEntity: (payload: CreateEntityPayload) => Promise<Entity>
  updateEntity: (payload: UpdateEntityPayload) => Promise<Entity>
  deleteEntity: (payload: DeleteEntityPayload) => Promise<void>
  favoriteEntity: (payload: FavoriteEntityPayload) => Promise<void>
  unfavoriteEntity: (payload: FavoriteEntityPayload) => Promise<void>
  setPlugins: (payload: any) => Promise<void>
  setBlueprints: (payload: any) => Promise<void>
  getBlueprint: (label: string) => any
  fetchTransforms: (label: string) => Promise<void>
  clearTransforms: () => Promise<void>
}
export const useEntitiesStore = create<EntitiesState>()((set, get) => ({
  entities: [],
  favorites: [],
  blueprints: [],
  plugins: [],
  currentEntity: null,
  transforms: {},
  isLoading: false,
  isLoadingEntity: false,
  isLoadingPlugins: false,
  isLoadingTransforms: false,
  isCreating: false,
  isUpdating: false,
  isDeleting: false,
  error: null,
  entityError: null,
  fetchEntities: async (payload: Paginate) => {
    set({ isLoading: true, error: null })
    try {
      const token = useAuthStore.getState().access_token as string
      const response = await entitiesApi.list(payload, token)
      set({
        entities: response.entities,
        favorites: response.favorites,
        isLoading: false,
      })
    } catch (error) {
      set({ error: error.message, isLoading: false })
    }
  },
  setPlugins: async (plugins) => set({ plugins }),
  setBlueprints: async (blueprints) => set({ blueprints }),
  getBlueprint: (label) => ({ ...get().blueprints[label] }),
  fetchTransforms: async (label: string) => {
    const existingTransforms = get().transforms
    if (!existingTransforms[label]) {
      set({ isLoadingTransforms: true, error: null })
      try {
        const token = useAuthStore.getState().access_token as string
        const response = await entitiesApi.getEntityTransforms(label, token)
        set({
          transforms: {
            ...existingTransforms,
            [label]: response,
          },
          isLoadingTransforms: false,
        })
      } catch (error) {
        set({
          error: error.message,
          isLoadingTransforms: false,
        })
      }
    }
  },
  clearTransforms: async () => {
    set({ transforms: {} })
  },
  createEntity: async (payload: CreateEntityPayload) => {
    set({ isCreating: true, error: null })
    try {
      const token = useAuthStore.getState().access_token as string
      const newEntity = await entitiesApi.create(payload, token)

      // Add the new entity to the entities list
      const currentEntities = get().entities
      set({ entities: [...currentEntities, newEntity], isCreating: false })
      return newEntity
    } catch (error) {
      set({ error: error.message, isCreating: false })
      throw error
    }
  },
  updateEntity: async (payload: UpdateEntityPayload) => {
    set({ isUpdating: true, error: null })
    try {
      const token = useAuthStore.getState().access_token as string
      const updatedEntity = await entitiesApi.update(payload, token)

      // Update the entities list if the updated entity is in it
      const currentEntities = get().entities
      const updatedEntities = currentEntities.map((entity) =>
        entity.id === updatedEntity.id ? updatedEntity : entity
      )
      set({
        entities: updatedEntities,
        currentEntity: updatedEntity,
        isUpdating: false,
      })
      return updatedEntity
    } catch (error) {
      set({ error: error.message, isUpdating: false })
      throw error
    }
  },
  deleteEntity: async ({ id }: DeleteEntityPayload) => {
    set({ isDeleting: true, error: null })
    try {
      const token = useAuthStore.getState().access_token as string
      await entitiesApi.delete({ id }, token)

      // Remove the deleted entity from the entities list
      const currentEntities = get().entities
      const filteredEntities = currentEntities.filter(
        (entity) => entity.id !== id
      )
      // Clear currentEntity if it's the one being deleted
      const currentEntity = get().currentEntity
      const updatedCurrentEntity =
        currentEntity?.id === id ? null : currentEntity
      set({
        entities: filteredEntities,
        currentEntity: updatedCurrentEntity,
        isDeleting: false,
      })
    } catch (error) {
      set({ error: error.message, isDeleting: false })
      throw error
    }
  },
  favoriteEntity: async (payload: FavoriteEntityPayload) => {
    try {
      const token = useAuthStore.getState().access_token as string
      await entitiesApi.favorite({ ...payload, is_favorite: true }, token)
      const currentFavorites = get().favorites
      if (!currentFavorites.includes(payload.entity_id)) {
        set({ favorites: [...currentFavorites, payload.entity_id] })
      }
    } catch (error) {
      set({ error: error.message })
      throw error
    }
  },
  unfavoriteEntity: async (payload: FavoriteEntityPayload) => {
    try {
      const token = useAuthStore.getState().access_token as string
      await entitiesApi.favorite({ ...payload, is_favorite: false }, token)
      const currentFavorites = get().favorites
      set({
        favorites: currentFavorites.filter((id) => id !== payload.entity_id),
      })
    } catch (error) {
      set({ error: error.message })
      throw error
    }
  },
}))

type LoaderType = 'screen' | 'bar'

// Global loader store
interface LoaderState {
  isLoading: boolean
  type: LoaderType
  setIsLoading: (isLoading: boolean) => void
}

export const useLoaderStore = create<LoaderState>()((set) => ({
  isLoading: false,
  type: 'screen',
  setIsLoading: (isLoading: boolean, type: LoaderType = 'bar') =>
    set({ isLoading, type }),
}))

// App settings store
type SettingsPage = 'account' | 'plugins'
export interface SettingsState {
  showSidebar: boolean
  settingsPage: SettingsPage
  toggleSidebar: () => void
  setSidebar: (value?: boolean) => void
}

export const useAppStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      showSidebar: true,
      settingsPage: 'account',
      toggleSidebar: () => set({ showSidebar: !get().showSidebar }),
      setSidebar: (value) => set({ showSidebar: value }),
    }),
    {
      name: 'settings',
    }
  )
)

export type PositionMode = 'manual' | 'force' | 'elk' | 'tree' | 'right tree'

export interface FlowState {
  nodes: Node[]
  edges: Edge[]
  positionMode: PositionMode
  handleEntityChange: (changes: NodeChange[]) => void
  handleRelationshipsChange: (changes: EdgeChange[]) => void
  onRelationshipConnect: (connection: Connection) => void
  setEntities: (nodes: Node[]) => void
  setRelationships: (edges: Edge[]) => void
  addEntity: (node: Node) => void
  addEntities: (node: Node[]) => void
  addRelationship: (edge: Edge) => void
  addRelationships: (edge: Edge[]) => void
  removeRelationship: (id: Edge['id']) => void
  removeEntity: (nodeId: string) => void
  updateEntity: (nodeId: string, updates: Partial<Node>) => void
  clearGraph: () => void
  setPositionMode: (mode: PositionMode) => void
  setEntityEdit: (nodeId: string) => void
  setEntityType: (nodeId: string, type: string) => void
  setEntityView: (nodeId: string) => void
  updateRelationship: (id: string, edgeUpdate: Partial<Edge>) => void
  removeTempRelationshipId: (fromId: string, toId: string) => void
}

// Initial empty state for graph store
const initialNodes: Node[] = []
const initialEdges: Edge[] = []
const markerEnd = {
  type: MarkerType.ArrowClosed,
  color: '#373c83',
  width: 16,
  height: 16,
}

export const useFlowStore = create<FlowState>((set, get) => ({
  nodes: initialNodes,
  edges: initialEdges,
  positionMode: 'manual',
  setPositionMode: (mode: PositionMode) => set({ positionMode: mode }),
  clearGraph: () => set({ nodes: [], edges: [] }),
  // start (relationship/reactflow edge) logic
  setRelationships: (edges) => set({ edges }),
  addRelationship: (edge) => set({ edges: [...get().edges, edge] }),
  addRelationships: (edges) => set({ edges: [...get().edges, ...edges] }),
  removeTempRelationshipId: (fromId: string, toId: string) =>
    set({
      // remap reactflow generated edge id -> authoritative UUID from server
      edges: get().edges.map((e) =>
        e.id === fromId ? { ...e, id: toId, type: 'sfloat', markerEnd } : e
      ),
    }),
  updateRelationship: (id, update) =>
    set({
      edges: get().edges.map((edge) => {
        if (edge.id === id) {
          return {
            ...edge,
            ...update,
            id: edge.id,
          }
        }
        return edge
      }),
    }),
  removeRelationship: (id) =>
    set({ edges: get().edges.filter((e) => e.id !== id) }),
  handleRelationshipsChange: (changes) =>
    set({ edges: applyEdgeChanges(changes, get().edges) }),
  onRelationshipConnect: (connection) =>
    set({
      edges: addEdge(
        {
          ...connection,
          type: 'sfloat',
          markerEnd,
        },
        get().edges
      ),
    }),
  // start (entity/reactflow node) logic
  setEntities: (nodes) => set({ nodes }),
  addEntity: (node) => set({ nodes: [...get().nodes, node] }),
  addEntities: (nodes) => set({ nodes: [...get().nodes, ...nodes] }),
  updateEntity: (nodeId, updates) =>
    set({
      nodes: get().nodes.map((node) =>
        node.id === nodeId ? { ...node, ...updates } : node
      ),
    }),
  removeEntity: (nodeId) =>
    set({
      nodes: get().nodes.filter((node) => node.id !== nodeId),
      edges: get().edges.filter(
        (edge) => edge.source !== nodeId && edge.target !== nodeId
      ),
    }),
  handleEntityChange: (changes) =>
    set({ nodes: applyNodeChanges(changes, get().nodes) }),
  // node display type logic (https://reactflow.dev/examples/nodes/custom-node)
  setEntityType: (nodeId, type = 'view') =>
    set({
      nodes: get().nodes.map((node) =>
        node.id === nodeId ? { ...node, type } : node
      ),
    }),
  setEntityEdit: (nodeId) =>
    set({
      nodes: get().nodes.map((node) =>
        node.id === nodeId ? { ...node, type: 'edit' } : node
      ),
    }),
  setEntityView: (nodeId) =>
    set({
      nodes: get().nodes.map((node) =>
        node.id === nodeId ? { ...node, type: 'view' } : node
      ),
    }),
}))

// Attachments panel store
interface AttachmentTab {
  entityId: string
  title: string
}

interface AttachmentsState {
  open: boolean
  tabs: AttachmentTab[]
  active?: string
  openPanel: () => void
  closePanel: () => void
  addTab: (entityId: string, title: string) => void
  removeTab: (entityId: string) => void
  setActive: (entityId: string) => void
}

export const useAttachmentsStore = create<AttachmentsState>((set, get) => ({
  open: false,
  tabs: [],
  active: undefined,
  openPanel: () => set({ open: true }),
  closePanel: () => set({ open: false }),
  addTab: (entityId, title) => {
    const tabs = get().tabs
    if (!tabs.find((t) => t.entityId === entityId)) {
      set({ tabs: [...tabs, { entityId, title }] })
    }
    set({ active: entityId, open: true })
  },
  removeTab: (entityId) => {
    const tabs = get().tabs.filter((t) => t.entityId !== entityId)
    const wasActive = get().active === entityId
    set({ tabs })
    if (wasActive) {
      set({ active: tabs.length ? tabs[tabs.length - 1].entityId : undefined })
    }
    if (tabs.length === 0) set({ open: false })
  },
  setActive: (entityId) => set({ active: entityId, open: true }),
}))

// PDF viewer panel store
interface PdfViewerState {
  open: boolean
  attachmentId?: string
  filename?: string
  page: number
  numPages?: number
  openViewer: (attachmentId: string, filename?: string) => void
  closeViewer: () => void
  setPage: (page: number) => void
  setNumPages: (n: number) => void
}

interface PdfTab { attachmentId: string; filename?: string; page: number; numPages?: number }

interface PdfViewerTabsState {
  open: boolean
  tabs: PdfTab[]
  active?: string
  openViewer: (attachmentId: string, filename?: string) => void
  closeTab: (attachmentId: string) => void
  closeViewer: () => void
  setActive: (attachmentId: string) => void
  setPage: (attachmentId: string, page: number) => void
  setNumPages: (attachmentId: string, n: number) => void
}

export const usePdfViewerStore = create<PdfViewerTabsState>((set, get) => ({
  open: false,
  tabs: [],
  active: undefined,
  openViewer: (attachmentId, filename) => {
    const tabs = get().tabs
    if (!tabs.find((t) => t.attachmentId === attachmentId)) {
      set({ tabs: [...tabs, { attachmentId, filename, page: 1 }] })
    }
    set({ open: true, active: attachmentId })
  },
  closeTab: (attachmentId) => {
    const next = get().tabs.filter((t) => t.attachmentId !== attachmentId)
    const wasActive = get().active === attachmentId
    set({ tabs: next })
    if (wasActive) {
      set({ active: next.length ? next[next.length - 1].attachmentId : undefined })
    }
    if (next.length === 0) set({ open: false })
  },
  closeViewer: () => set({ open: false, tabs: [], active: undefined }),
  setActive: (attachmentId) => set({ active: attachmentId }),
  setPage: (attachmentId, page) =>
    set({
      tabs: get().tabs.map((t) => (t.attachmentId === attachmentId ? { ...t, page } : t)),
    }),
  setNumPages: (attachmentId, n) =>
    set({
      tabs: get().tabs.map((t) => (t.attachmentId === attachmentId ? { ...t, numPages: n } : t)),
    }),
}))

// Audio viewer panel store
interface AudioTab { attachmentId: string; filename?: string }
interface AudioViewerTabsState {
  open: boolean
  tabs: AudioTab[]
  active?: string
  openViewer: (attachmentId: string, filename?: string) => void
  closeTab: (attachmentId: string) => void
  closeViewer: () => void
  setActive: (attachmentId: string) => void
}

export const useAudioViewerStore = create<AudioViewerTabsState>((set, get) => ({
  open: false,
  tabs: [],
  active: undefined,
  openViewer: (attachmentId, filename) => {
    const tabs = get().tabs
    if (!tabs.find((t) => t.attachmentId === attachmentId)) {
      set({ tabs: [...tabs, { attachmentId, filename }] })
    }
    set({ open: true, active: attachmentId })
  },
  closeTab: (attachmentId) => {
    const next = get().tabs.filter((t) => t.attachmentId !== attachmentId)
    const wasActive = get().active === attachmentId
    set({ tabs: next })
    if (wasActive) {
      set({ active: next.length ? next[next.length - 1].attachmentId : undefined })
    }
    if (next.length === 0) set({ open: false })
  },
  closeViewer: () => set({ open: false, tabs: [], active: undefined }),
  setActive: (attachmentId) => set({ active: attachmentId }),
}))

// Properties panel store (blank overlay panel)
interface PropertiesTab { entityId: string; title: string; data?: any }
interface PropertiesState {
  open: boolean
  tabs: PropertiesTab[]
  active?: string
  openWith: (entityId: string, title: string, data?: any) => void
  closeTab: (entityId: string) => void
  closePanel: () => void
  setActive: (entityId: string) => void
  setData: (entityId: string, data: any) => void
}

export const usePropertiesStore = create<PropertiesState>((set, get) => ({
  open: false,
  tabs: [],
  active: undefined,
  openWith: (entityId, title, data) => {
    const tabs = get().tabs
    if (!tabs.find((t) => t.entityId === entityId)) {
      set({ tabs: [...tabs, { entityId, title, data }] })
    }
    set({ open: true, active: entityId })
  },
  closeTab: (entityId) => {
    const next = get().tabs.filter((t) => t.entityId !== entityId)
    const wasActive = get().active === entityId
    set({ tabs: next })
    if (wasActive) {
      set({ active: next.length ? next[next.length - 1].entityId : undefined })
    }
    if (next.length === 0) set({ open: false })
  },
  closePanel: () => set({ open: false }),
  setActive: (entityId) => set({ active: entityId, open: true }),
  setData: (entityId, data) =>
    set({
      tabs: get().tabs.map((t) => (t.entityId === entityId ? { ...t, data } : t)),
    }),
}))
