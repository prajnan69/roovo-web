import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

import { prefetchListings } from './services/cache';

// ── Kick off listings fetch immediately, before React renders ────────────────
// By the time HomeFeed mounts (after Supabase init, splash, auth check etc.)
// the data is already in-flight or fully cached.
prefetchListings(import.meta.env.VITE_API_BASE_URL);

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
