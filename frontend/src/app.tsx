import { Provider } from 'jotai'
import AppRoutes from './AppRoutes'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './app/api'


export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Provider>
        <AppRoutes />
      </Provider>
    </QueryClientProvider>
  )
}
