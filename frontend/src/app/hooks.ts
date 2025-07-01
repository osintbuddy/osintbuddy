import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'preact/hooks';
import { useAuthStore } from './store';
import { parseJwt } from './utilities';
import { authApi, CreateGraphPayload, graphsApi } from './api';

export const useMountEffect = (fun: any) => useEffect(fun, [])

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

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: authApi.register,
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
    register: registerMutation.mutate,
    logout: logoutMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    isRegistering: registerMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
    loginError: loginMutation.error,
    registerError: registerMutation.error,
    registerData: registerMutation.data
  }
}

export const useGraphs = () => {
  const { token } = useAuthStore()
  const queryClient = useQueryClient()

  // Create graph mutation
  const createGraphMutation = useMutation({
    mutationFn: (payload: CreateGraphPayload) => 
      graphsApi.create(payload, token as string),
    onSuccess: () => {
      // Invalidate graphs queries if you have any
      queryClient.invalidateQueries({ queryKey: ['graphs'] })
    },
  })

  return {
    createGraph: createGraphMutation.mutate,
    createGraphAsync: createGraphMutation.mutateAsync,
    isCreatingGraph: createGraphMutation.isPending,
    createGraphError: createGraphMutation.error,
    createGraphData: createGraphMutation.data,
  }
}

export const useEffectOnce = (effect: () => void | (() => void)) => {
  const destroyFunc = useRef<void | (() => void)>(null);
  const effectCalled = useRef(false);
  const renderAfterCalled = useRef(false);
  const [val, setVal] = useState<number>(0);

  if (effectCalled.current) {
    renderAfterCalled.current = true;
  }

  useEffect(() => {
    // only execute the effect first time around
    if (!effectCalled.current) {
      destroyFunc.current = effect();
      effectCalled.current = true;
    }

    // this forces one render after the effect is run
    setVal((val) => val + 1);

    return () => {
      // if the comp didn't render since the useEffect was called,
      // we know it's the dummy React cycle
      if (!renderAfterCalled.current) {
        return;
      }
      if (destroyFunc.current) {
        destroyFunc.current();
      }
    };
  }, []);
};
