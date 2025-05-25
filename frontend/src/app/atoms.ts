import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import { StepType } from '@reactour/tour';

export interface Account {
  isAuthenticated: boolean
}

export const accountAtom = atomWithStorage<Account>("ob-user", {
  isAuthenticated: false,
});

export interface Settings {
  showSidebar: boolean
}

export const settingsAtom = atomWithStorage<Settings>('ob-settings', {
  showSidebar: true,
});

export type TourAtom = StepType[]

export const tourAtom = atom<TourAtom>([])