import { Provider } from 'jotai'
import AppRoutes from './AppRoutes'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useHydrateAtoms } from 'jotai/utils'
import { queryClientAtom } from 'jotai-tanstack-query'


const queryClient = new QueryClient()
const HydrateAtoms = ({ children }: any) => {
  // @ts-ignore
  useHydrateAtoms([[queryClientAtom, queryClient]])
  return children
}


export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Provider>
        <HydrateAtoms>
          <AppRoutes />
        </HydrateAtoms>
      </Provider>
    </QueryClientProvider>
  )
}
