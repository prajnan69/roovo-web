import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Restore saved route if it is /hosting
const savedRoute = localStorage.getItem('last_route');
if (savedRoute === '/hosting' && window.location.pathname !== '/hosting') {
  window.history.replaceState({}, '', savedRoute);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
