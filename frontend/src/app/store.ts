import { create } from 'zustand';
import { persist } from 'zustand/middleware'
import { graphsApi, GraphResponse, GraphDetailsResponse, UpdateGraphPayload, UpdateGraphResponse, DeleteGraphPayload, entitiesApi, EntityResponse, CreateEntityPayload, UpdateEntityPayload, DeleteEntityPayload } from './api';

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
  token: string | null
  isAuthenticated: boolean
  login: (user: User, token: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      login: (user, token) =>
        set({ user, token, isAuthenticated: true }),
      logout: () =>
        set({ user: null, token: null, isAuthenticated: false }),
    }),
    {
      name: 'auth',
    }
  )
)

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

// Graphs store
interface GraphsState {
  graphs: GraphResponse[]
  currentGraph: GraphDetailsResponse | null
  isLoading: boolean
  isLoadingGraph: boolean
  isUpdating: boolean
  isDeleting: boolean
  error: string | null
  fetchGraphs: (token: string, skip?: number, limit?: number) => Promise<void>
  fetchGraphById: (id: string, token: string) => Promise<void>
  updateGraph: (payload: UpdateGraphPayload, token: string) => Promise<UpdateGraphResponse>
  deleteGraph: (payload: DeleteGraphPayload, token: string) => Promise<void>
}

export const useGraphsStore = create<GraphsState>()((set, get) => ({
  graphs: [],
  currentGraph: null,
  isLoading: false,
  isLoadingGraph: false,
  isUpdating: false,
  isDeleting: false,
  error: null,
  fetchGraphs: async (token: string, skip: number = 0, limit: number = 50) => {
    set({ isLoading: true, error: null })
    try {
      const graphs = await graphsApi.list(token, skip, limit)
      set({ graphs, isLoading: false })
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch graphs',
        isLoading: false 
      })
    }
  },
  fetchGraphById: async (id: string, token: string) => {
    set({ isLoadingGraph: true, error: null })
    try {
      const graphDetails = await graphsApi.getById(id, token)
      set({ currentGraph: graphDetails, isLoadingGraph: false })
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch graph',
        isLoadingGraph: false 
      })
    }
  },
  updateGraph: async (payload: UpdateGraphPayload, token: string) => {
    set({ isUpdating: true, error: null })
    try {
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
  deleteGraph: async (payload: DeleteGraphPayload, token: string) => {
    set({ isDeleting: true, error: null })
    try {
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
}))

// Entities store
interface EntitiesState {
  entities: EntityResponse[]
  currentEntity: EntityResponse | null
  isLoading: boolean
  isLoadingEntity: boolean
  isCreating: boolean
  isUpdating: boolean
  isDeleting: boolean
  error: string | null
  fetchEntities: (token: string, skip?: number, limit?: number) => Promise<void>
  fetchEntityById: (id: number, token: string) => Promise<void>
  createEntity: (payload: CreateEntityPayload, token: string) => Promise<EntityResponse>
  updateEntity: (payload: UpdateEntityPayload, token: string) => Promise<EntityResponse>
  deleteEntity: (payload: DeleteEntityPayload, token: string) => Promise<void>
}

export const useEntitiesStore = create<EntitiesState>()((set, get) => ({
  entities: [],
  currentEntity: null,
  isLoading: false,
  isLoadingEntity: false,
  isCreating: false,
  isUpdating: false,
  isDeleting: false,
  error: null,
  fetchEntities: async (token: string, skip: number = 0, limit: number = 50) => {
    set({ isLoading: true, error: null })
    try {
      const entities = await entitiesApi.list(token, skip, limit)
      set({ entities, isLoading: false })
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch entities',
        isLoading: false 
      })
    }
  },
  fetchEntityById: async (id: number, token: string) => {
    set({ isLoadingEntity: true, error: null })
    try {
      const entity = await entitiesApi.getById(id, token)
      set({ currentEntity: entity, isLoadingEntity: false })
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch entity',
        isLoadingEntity: false 
      })
    }
  },
  createEntity: async (payload: CreateEntityPayload, token: string) => {
    set({ isCreating: true, error: null })
    try {
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
  updateEntity: async (payload: UpdateEntityPayload, token: string) => {
    set({ isUpdating: true, error: null })
    try {
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
  deleteEntity: async (payload: DeleteEntityPayload, token: string) => {
    set({ isDeleting: true, error: null })
    try {
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
}))


