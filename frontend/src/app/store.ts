import { create } from 'zustand';
import { persist } from 'zustand/middleware'
import { graphsApi, Graph, GraphDetails, UpdateGraphPayload, DeleteGraphPayload, FavoriteGraphPayload, entitiesApi, Entity, CreateEntityPayload, UpdateEntityPayload, DeleteEntityPayload, FavoriteEntityPayload, authApi, LoginCredentials, RegisterCredentials, Registered,  Paginate, CreateGraphPayload } from './api';
import { jwtParse } from './utilities';

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
            error: error instanceof Error ? error.message : 'Registration failed',
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


// Graphs store
interface GraphsState {
  graphs: Graph[]
  favorites: string[]
  currentGraph: GraphDetails | null
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
  currentGraph: null,
  isLoading: false,
  isCreating: false,
  isUpdating: false,
  isDeleting: false,
  error: null,
  fetchGraphs: async (payload: Paginate) => {
    set({ isLoading: true, error: null })
    try {
      const token = useAuthStore.getState().access_token as string;
      const response = await graphsApi.list(payload, token)
      set({ graphs: response.graphs, favorites: response.favorites, isLoading: false })
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch graphs',
        isLoading: false 
      })
    }
  },
  createGraph: async (payload: CreateGraphPayload) => {
    set({ isCreating: true, error: null })
    try {
      const token = useAuthStore.getState().access_token as string;
      const newGraph = await graphsApi.create(payload, token)
      
      // Add the new graph to the graphs list
      const currentGraphs = get().graphs
      set({ 
        graphs: [...currentGraphs, newGraph],
        isCreating: false 
      })
      
      return newGraph
    } catch (error) {
      set({ 
        error: error.message,
        isCreating: false 
      })
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
      
      set({ 
        graphs: updatedGraphs,
        isUpdating: false 
      })
      
      return updatedGraph
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update graph',
        isUpdating: false 
      })
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
      
      // Clear currentGraph if it's the one being deleted
      const currentGraph = get().currentGraph
      const updatedCurrentGraph = currentGraph?.graph.id === payload.id ? null : currentGraph
      
      set({ 
        graphs: filteredGraphs,
        currentGraph: updatedCurrentGraph,
        isDeleting: false 
      })
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete graph',
        isDeleting: false 
      })
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
      set({ 
        error: error instanceof Error ? error.message : 'Failed to favorite graph'
      })
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
      set({ 
        error: error instanceof Error ? error.message : 'Failed to unfavorite graph'
      })
      throw error
    }
  },
}))

// Entities store
interface EntitiesState {
  entities: Entity[]
  favorites: string[]
  currentEntity: Entity | null
  isLoading: boolean
  isCreating: boolean
  isUpdating: boolean
  isDeleting: boolean
  error: string | null
  fetchEntities: (payload: Paginate) => Promise<void>
  createEntity: (payload: CreateEntityPayload) => Promise<Entity>
  updateEntity: (payload: UpdateEntityPayload) => Promise<Entity>
  deleteEntity: (payload: DeleteEntityPayload) => Promise<void>
  favoriteEntity: (payload: FavoriteEntityPayload) => Promise<void>
  unfavoriteEntity: (payload: FavoriteEntityPayload) => Promise<void>
}

export const useEntitiesStore = create<EntitiesState>()((set, get) => ({
  entities: [],
  favorites: [],
  currentEntity: null,
  isLoading: false,
  isCreating: false,
  isUpdating: false,
  isDeleting: false,
  error: null,
  fetchEntities: async (payload: Paginate) => {
    set({ isLoading: true, error: null })
    try {
      const token = useAuthStore.getState().access_token as string;
      const response = await entitiesApi.list(payload, token)
      set({ entities: response.entities, favorites: response.favorites, isLoading: false })
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch entities',
        isLoading: false 
      })
    }
  },
  createEntity: async (payload: CreateEntityPayload) => {
    set({ isCreating: true, error: null })
    try {
      const token = useAuthStore.getState().access_token as string;
      const newEntity = await entitiesApi.create(payload, token)
      
      // Add the new entity to the entities list
      const currentEntities = get().entities
      set({ 
        entities: [...currentEntities, newEntity],
        isCreating: false 
      })
      
      return newEntity
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to create entity',
        isCreating: false 
      })
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
      
      set({ 
        entities: updatedEntities,
        currentEntity: updatedEntity,
        isUpdating: false 
      })
      
      return updatedEntity
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update entity',
        isUpdating: false 
      })
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
      
      set({ 
        entities: filteredEntities,
        currentEntity: updatedCurrentEntity,
        isDeleting: false 
      })
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete entity',
        isDeleting: false 
      })
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
      set({ 
        error: error instanceof Error ? error.message : 'Failed to favorite entity'
      })
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
      set({ 
        error: error instanceof Error ? error.message : 'Failed to unfavorite entity'
      })
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