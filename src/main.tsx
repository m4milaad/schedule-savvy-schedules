import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { registerServiceWorker } from './lib/serviceWorkerRegistration'

const rootEl = document.getElementById("root")
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

if (!rootEl) {
  throw new Error('Missing #root element')
}

if (!supabaseUrl || !supabaseKey) {
  rootEl.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:1.5rem;font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0;">
      <div style="max-width:28rem;line-height:1.5;">
        <p style="margin:0 0 0.75rem;font-weight:600;font-size:1.1rem;">Configuration required</p>
        <p style="margin:0 0 0.5rem;font-size:0.9rem;opacity:0.9;">
          This build is missing <code style="background:#1e293b;padding:0.1rem 0.35rem;border-radius:4px;">VITE_SUPABASE_URL</code>
          or <code style="background:#1e293b;padding:0.1rem 0.35rem;border-radius:4px;">VITE_SUPABASE_ANON_KEY</code>.
        </p>
        <p style="margin:0;font-size:0.85rem;opacity:0.75;">Add them to your <code style="background:#1e293b;padding:0.1rem 0.35rem;border-radius:4px;">.env</code> (local) or hosting env (e.g. Vercel), then rebuild.</p>
      </div>
    </div>`
} else {
  void import('./App.tsx')
    .then(({ default: App }) => {
      createRoot(rootEl).render(
        <StrictMode>
          <App />
        </StrictMode>
      )
    })
    .catch((err) => {
      console.error(err)
      rootEl.innerHTML = `
        <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:1.5rem;font-family:system-ui,sans-serif;">
          <p style="max-width:24rem;">The app failed to load. Check the browser console for details.</p>
        </div>`
    })
}

registerServiceWorker()
