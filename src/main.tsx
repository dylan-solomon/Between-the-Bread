import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import '@/styles/globals.css'
import { routes } from '@/router'
import { initPostHog } from '@/analytics/posthog'
import { captureWebVitals } from '@/analytics/performance'

initPostHog()
captureWebVitals()

const router = createBrowserRouter(routes)

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element not found')

createRoot(rootElement).render(
  <StrictMode>
    <HelmetProvider>
      <RouterProvider router={router} />
    </HelmetProvider>
  </StrictMode>,
)
