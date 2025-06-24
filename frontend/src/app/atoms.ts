import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import { StepType } from '@reactour/tour';
import { atomWithMutation } from 'jotai-tanstack-query';
import { authKey, authFn } from '@/app/api';


// When app guides are toggled by a user, set the appropriate tour steps
export type TourAtomValue = StepType[]
const tourAtom = atom<TourAtomValue>([])

// show/hide main app sidebar found at frontend/src/components/navs/AppLayoutSidebar.tsx
const showSidebarAtom = atomWithStorage<boolean>('show-sidebar', true);

// Used by 'auth middleware' in frontend/src/routes/AppLayout.tsx
const tokenAtom = atom<string>('');
const authAtom = atomWithMutation(() => ({ 
  mutationKey: authKey,
  mutationFn: authFn 
}));


// http://localhost:5173/dashboard/graph
export { authAtom, tokenAtom, showSidebarAtom, tourAtom }
