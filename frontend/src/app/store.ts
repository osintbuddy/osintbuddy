import { create } from 'zustand';
import { persist } from 'zustand/middleware'
import { graphsApi, Graph,UpdateGraphPayload, DeleteGraphPayload, FavoriteGraphPayload, entitiesApi, Entity, CreateEntityPayload, UpdateEntityPayload, DeleteEntityPayload, FavoriteEntityPayload, authApi, LoginCredentials, RegisterCredentials, Registered,  Paginate, CreateGraphPayload, ApiError, PluginEntity } from './api';
import { jwtParse } from './utilities';
import { 
  addEdge, 
  applyNodeChanges, 
  applyEdgeChanges,
  Node,
  Edge,
  Connection,
  NodeChange,
  EdgeChange
} from '@xyflow/react'


// Auth store 
type UserRoles = 'user' | 'admin';
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
            isLoading: false 
          })
        } catch (error: any) {
          set({ 
            error: error.message,
            isLoading: false 
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
            isRegistering: false 
          })
          throw error
        }
      },
      logout: async () => {
        set({ isLoading: true, error: null })
        await authApi.logout({
          access_token: get().access_token as string,
          refresh_token: get().refresh_token as string,
          token_type: "bearer"
        }).then(() => set({ 
          user: null, 
          refresh_token: null, 
          access_token: null, 
          isAuthenticated: false, 
          isLoading: false 
        })).catch(err => {
          set({ 
            user: null, 
            refresh_token: null, 
            access_token: null, 
            isAuthenticated: false, 
            isLoading: false,
            error: err.message
          })
        });
          
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
  degree2_count:number | null
  isLoading: boolean
  isError: boolean
  error: string | null
  getGraph: (id: string) => void
}

export const useGraphStore = create<GraphState>()((set, get) => ({
  graph: null,
  vertices_count: null,
  edges_count: null,
  degree2_count:null,
  isLoading: true,
  isError: false,
  error: null,
  getGraph: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      const token = useAuthStore.getState().access_token as string;
      const data = await graphsApi.getById(id, token)
      set({ ...data, isLoading: false, isError: false, error: null })
    } catch (error) {
      set({  error: error.message, isLoading: false, graph: null })
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
      const token = useAuthStore.getState().access_token as string;
      const { graphs, favorites } = await graphsApi.list(payload, token)
      set({ graphs, favorites, isLoading: false })
    } catch (error) {
      set({ error: error.message, isLoading: false })
    }
  },

  createGraph: async (payload: CreateGraphPayload) => {
    set({ isCreating: true, error: null })
    try {
      const token = useAuthStore.getState().access_token as string;
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
      const token = useAuthStore.getState().access_token as string;
      const updatedGraph = await graphsApi.update(payload, token)
      
      // Update the graphs list if the updated graph is in it
      const currentGraphs = get().graphs
      const updatedGraphs = currentGraphs.map(graph => 
        graph.id === updatedGraph.id.toString() 
          ? { ...graph, label: updatedGraph.label, description: updatedGraph.description }
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
      const token = useAuthStore.getState().access_token as string;
      await graphsApi.delete(payload, token)
      
      // Remove the deleted graph from the graphs list
      const currentGraphs = get().graphs
      const filteredGraphs = currentGraphs.filter(graph => 
        graph.id !== payload.id.toString()
      )
      
      set({ graphs: filteredGraphs, isDeleting: false })
    } catch (error) {
      set({ error: error.message, isDeleting: false })
      throw error
    }
  },
  favoriteGraph: async (payload: FavoriteGraphPayload) => {
    try {
      const token = useAuthStore.getState().access_token as string;
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
      const token = useAuthStore.getState().access_token as string;
      await graphsApi.favorite({ ...payload, is_favorite: false }, token)
      const currentFavorites = get().favorites
      set({ favorites: currentFavorites.filter(id => id !== payload.graph_id) })
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
      const token = useAuthStore.getState().access_token as string;
      const entity = await entitiesApi.getById(id, token)
      set({ entity, isLoading: false })
    } catch (error) {
      set({ error: error.message, isLoading: false, entity: null })
    }
  }
}))

