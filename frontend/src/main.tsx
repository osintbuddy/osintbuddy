import { render } from 'preact';
import AppRoutes from './AppRoutes';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import "react-toastify/dist/ReactToastify.css";
import './assets/styles/index.css';

const queryClient = new QueryClient()

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppRoutes />
    </QueryClientProvider>
  )
}

render(<App />, document.getElementById('app')!)
