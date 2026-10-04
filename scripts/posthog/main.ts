import { mkdirSync, writeFileSync } from 'node:fs'
import { COHORTS, DASHBOARDS } from './definitions'
import { setupGuide } from './guide'
import { runSetup } from './setup'
import type { Http } from './setup'

const GUIDE_PATH = 'md_files/posthog-setup-guide.md'
const DEFAULT_HOST = 'https://us.posthog.com'

const writeGuide = (): void => {
  mkdirSync('md_files', { recursive: true })
  writeFileSync(GUIDE_PATH, setupGuide({ cohorts: COHORTS, dashboards: DASHBOARDS }))
  console.log(`Wrote the step-by-step guide to ${GUIDE_PATH}.`)
}

const main = async (): Promise<number> => {
  writeGuide()

  const key = process.env.POSTHOG_PERSONAL_API_KEY
  const projectId = process.env.POSTHOG_PROJECT_ID
  const host = process.env.POSTHOG_APP_HOST ?? DEFAULT_HOST
  if (key === undefined || key === '' || projectId === undefined || projectId === '') {
    console.log('POSTHOG_PERSONAL_API_KEY and POSTHOG_PROJECT_ID are not set in .env.local, so nothing was created in PostHog.')
    return 1
  }

  const http: Http = async (method, path, body) => {
    const response = await fetch(`${host}${path}`, {
      method,
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
    const text = await response.text()
    const parsed: unknown = text === '' ? null : JSON.parse(text)
    return { status: response.status, body: parsed }
  }

  const report = await runSetup({ http, projectId, cohorts: COHORTS, dashboards: DASHBOARDS })
  console.log(`Created ${String(report.created)}, already there ${String(report.skipped)}, failed ${String(report.failed.length)}.`)
  report.failed.forEach(({ name, reason }) => { console.log(`  Failed: ${name} (${reason})`) })
  if (report.blocked) {
    console.log('PostHog refused the personal API key for this action, so the rest was not created. Use the guide to finish by hand.')
    return 1
  }
  return report.failed.length === 0 ? 0 : 1
}

void main().then((code) => { process.exitCode = code })