// Entities store
interface EntitiesState {
  entities: Entity[]
  plugins: PluginEntity[]
  favorites: string[]
  currentEntity: Entity | null
  isLoading: boolean
  isLoadingEntity: boolean
  isLoadingPlugins: boolean
  isCreating: boolean
  isUpdating: boolean
  isDeleting: boolean
  error: string | null
  entityError: string | null
  fetchEntities: (payload: Paginate) => Promise<void>
  fetchPluginEntities: () => Promise<void>
  createEntity: (payload: CreateEntityPayload) => Promise<Entity>
  updateEntity: (payload: UpdateEntityPayload) => Promise<Entity>
  deleteEntity: (payload: DeleteEntityPayload) => Promise<void>
  favoriteEntity: (payload: FavoriteEntityPayload) => Promise<void>
  unfavoriteEntity: (payload: FavoriteEntityPayload) => Promise<void>
}

export const useEntitiesStore = create<EntitiesState>()((set, get) => ({
  entities: [],
  plugins: [],
  favorites: [],
  currentEntity: null,
  isLoading: false,
  isLoadingEntity: false,
  isLoadingPlugins: false,
  isCreating: false,
  isUpdating: false,
  isDeleting: false,
  error: null,
  entityError: null,
  fetchEntities: async (payload: Paginate) => {
    set({ isLoading: true, error: null })
    try {
      const token = useAuthStore.getState().access_token as string;
      const response = await entitiesApi.list(payload, token)
      set({ entities: response.entities, favorites: response.favorites, isLoading: false })
    } catch (error) {
      set({ error: error.message, isLoading: false })
    }
  },
  fetchPluginEntities: async () => {
    set({ isLoadingPlugins: true, error: null })
    try {
      const token = useAuthStore.getState().access_token as string;
      const response = await entitiesApi.getPluginEntities(token)
      set({ plugins: response, isLoadingPlugins: false })
    } catch (error) {
      set({ error: error.message, isLoadingPlugins: false })
    }
  },
  createEntity: async (payload: CreateEntityPayload) => {
    set({ isCreating: true, error: null })
    try {
      const token = useAuthStore.getState().access_token as string;
      const newEntity = await entitiesApi.create(payload, token)
      
      // Add the new entity to the entities list
      const currentEntities = get().entities
      set({ entities: [...currentEntities, newEntity], isCreating: false })
      return newEntity
    } catch (error) {
      set({  error: error.message, isCreating: false })
      throw error
    }
  },
  updateEntity: async (payload: UpdateEntityPayload) => {
    set({ isUpdating: true, error: null })
    try {
      const token = useAuthStore.getState().access_token as string;
      const updatedEntity = await entitiesApi.update(payload, token)
      
      // Update the entities list if the updated entity is in it
      const currentEntities = get().entities
      const updatedEntities = currentEntities.map(entity => 
        entity.id === updatedEntity.id 
          ? updatedEntity
          : entity
      )
      set({ entities: updatedEntities, currentEntity: updatedEntity, isUpdating: false })
      return updatedEntity
    } catch (error) {
      set({  error: error.message, isUpdating: false })
      throw error
    }
  },
  deleteEntity: async (payload: DeleteEntityPayload) => {
    set({ isDeleting: true, error: null })
    try {
      const token = useAuthStore.getState().access_token as string;
      await entitiesApi.delete(payload, token)
      
      // Remove the deleted entity from the entities list
      const currentEntities = get().entities
      const filteredEntities = currentEntities.filter(entity => 
        entity.id !== payload.id
      )
      // Clear currentEntity if it's the one being deleted
      const currentEntity = get().currentEntity
      const updatedCurrentEntity = currentEntity?.id === payload.id ? null : currentEntity
      set({ entities: filteredEntities, currentEntity: updatedCurrentEntity, isDeleting: false })
    } catch (error) {
      set({  error: error.message, isDeleting: false })
      throw error
    }
  },
  favoriteEntity: async (payload: FavoriteEntityPayload) => {
    try {
      const token = useAuthStore.getState().access_token as string;
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
      const token = useAuthStore.getState().access_token as string;
      await entitiesApi.favorite({ ...payload, is_favorite: false }, token)
      const currentFavorites = get().favorites
      set({ favorites: currentFavorites.filter(id => id !== payload.entity_id) })
    } catch (error) {
      set({ error: error.message })
      throw error
    }
  },
}))

