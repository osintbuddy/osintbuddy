import { create } from 'zustand';
import { persist } from 'zustand/middleware'

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


