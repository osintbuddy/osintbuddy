import {
  QueryClient,
} from '@tanstack/react-query'
import { BASE_URL } from './baseApi';
import { atomWithMutation } from 'jotai-tanstack-query';

const queryClient = new QueryClient()

const authAtom = atomWithMutation(() => ({
  mutationKey: ['auth'],
  mutationFn: async (user: any ) => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    });
    const data = await res.json()
    console.log('authAtom withMutation data:', data)
    return data
  },
}))

export { queryClient, authAtom };
