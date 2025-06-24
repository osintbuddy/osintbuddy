
import { BASE_URL } from './baseApi';
import { atomWithMutation, atomWithMutationState, atomWithQuery } from 'jotai-tanstack-query';
import { MutationFunction, MutationKey, QueryFunction, QueryKey } from "@tanstack/query-core";
import { atom, useAtom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

export const authKey = ['auth']
export const authFn = async (user: any) => {
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
