import { onLCP, onCLS, onTTFB } from 'web-vitals'
import { capturePerformance } from '@/analytics/events'

type NavigatorWithConnection = Navigator & {
  connection?: { effectiveType?: string }
}

const getConnectionType = (): string | null =>
  (navigator as NavigatorWithConnection).connection?.effectiveType ?? null

export const captureWebVitals = (): void => {
  onLCP((m) => {
    capturePerformance({
      lcpMs: Math.round(m.value),
      fidMs: null,
      cls: null,
      ttfbMs: null,
      page: window.location.pathname,
      connectionType: getConnectionType(),
    })
  })
  onCLS((m) => {
    capturePerformance({
      lcpMs: null,
      fidMs: null,
      cls: m.value,
      ttfbMs: null,
      page: window.location.pathname,
      connectionType: getConnectionType(),
    })
  })
  onTTFB((m) => {
    capturePerformance({
      lcpMs: null,
      fidMs: null,
      cls: null,
      ttfbMs: Math.round(m.value),
      page: window.location.pathname,
      connectionType: getConnectionType(),
    })
  })
}
