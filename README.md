# Between the Bread

A random sandwich generator with a sandwich encyclopedia, a community leaderboard and a blog. Live at [betweenbread.co](https://betweenbread.co).

Built with React, Vite and TypeScript, hosted on Vercel, with Supabase for the database, sign-in and file storage and PostHog for analytics.

## Getting started

```sh
pnpm install
pnpm dev
```

Settings and keys live in `.env.local`, which is never committed. Commands marked **needs keys** below read `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from it. The service role key can read and change everything in the database, so keep it out of anything that starts with `VITE_` and never share it.

## Everyday checks

| Command | What it does |
|---|---|
| `pnpm test` | Runs the unit tests and watches for changes. `pnpm test:run` runs them once. |
| `pnpm typecheck` | Checks the code for type errors. |
| `pnpm lint` | Checks the code style. |
| `pnpm e2e` | Opens the live site in a real browser and checks browsing, search, keyboard use, accessibility (including colour contrast), phone layout and what search engines receive. Read-only; analytics are blocked so test visits are not counted. |
| `pnpm e2e:local` | The same browser checks against a local build, so fixes can be checked before they are pushed. The search-engine checks only run against the live site. |

## Encyclopedia

| Command | What it does |
|---|---|
| `pnpm import:encyclopedia <file.xlsx> --name wave-N` | Turns a reviewed spreadsheet into `supabase/seeds/encyclopedia/wave-N.json` and `.sql`. Entries arrive unpublished. Add `--update` to refresh the text of entries that already exist. |
| `pnpm encyclopedia:snapshot` | **Needs keys.** Saves the live encyclopedia (text, publishing and photo links) to `supabase/seeds/encyclopedia/live.json`. Read-only. Run it after big admin changes and commit the result. |
| `pnpm seed:encyclopedia` | Builds `supabase/seeds/encyclopedia/all.sql` from every wave file plus `live.json` (the live copy wins). Running that SQL adds missing entries and leaves existing ones alone. Add `--update` to also refresh the text of existing entries. |

The wave files show what was imported; they go out of date as soon as entries are edited, published or given photos. `live.json` is the up-to-date copy.

## Blog

| Command | What it does |
|---|---|
| `pnpm seed:blog` | Turns the Markdown posts in `supabase/seeds/blog/posts/` into `supabase/seeds/blog/launch-posts.sql`. |

## Images and analytics

| Command | What it does |
|---|---|
| `pnpm images:fix` | **Needs keys.** Shrinks large photos already uploaded for the encyclopedia and blog. A dry run by default; add `--apply` to make the changes, then optionally `--delete-originals`. |
| `pnpm posthog:setup` | Creates the PostHog dashboards, insights and cohorts. Needs `POSTHOG_PERSONAL_API_KEY` and `POSTHOG_PROJECT_ID` in `.env.local`. Safe to run again; anything already there is skipped. |

## Checking Supabase usage

Paste `supabase/checks/plan_usage.sql` into the Supabase SQL editor and run it. It is read-only and shows the database size, file storage, people signed in during the last 30 days and the biggest tables, next to the free plan's limits. Data sent to visitors (egress) is not visible to SQL; read it from Organization > Usage in the Supabase dashboard.

## Rebuilding the database from scratch

For a new staging copy, or to recover from a lost database. Run each file in the Supabase SQL editor, in this order:

1. Every file in `supabase/migrations/`, in number order.
2. The ingredient seeds `supabase/seeds/001_categories.sql` to `006_wave4_hidden_ingredients.sql`, in number order.
3. `supabase/seeds/encyclopedia/all.sql` (run `pnpm seed:encyclopedia` first to rebuild it).
4. `supabase/seeds/blog/launch-posts.sql`.

This brings back the site's own content. Three things are not covered:
- People's accounts, ratings and comments exist only in the live database, so protecting them needs a database backup.
- Photo files (encyclopedia, blog and user uploads) are stored in Supabase Storage. `live.json` keeps the links to them, not the pictures, so they would need re-uploading in a new project.
- Blog posts written or edited in the admin. The blog seed only has the launch posts as first written.
