import { Provider } from 'jotai'
import AppRoutes from './AppRoutes'
import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
const queryClient = new QueryClient()


export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Provider>
        <AppRoutes />
      </Provider>
    </QueryClientProvider>
  )
}