type LoaderType = 'screen' | 'bar';

// Global loader store
interface LoaderState {
    isLoading: boolean;
    type: LoaderType
    setIsLoading: (isLoading: boolean) => void;
}

export const useLoaderStore = create<LoaderState>()((set) => ({
    isLoading: false,
    type: 'screen',
    setIsLoading: (
        isLoading: boolean,
        type: LoaderType = 'bar'
    ) => set({ isLoading, type }),
}));

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
      toggleSidebar: () =>
        set({ showSidebar: !get().showSidebar }),
      setSidebar: (value) => set({ showSidebar: value})
    }),
    {
      name: 'settings',
    }
  )
)

export type PositionMode = 'manual' | 'force' | 'elk' | 'tree' | 'right tree'

export interface GraphFlowState {
  nodes: Node[]
  edges: Edge[]
  positionMode: 'manual'
  editState: EditState
  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (connection: Connection) => void
  setNodes: (nodes: Node[]) => void
  setEdges: (edges: Edge[]) => void
  addNode: (node: Node) => void
  removeNode: (nodeId: string) => void
  updateNode: (nodeId: string, updates: Partial<Node>) => void
  clearGraph: () => void
  setEditState: (state: EditState) => void  
  setPositionMode: (mode: PositionMode) => void
  enableEntityEdit: (nodeId: string) => void
  disableEntityEdit: (nodeId: string) => void
}
// Initial empty state
const initialNodes: Node[] = []
const initialEdges: Edge[] = []

// This is our useGraphFlowStore hook that we can use in our components to get parts of the store and call actions
export const useGraphFlowStore = create<GraphFlowState>((set, get) => ({
  nodes: initialNodes,
  edges: initialEdges,
  positionMode: 'manual',
  editState: {
    label: null,
    id: null
  },
  setPositionMode: (mode: PositionMode) => set({ positionMode: mode }),
  setEditState: ({label, id}: EditState) => set({ editState: { label, id } }),
  onNodesChange: (changes: NodeChange[]) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    })
  },
  
  onEdgesChange: (changes: EdgeChange[]) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    })
  },
  
  onConnect: (connection: Connection) => {
    set({
      edges: addEdge(connection, get().edges),
    })
  },
  
  setNodes: (nodes: Node[]) => {
    set({ nodes })
  },
  
  setEdges: (edges: Edge[]) => {
    set({ edges })
  },
  
  addNode: (node: Node) => {
    set({
      nodes: [...get().nodes, node]
    })
  },
  
  removeNode: (nodeId: string) => {
    set({
      nodes: get().nodes.filter(node => node.id !== nodeId),
      edges: get().edges.filter(edge => edge.source !== nodeId && edge.target !== nodeId)
    })
  },
  
  updateNode: (nodeId: string, updates: Partial<Node>) => {
    set({
      nodes: get().nodes.map(node => 
        node.id === nodeId ? { ...node, ...updates } : node
      )
    })
  },
  
  clearGraph: () => {
    set({ 
      nodes: [], 
      edges: [] 
    })
  },
  
  enableEntityEdit: (nodeId: string) => {
    set({
      editState: { label: "enableEditMode", id: nodeId },
      nodes: get().nodes.map((node) => 
        node.id === nodeId ? { ...node, type: 'edit' } : node
      )
    })
  },
  
  disableEntityEdit: (nodeId: string) => {
    set({
      editState: { label: "disableEditMode", id: nodeId },
      nodes: get().nodes.map((node) => 
        node.id === nodeId ? { ...node, type: 'view' } : node
      )
    })
  }
}))
