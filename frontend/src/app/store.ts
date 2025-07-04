import { create } from 'zustand';
import { persist } from 'zustand/middleware'
import { graphsApi, GraphResponse, GraphDetailsResponse, UpdateGraphPayload, UpdateGraphResponse, DeleteGraphPayload } from './api';

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


