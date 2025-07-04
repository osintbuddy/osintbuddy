import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'preact/hooks';
import { useAuthStore } from './store';
import { parseJwt } from './utilities';
import { authApi, CreateGraphPayload, graphsApi, DeleteGraphPayload, UpdateGraphPayload, entitiesApi, CreateEntityPayload, UpdateEntityPayload, DeleteEntityPayload } from './api';

export const useMountEffect = (fun: any) => useEffect(fun, [])

export const useAuth = () => {
  const { user, token, isAuthenticated, login, logout } = useAuthStore()
  const queryClient = useQueryClient()

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      const user = parseJwt(data.token);
      login(user, data.token)
    },
  })

  const registerMutation = useMutation({
    mutationFn: authApi.register,
  })

  const logoutMutation = useMutation({
    mutationFn: () => authApi.logout(token!),
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

export const useGraphs = (skip = 0, limit = 50) => {
  const { token } = useAuthStore()
  const queryClient = useQueryClient()

  const listGraphsQuery = useQuery({
    queryKey: ['graphs', skip, limit],
    queryFn: () => graphsApi.list(token!, skip, limit),
    enabled: !!token,
  })

  const createGraphMutation = useMutation({
    mutationFn: (payload: CreateGraphPayload) => 
      graphsApi.create(payload, token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['graphs'] })
    },
  })

  const updateGraphMutation = useMutation({
    mutationFn: (payload: UpdateGraphPayload) => 
      graphsApi.update(payload, token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['graphs'] })
    },
  })

  const deleteGraphMutation = useMutation({
    mutationFn: (payload: DeleteGraphPayload) => 
      graphsApi.delete(payload, token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['graphs'] })
    },
  })

  return {
    // List query
    graphs: listGraphsQuery.data,
    isLoadingGraphs: listGraphsQuery.isPending,
    graphsError: listGraphsQuery.error,
    refetchGraphs: listGraphsQuery.refetch,
    // Create mutation
    createGraph: createGraphMutation.mutate,
    createGraphAsync: createGraphMutation.mutateAsync,
    isCreatingGraph: createGraphMutation.isPending,
    createGraphError: createGraphMutation.error,
    createGraphData: createGraphMutation.data,
    // Update mutation
    updateGraph: updateGraphMutation.mutate,
    updateGraphAsync: updateGraphMutation.mutateAsync,
    isUpdatingGraph: updateGraphMutation.isPending,
    updateGraphError: updateGraphMutation.error,
    updateGraphData: updateGraphMutation.data,
    // Delete mutation
    deleteGraph: deleteGraphMutation.mutate,
    deleteGraphAsync: deleteGraphMutation.mutateAsync,
    isDeletingGraph: deleteGraphMutation.isPending,
    deleteGraphError: deleteGraphMutation.error,
  }
}

export const useGraph = (id: string) => {
  const { token } = useAuthStore()

  const getGraphQuery = useQuery({
    queryKey: ['graph', id],
    queryFn: () => graphsApi.getById(id, token!),
    enabled: !!token && !!id,
  })

  return {
    graph: getGraphQuery.data,
    isLoadingGraph: getGraphQuery.isPending,
    graphError: getGraphQuery.error,
    refetchGraph: getGraphQuery.refetch,
  }
}

export const useEntities = (skip = 0, limit = 50) => {
  const { token } = useAuthStore()
  const queryClient = useQueryClient()

  const listEntitiesQuery = useQuery({
    queryKey: ['entities', skip, limit],
    queryFn: () => entitiesApi.list(token!, skip, limit),
    enabled: !!token,
  })

  const createEntityMutation = useMutation({
    mutationFn: (payload: CreateEntityPayload) => 
      entitiesApi.create(payload, token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entities'] })
    },
  })

  const updateEntityMutation = useMutation({
    mutationFn: (payload: UpdateEntityPayload) => 
      entitiesApi.update(payload, token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entities'] })
    },
  })

  const deleteEntityMutation = useMutation({
    mutationFn: (payload: DeleteEntityPayload) => 
      entitiesApi.delete(payload, token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entities'] })
    },
  })

  return {
    entities: listEntitiesQuery.data,
    isLoadingEntities: listEntitiesQuery.isPending,
    entitiesError: listEntitiesQuery.error,
    refetchEntities: listEntitiesQuery.refetch,
    createEntity: createEntityMutation.mutate,
    createEntityAsync: createEntityMutation.mutateAsync,
    isCreatingEntity: createEntityMutation.isPending,
    createEntityError: createEntityMutation.error,
    createEntityData: createEntityMutation.data,
    updateEntity: updateEntityMutation.mutate,
    updateEntityAsync: updateEntityMutation.mutateAsync,
    isUpdatingEntity: updateEntityMutation.isPending,
    updateEntityError: updateEntityMutation.error,
    updateEntityData: updateEntityMutation.data,
    deleteEntity: deleteEntityMutation.mutate,
    deleteEntityAsync: deleteEntityMutation.mutateAsync,
    isDeletingEntity: deleteEntityMutation.isPending,
    deleteEntityError: deleteEntityMutation.error,
  }
}

export const useEntity = (id: number) => {
  const { token } = useAuthStore()

  const getEntityQuery = useQuery({
    queryKey: ['entity', id],
    queryFn: () => entitiesApi.getById(id, token!),
    enabled: !!token && !!id,
  })

  return {
    entity: getEntityQuery.data,
    isLoadingEntity: getEntityQuery.isPending,
    entityError: getEntityQuery.error,
    refetchEntity: getEntityQuery.refetch,
  }
}
