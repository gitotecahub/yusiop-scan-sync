import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { ThemeProvider } from 'next-themes'
import '@fontsource/space-grotesk/400.css'
import '@fontsource/space-grotesk/500.css'
import '@fontsource/space-grotesk/600.css'
import '@fontsource/space-grotesk/700.css'
import '@fontsource/dm-sans/400.css'
import '@fontsource/dm-sans/500.css'
import '@fontsource/dm-sans/600.css'
import '@fontsource/dm-sans/700.css'

// El service worker SOLO debe activarse en producción (dominio publicado o
// app instalada). En el preview de Lovable y en localhost lo desregistramos
// para evitar servir builds cacheadas mientras se itera.
const hostname = window.location.hostname
const isInIframe = (() => {
  try { return window.self !== window.top } catch { return true }
})()
const isPreviewEnvironment =
  hostname.includes('preview--') ||
  hostname.includes('lovableproject.com') ||
  hostname === 'localhost' ||
  hostname === '127.0.0.1' ||
  isInIframe

if (isPreviewEnvironment && 'serviceWorker' in navigator) {
  void navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      void registration.unregister()
    })
  })

  if ('caches' in window) {
    void caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
  }
} else {
  // Producción: auto-actualizar el Service Worker para que los cambios
  // publicados se apliquen sin que el usuario tenga que recargar a mano.
  void import('./lib/swUpdate').then((m) => m.initSwAutoUpdate())
}

createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
    <App />
  </ThemeProvider>
);
