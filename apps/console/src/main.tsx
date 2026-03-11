import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import posthog from 'posthog-js'
import { PostHogProvider } from 'posthog-js/react'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext.tsx'

const posthogKey = import.meta.env.VITE_POSTHOG_KEY
const isPostHogConfigured = posthogKey && posthogKey !== 'phc_dummy_key_replace_me'

if (isPostHogConfigured) {
  posthog.init(posthogKey, {
    api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com',
    person_profiles: 'identified_only',
  })
}

// ── PWA Service Worker Registration ─────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        console.log('[IE] Service Worker registered. Scope:', reg.scope);
        // Check for SW updates on each load
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[IE] New SW version available — will activate on next reload.');
              }
            });
          }
        });
      })
      .catch((err) => console.error('[IE] Service Worker registration failed:', err));
  });
}

const AppWrapper = (
  <BrowserRouter>
    <AuthProvider>
      <App />
    </AuthProvider>
  </BrowserRouter>
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isPostHogConfigured ? (
      <PostHogProvider client={posthog}>
        {AppWrapper}
      </PostHogProvider>
    ) : AppWrapper}
  </StrictMode>,
)


