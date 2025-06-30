
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from './store';
import { parseJwt } from './utilities';
import { BASE_URL } from './baseApi';

interface LoginCredentials {
  email: string
  password: string
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
    logout: async (token: string): Promise<void> => {
    await fetch(`${BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
  },
}

export const useAuth = () => {
  const { user, token, isAuthenticated, login, logout } = useAuthStore()
  const queryClient = useQueryClient()

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      const user = parseJwt(data.token);
      login(user, data.token)
    },
  })

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: () => authApi.logout(token as string),
    onSettled: () => {
      logout()
      queryClient.clear()
    },
  })

  return {
    user,
    token,
    isAuthenticated,
    login: loginMutation.mutate,
    logout: logoutMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
    loginError: loginMutation.error,
  }
}