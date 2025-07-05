import { render } from 'preact';
import AppRoutes from './AppRoutes';
import "react-toastify/dist/ReactToastify.css";
import './assets/styles/index.css';

export function App() {
  return <AppRoutes />
}

render(<App />, document.getElementById('app')!)
