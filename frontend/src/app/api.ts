
import { BASE_URL } from './baseApi';
import { atomWithMutation, atomWithMutationState } from 'jotai-tanstack-query';

const authKey = ['auth']

const authFn = async (user: any) => {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user)
  });
  const data = await res.json()
  if (!data?.token) {
    throw data
  }
  return data
}

const authAtom = atomWithMutation(() => ({
  mutationKey: authKey,
  mutationFn: authFn 
}))

const tokenAtom = atomWithMutationState(() => ({
  filters: {
    mutationKey: authKey,
  },

}))
export { authAtom, tokenAtom };
