# Between the Bread — Build Plan

**Project Name:** Between the Bread
**Domain:** betweenbread.co
**Version:** 1.0
**Date:** March 1, 2026
**Status:** Draft
**Related Documents:** PRD v1.0, Website Architecture v1.0, Database Schema v1.0, API Endpoints v1.0, Design System v1.0, Analytics Plan v1.0, Ingredient Data v1.0

---

## Table of Contents

1. [Build Plan Overview](#1-build-plan-overview)
2. [Phase 1: Core MVP](#2-phase-1-core-mvp)
3. [Phase 2: Intelligence, Sharing, and Cost/Nutrition](#3-phase-2-intelligence-sharing-and-costnutrition)
4. [Phase 3: Accounts and Persistence](#4-phase-3-accounts-and-persistence)
5. [Phase 4: Future Features](#5-phase-4-future-features)
6. [Cross-Phase Work](#6-cross-phase-work)
7. [Dependency Map](#7-dependency-map)
8. [Risk Register](#8-risk-register)

---

## 1. Build Plan Overview

### 1.1 Principles

- Each phase delivers a complete, deployable product increment. No phase leaves the app in a broken state.
- Items within each section are ordered by dependency, not priority. Build from the bottom up.
- Every section ends with a verification checklist. The phase is not complete until all checks pass.
- "Done" means deployed to production, not merged to main.

### 1.2 Phase Summary

| Phase | Focus | Sections | Depends On |
|---|---|---|---|
| **Phase 1** | Core MVP | 7 sections | Nothing |
| **Phase 2** | Intelligence, sharing, cost/nutrition | 8 sections | Phase 1 |
| **Phase 3** | Accounts and persistence | 6 sections | Phase 2 |
| **Phase 4** | Future features | 5 sections | Phase 3 |

### 1.3 Tech Stack Reference

| Layer | Technology |
|---|---|
| Frontend | React 18+, Vite, CSS Modules or Tailwind |
| Routing | React Router |
| Backend | Vercel Serverless Functions |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Analytics | PostHog |
| Hosting | Vercel |
| Domain | betweenbread.co |

---

## 2. Phase 1: Core MVP

**Goal:** A fully functional, beautifully polished sandwich randomizer that works on any device. No backend, no accounts, no sharing. Just the core mechanic, done well.

---

### 2.1 Project Scaffolding and Infrastructure

Set up the development environment, build toolchain, and deployment pipeline before writing any feature code.

| # | Item | Description | Deliverable |
|---|---|---|---|
| 1 | Initialize React + Vite project | Create the project with React 18, Vite, and TypeScript. Configure path aliases, ESLint, Prettier. | `/package.json`, `/vite.config.ts`, `/tsconfig.json` |
| 2 | Set up CSS architecture | Install and configure Tailwind CSS (or CSS Modules). Implement the design system tokens as CSS custom properties (colors, typography, spacing, shadows, radii, animation timings from Design System doc). | `/src/styles/tokens.css` |
| 3 | Configure Vercel deployment | Connect the Git repository to Vercel. Set up production and preview deployment environments. Configure the custom domain `betweenbread.co`. | Vercel project, DNS records |
| 4 | Set up CI pipeline | Configure GitHub Actions (or equivalent) for lint, type-check, and build on every PR. Block merges on failure. | `/.github/workflows/ci.yml` |
| 5 | Configure environment variables | Set up `.env.local` for development and Vercel environment variables for production. Include PostHog project key (Phase 1), Supabase URL/anon key (Phase 2+). | `.env.example` |
| 6 | Set up font loading | Add Google Fonts link for Libre Baskerville (400, 400i, 700) and DM Sans (400, 500, 600, 700). Configure `font-display: swap` for performance. | Font loading in `index.html` or CSS |
| 7 | Install icon library | Install `lucide-react` and verify key icons render (Dice5, Lock, Unlock, Share2, Star, Search, Menu, X). | Package installed, icon test |

**Verification:**
- `npm run build` completes with zero errors and zero warnings.
- Preview deployment serves the app at a Vercel URL.
- `betweenbread.co` resolves to the Vercel deployment (or placeholder).
- Lighthouse performance score is 90+ on the empty shell.

---

### 2.2 Ingredient Data Layer

Load and manage the static ingredient dataset that powers the randomizer.

| # | Item | Description | Deliverable |
|---|---|---|---|
| 1 | Bundle ingredient JSON | Import the ingredient data JSON file as a static module. No API calls in Phase 1. | `/src/data/ingredients.json` |
| 2 | Create TypeScript types | Define types for `Category`, `Ingredient`, `Nutrition`, `EstimatedCost`, `SandwichComposition`. | `/src/types/index.ts` |
| 3 | Build data access layer | Create utility functions: `getCategories()`, `getIngredientsByCategory(slug)`, `getEnabledIngredients(slug)`, `getIngredientById(id)`, `getTriggerIngredients()`. | `/src/data/ingredients.ts` |
| 4 | Build dietary filter utility | Create `filterByDiet(ingredients, activeTags[])` that returns only ingredients matching ALL active dietary tags. Handle edge case: return empty array if no matches. | `/src/utils/dietary.ts` |
| 5 | Unit test data layer | Verify correct ingredient counts per category (17 bread, 20 protein, 17 cheese, 22 toppings, 20 condiments, 15 Chef's Special). Verify trigger ingredients are identified. Verify dietary filtering returns correct subsets. | `/src/data/__tests__/` |

**Verification:**
- All 111 ingredients load correctly with all fields populated.
- `filterByDiet(ingredients, ["vegan"])` returns only vegan-tagged items.
- Trigger ingredients (`is_trigger: true`) are correctly identified in toppings.
- TypeScript types enforce the data shape at compile time.

---

### 2.3 Randomization Engine

The core logic that selects ingredients, handles locks, and manages multi-pick categories.

| # | Item | Description | Deliverable |
|---|---|---|---|
| 1 | Pure random selection | Implement `rollCategory(categorySlug, options)` that randomly selects ingredient(s) from a category's enabled pool. Respect `selection_type` (single vs multi) and pick count ranges (`min_picks`/`max_picks` for multi). | `/src/engine/randomizer.ts` |
| 2 | Lock management | Implement lock state tracking. `rollAll()` skips locked categories. Individual `rollCategory()` is blocked when locked. | Lock state in randomizer |
| 3 | Multi-pick count randomization | For toppings (1-4) and condiments (1-2), randomly determine the count within the range, then select that many unique ingredients. | Logic in `rollCategory()` |
| 4 | Sandwich name generator | Build `generateSandwichName(composition)` that produces a human-readable name. Format: "[Protein] & [Cheese] on [Bread]" with handling for double picks, No Cheese, and multi-item categories. | `/src/engine/naming.ts` |
| 5 | Composition builder | Create `buildComposition(results)` that assembles the current roll state into a `SandwichComposition` object with ingredient IDs grouped by category. | `/src/engine/composition.ts` |
| 6 | Unit test randomizer | Test edge cases: all categories locked, empty pool after dietary filter, single pick, max picks, duplicate prevention in multi-pick. | `/src/engine/__tests__/` |

**Verification:**
- `rollAll()` produces a valid composition with all five base categories filled.
- Locked categories are never re-rolled.
- Multi-pick categories never exceed their max or go below their min.
- No duplicate ingredients within a single multi-pick category.
- `generateSandwichName()` produces grammatically correct names for all edge cases.

---

### 2.4 App Shell and Layout

The structural UI container: header, footer, main content area, responsive layout.

| # | Item | Description | Deliverable |
|---|---|---|---|
| 1 | App shell component | Create the root layout with sticky header, scrollable main content area, and footer. Max-width 480px centered for the generator. | `/src/components/AppShell.tsx` |
| 2 | Header component | Logo ("Between the Bread" wordmark in Libre Baskerville), right-aligned "Log in" link (non-functional in Phase 1, placeholder). Sticky positioning with backdrop blur. | `/src/components/Header.tsx` |
| 3 | Footer component | Logo, navigation links (Generator, About, Privacy Policy, Terms of Service), copyright notice. Links to About/Privacy/Terms are placeholder pages in Phase 1. | `/src/components/Footer.tsx` |
| 4 | Mobile responsive layout | Ensure the app works at 320px minimum width. Full-width below 480px, centered column above. Test on iOS Safari and Android Chrome. | Responsive CSS |
| 5 | Content pages (About, Privacy, Terms) | Create the Content Page template (max-width 720px). Stub in placeholder text for About, Privacy Policy, and Terms of Service. These will need real content before public launch. | `/src/pages/About.tsx`, `/src/pages/Privacy.tsx`, `/src/pages/Terms.tsx` |
| 6 | React Router setup | Configure routes: `/` (home/generator), `/about`, `/privacy`, `/terms`. 404 catch-all page with "This Sandwich Doesn't Exist (Yet)" messaging and CTA. | `/src/router.tsx` |
| 7 | Meta tags and SEO basics | Set page titles, meta descriptions, and Open Graph fallback tags for the home page. Favicon (BtB monogram or bread icon). | `index.html`, favicon files |

**Verification:**
- App renders correctly at 320px, 375px, 480px, 768px, and 1024px widths.
- Header stays fixed on scroll.
- All routes render the correct page. Unknown routes show the 404 page.
- Lighthouse accessibility score is 90+.

---

### 2.5 Generator UI Components

The interactive elements the user sees and touches: category rows, buttons, toggles, and the sandwich visual.

| # | Item | Description | Deliverable |
|---|---|---|---|
| 1 | Roll All button | Full-width primary CTA. Pulsing animation on first load (stops after first roll). Disabled state during animation. "Roll the Dice" label, changes to "Roll Again" after first roll. | `/src/components/RollAllButton.tsx` |
| 2 | Category Row component | A single row showing: lock toggle, category emoji, category label, current result (or placeholder), dice re-roll button. Color-coded per category. Dice button uses category color with glow shadow. | `/src/components/CategoryRow.tsx` |
| 3 | Category Row list | Renders all five base categories in display order (bread → protein → cheese → toppings → condiments). Maps over category config. | `/src/components/CategoryList.tsx` |
| 4 | Lock/unlock toggle | Padlock icon button on each row. Disabled when no result. Visual state change (🔒/🔓). `aria-pressed` for accessibility. | Lock logic in `CategoryRow.tsx` |
| 5 | Dice re-roll button | Per-category re-roll. Spin animation during roll. Disabled when category is locked or another roll is in progress. | Dice button in `CategoryRow.tsx` |
| 6 | Text cycling animation | During a roll, the result text rapidly cycles through random ingredient names from the pool (80ms interval) with a shimmer opacity effect before landing on the final selection. | Animation in `CategoryRow.tsx` |
| 7 | Cascading roll orchestration | Roll All triggers categories sequentially with 200ms stagger (bread → protein → cheese → toppings → condiments). Each category cycles for ~640ms (8 cycles × 80ms) before resolving. Locked categories are skipped. | Roll orchestration hook |
| 8 | Sandwich visual builder | Stacked visual representation of the sandwich. Each ingredient renders as a colored layer with category-appropriate height and shape (rounded top/bottom for bread). Layers animate in with spring-eased drop from above. Completed sandwich floats gently. | `/src/components/SandwichVisual.tsx` |
| 9 | Empty state | When no rolls have occurred: the visual area shows "Roll the dice to build your sandwich..." in italic Libre Baskerville. The Roll All button pulses. | Empty state in visual component |
| 10 | Summary card | Appears after all categories are resolved. Displays sandwich name (Libre Baskerville bold), full ingredient description in italic, fade-up entrance animation. | `/src/components/SummaryCard.tsx` |

**Verification:**
- Roll All produces results in all five categories with correct stagger timing.
- Individual re-roll works for each category.
- Locked categories cannot be re-rolled via Roll All or individual dice.
- Text cycling animation runs during rolls and stops cleanly on resolution.
- Sandwich visual layers appear with spring animation.
- Completed sandwich floats with gentle up-down animation.
- Summary card appears with fade-up animation after all categories resolve.
- All buttons meet 44px minimum touch target.
- `prefers-reduced-motion` disables all animations.
- Screen reader announces roll results via `aria-live` region.

---

### 2.6 Session History (Non-Persistent)

A lightweight in-memory history so users can review sandwiches they've generated during the current session.

| # | Item | Description | Deliverable |
|---|---|---|---|
| 1 | Session state management | Store an in-memory array of generated sandwiches for the current session. Each entry includes the composition, name, and timestamp. Limit to 20 entries (FIFO). Cleared on page refresh. | React state or context |
| 2 | History drawer/panel | A collapsible panel (or slide-out drawer) showing session sandwiches. Each entry shows the sandwich name and a "Load" action to re-populate the generator with that composition. | `/src/components/SessionHistory.tsx` |
| 3 | History trigger | A "History (N)" button or link below the generator that opens the panel. Shows count of sandwiches generated this session. Hidden when count is zero. | Button in generator UI |

**Verification:**
- Generated sandwiches appear in history.
- Clicking a history entry re-populates the generator.
- History clears on page refresh.
- History caps at 20 entries, oldest removed first.

---

### 2.7 Analytics Setup (Phase 1 Events)

Instrument the core interactions so you have data from day one.

| # | Item | Description | Deliverable |
|---|---|---|---|
| 1 | Install and configure PostHog | Install `posthog-js`. Initialize with project key. Disable autocapture, enable manual event tracking. Configure pageview and pageleave capture. | PostHog initialization in app entry |
| 2 | Implement generator events | Track: `generator_rolled_all`, `generator_rolled_category`, `generator_locked_category`, `generator_unlocked_category`, `generator_sandwich_completed`, `generator_chefs_special_triggered`. Include all properties defined in the Analytics Plan. | Event calls in generator logic |
| 3 | Implement performance tracking | Capture `performance_page_load` event on initial load using the Web Performance API (LCP, FID, CLS, TTFB). | Performance observer utility |
| 4 | Implement page view tracking | Verify `navigation_page_viewed` fires on every route change. | PostHog auto-capture or manual |
| 5 | Create Overview dashboard | Set up the Overview Dashboard in PostHog: DAU, rolls per day, sandwiches completed, avg rolls per session, device split. | PostHog dashboard |
| 6 | Create Performance dashboard | Set up the Performance Dashboard: LCP/CLS/FID percentiles, performance by device and connection type. | PostHog dashboard |

**Verification:**
- Events appear in PostHog Live Events view during local development.
- `generator_sandwich_completed` fires exactly once per complete sandwich (not on partial rolls).
- Performance metrics are captured and visible in the Performance dashboard.
- No PII is sent to PostHog.

---

### Phase 1 Launch Checklist

- [ ] All 5 category rows render and roll correctly.
- [ ] Lock/unlock works on all categories.
- [ ] Sandwich visual builder displays all layers with correct stacking.
- [ ] Summary card shows correct sandwich name and ingredient description.
- [ ] Roll All cascading animation runs with correct timing.
- [ ] Session history stores and loads sandwiches.
- [ ] Responsive layout works from 320px to 1440px.
- [ ] Lighthouse Performance ≥ 90, Accessibility ≥ 90, Best Practices ≥ 90.
- [ ] Core Web Vitals: LCP < 1.5s, CLS < 0.1, FID < 100ms.
- [ ] Bundle size < 150KB (gzipped).
- [ ] PostHog events firing correctly in production.
- [ ] 404 page renders for unknown routes.
- [ ] About, Privacy, Terms pages render (placeholder content is OK for soft launch).
- [ ] DNS configured, HTTPS active, `www` redirects to non-`www`.
- [ ] No console errors in production build.

---

## 3. Phase 2: Intelligence, Sharing, and Cost/Nutrition

**Goal:** Add the intelligence layer (Smart Mode, dietary filters), virality mechanics (sharing), and informational features (cost, nutrition). This phase introduces the backend.

---

### 3.1 Backend Infrastructure

Stand up the backend services that Phase 2 features depend on.

| # | Item | Description | Deliverable |
|---|---|---|---|
| 1 | Create Supabase project | Set up the Supabase project. Configure the PostgreSQL database. Set the project URL and anon key as environment variables. | Supabase project |
| 2 | Create `categories` table | Run the `CREATE TABLE categories` migration from the Database Schema doc. Enable RLS with public read policy. | Migration file |
| 3 | Create `ingredients` table | Run the `CREATE TABLE ingredients` migration. Enable RLS with public read policy for enabled ingredients. Create indexes (category+enabled, dietary tags GIN). | Migration file |
| 4 | Seed categories and ingredients | Insert all 6 categories and 111 ingredients from the Ingredient Data JSON file into the database. | Seed script |
| 5 | Create `shared_sandwiches` table | Run the `CREATE TABLE shared_sandwiches` migration. Enable RLS with public read and public insert policies. Create the unique hash index and expiration index. | Migration file |
| 6 | Create `compat_matrix` table | Run the `CREATE TABLE compat_matrix` migration. Enable RLS with public read policy. | Migration file |
| 7 | Seed compatibility matrix | Insert the pairwise affinity scores for all 8 flavor groups (~36 rows). | Seed script |
| 8 | Set up Vercel API routes | Configure the `/api` directory for Vercel Serverless Functions. Install the Supabase client library. Create a shared Supabase client initialization module. | `/api/_lib/supabase.ts` |
| 9 | Implement API response helpers | Create reusable helpers for success responses, error responses, and validation consistent with the API Endpoints spec (envelope format, error codes, status codes). | `/api/_lib/response.ts` |

**Verification:**
- Supabase dashboard shows all tables with correct columns and RLS policies.
- `SELECT count(*) FROM ingredients` returns 111.
- `SELECT count(*) FROM categories` returns 6.
- API route at `/api/health` returns 200 (basic connectivity test).

---

### 3.2 Ingredients API

Migrate from static JSON to a live API for ingredient data.

| # | Item | Description | Deliverable |
|---|---|---|---|
| 1 | `GET /api/ingredients` | Implement the list endpoint. Return all enabled ingredients grouped by category with the full response shape from the API spec. Support the `diet` query parameter for dietary filtering. | `/api/ingredients/index.ts` |
| 2 | `GET /api/ingredients/:id` | Implement the single ingredient endpoint. Return the ingredient with its parent category info. 404 for missing or disabled ingredients. | `/api/ingredients/[id].ts` |
| 3 | Migrate frontend to API | Replace the static JSON import with an API call to `GET /api/ingredients` on app load. Cache the response in React state (no refetching during session). Show a loading skeleton while fetching. | Updated data layer |
| 4 | Add loading and error states | Implement a loading skeleton for category rows (shimmer placeholder). Implement an error state if the API call fails ("Something went wrong. Tap to retry."). | Loading/error components |

**Verification:**
- Frontend loads ingredients from the API (visible in Network tab).
- Dietary filter parameter correctly reduces the returned ingredients.
- Loading skeleton appears briefly on initial load.
- Error state renders when the API is unreachable (test with network throttling).

---

### 3.3 Dietary Filters

Let users restrict ingredients by dietary preference.

| # | Item | Description | Deliverable |
|---|---|---|---|
| 1 | Filter toggle UI | Create a row of toggle pill buttons above the category rows: Vegetarian, Vegan, Gluten-Free, Dairy-Free. Use the `btn-toggle` style from the Design System. `aria-pressed` for accessibility. | `/src/components/DietaryFilters.tsx` |
| 2 | Filter state management | Track active dietary filters in app state. When filters change, re-fetch ingredients with the `diet` query parameter (or filter client-side from the cached full dataset). | Filter state hook |
| 3 | Empty pool warning | If a dietary filter combination reduces any category's pool to zero ingredients, display a warning badge on that category row ("No options available") and disable its dice button. | Warning UI in CategoryRow |
| 4 | Re-roll with filters | When filters are applied, any subsequent rolls only select from the filtered pool. If a locked ingredient no longer matches the active filters, show a visual indicator but do not unlock it. | Filter integration in randomizer |
| 5 | Track filter events | Fire `filter_dietary_toggled` and `filter_dietary_warning` events per the Analytics Plan. | Analytics integration |

**Verification:**
- Toggling "Vegan" removes all non-vegan ingredients from rolls.
- Combining "Vegan" + "Gluten-Free" applies intersection logic (both tags required).
- Empty pool warning appears when a filter combination eliminates all options in a category.
- Locked ingredients are preserved even when they don't match active filters.

---

### 3.4 Smart Mode

Compatibility-weighted randomization that builds flavor-coherent sandwiches.

| # | Item | Description | Deliverable |
|---|---|---|---|
| 1 | `GET /api/compat-matrix` | Implement the compatibility matrix endpoint. Return the full symmetric matrix as a nested lookup object. | `/api/compat-matrix/index.ts` |
| 2 | Smart Mode toggle UI | A toggle switch in the generator controls area. Badge indicator ("Smart" badge from Design System) when active. | Toggle in generator UI |
| 3 | Weighted selection algorithm | Implement `rollCategorySmart(category, previousSelections, matrix)`. Bread is rolled first without weighting. Subsequent categories use the compat groups of already-selected ingredients to weight probabilities. 10% probability floor ensures no ingredient is completely excluded. | `/src/engine/smart-randomizer.ts` |
| 4 | Sequential roll order | In Smart Mode, Roll All rolls categories sequentially (bread first, then protein, then cheese, then toppings, then condiments) so each subsequent roll can factor in prior selections. | Modified roll orchestration |
| 5 | Track Smart Mode events | Fire `generator_smart_mode_toggled` per the Analytics Plan. Include `smart_mode` property on `generator_sandwich_completed`. | Analytics integration |
| 6 | Unit test weighted selection | Verify probability distribution: same-group ingredients should appear significantly more often than cross-group. Verify 10% floor: no ingredient has 0% probability. Test with statistical sampling (1000+ rolls). | `/src/engine/__tests__/smart-randomizer.test.ts` |

**Verification:**
- With Smart Mode on, rolling Italian bread (Ciabatta) significantly increases the probability of Italian proteins (Salami, Prosciutto, etc.).
- No ingredient ever has 0% probability (10% floor).
- Smart Mode toggle state is reflected in the UI badge.
- `generator_sandwich_completed` event includes `smart_mode: true` when active.

---

### 3.5 Double Toggles and Chef's Special

Additional generator mechanics that add variety and surprise.

| # | Item | Description | Deliverable |
|---|---|---|---|
| 1 | Double Protein toggle | Add a small "x2" pill toggle on the Protein category row. When active, the randomizer selects 2 proteins instead of 1. Sandwich name generator handles double picks ("Turkey & Bacon on Sourdough"). | Toggle in CategoryRow, randomizer logic |
| 2 | Double Cheese toggle | Same as above for the Cheese category row. | Toggle in CategoryRow, randomizer logic |
| 3 | Chef's Special trigger mechanic | When toppings are rolled, check if either trigger ingredient (Chef's Pick A or Chef's Pick B) is among the selected toppings. If so (~20% activation rate), remove the trigger from the visible toppings and roll one item from the Chef's Special category. | Trigger logic in randomizer |
| 4 | Chef's Special UI | A sixth category row that only appears when triggered. Animated entrance with `chefsReveal` animation (golden shimmer, 800ms). Purple color theme. "Chef's Special!" badge. Cannot be locked. Disappears if toppings are re-rolled and trigger is not hit. | `/src/components/ChefsSpecialRow.tsx` |
| 5 | Track double and Chef's Special events | Fire `generator_double_toggled` and `generator_chefs_special_triggered` per the Analytics Plan. | Analytics integration |

**Verification:**
- Double Protein produces 2 unique proteins. Sandwich name reflects both.
- Double Cheese produces 2 unique cheeses (excluding "No Cheese" + another combo if "No Cheese" is selected).
- Chef's Special triggers approximately 20% of the time toppings are rolled.
- Chef's Special row animates in with shimmer effect and disappears cleanly on re-roll without trigger.
- Chef's Special row cannot be locked.

---

### 3.6 Shareable Sandwich Links

Let users share their generated sandwiches via URL.

| # | Item | Description | Deliverable |
|---|---|---|---|
| 1 | Hash generation utility | Create a function to generate short, unique alphanumeric hashes (8 characters). Use a collision-resistant approach (nanoid or similar). | `/api/_lib/hash.ts` |
| 2 | `POST /api/sandwiches/share` | Implement the share endpoint. Validate composition (all required categories, valid ingredient IDs). Generate hash. Store in `shared_sandwiches` table with 90-day expiration. Return hash and full URL. | `/api/sandwiches/share/index.ts` |
| 3 | `GET /api/sandwiches/share/:hash` | Implement the shared sandwich retrieval endpoint. Resolve ingredient IDs to full objects (name, image_asset). Return snapshot cost and nutrition. 404 for missing or expired hashes. | `/api/sandwiches/share/[hash].ts` |
| 4 | Share button UI | Add a "Share" button to the summary card. On click: call the POST endpoint, copy the returned URL to clipboard, show a toast notification ("Link copied to clipboard!"). | Share button in SummaryCard |
| 5 | Shared sandwich page | Create the `/sandwich/[hash]` route. Render the Sandwich Card Page template: sandwich visual, name, full ingredient list, cost range, nutrition summary. "Make Your Own" CTA button linking to home. | `/src/pages/SharedSandwich.tsx` |
| 6 | Open Graph meta tags | Server-side render (or pre-render) the OG meta tags for shared sandwich URLs: `og:title` = sandwich name, `og:description` = ingredient list, `og:image` = generated or template OG image. | OG tag generation |
| 7 | Track share events | Fire `share_link_created`, `share_link_copied`, `share_link_visited`, `share_make_your_own_clicked` per the Analytics Plan. | Analytics integration |

**Verification:**
- Clicking Share creates a link, copies to clipboard, and shows toast.
- Pasting the link in a new browser tab renders the shared sandwich correctly.
- The shared sandwich page shows the correct visual, name, and ingredient list.
- Pasting the link in Slack/Discord/Twitter shows the correct OG preview.
- Expired or invalid hashes show the 404 page.
- "Make Your Own" CTA navigates to the home page.

---

### 3.7 Estimated Cost Display

Show users what their sandwich would cost at retail or a restaurant.

| # | Item | Description | Deliverable |
|---|---|---|---|
| 1 | Cost calculation utility | Create `calculateTotalEstimatedCost(composition, context)` that sums the `estimated_cost.retail_low` / `retail_high` or `restaurant_low` / `restaurant_high` for all selected ingredients, returning a `{low, high}` range. | `/src/utils/cost.ts` |
| 2 | Cost context toggle | A "Retail / Restaurant" segmented control or toggle on the summary card. Default is Retail. Switching recalculates the displayed range. | Toggle in SummaryCard |
| 3 | Cost display | Show the range in the summary card: "Estimated retail cost: $4.20 – $8.50" or "Estimated restaurant cost: $12.60 – $25.50". Update dynamically on re-rolls and context toggle. | Cost display in SummaryCard |
| 4 | Cost disclaimer | Persistent small-text disclaimer below the cost display: "Estimated pricing is approximate. [Context-specific explanation]. Pricing data last updated: [date]." Date pulled from ingredient data meta. | Disclaimer text |
| 5 | Track cost context event | Fire `generator_cost_context_toggled` per the Analytics Plan. | Analytics integration |

**Verification:**
- Cost range updates when categories are re-rolled.
- Toggling between Retail and Restaurant shows different ranges.
- Disclaimer text changes to match the active context.
- Cost for "No Cheese" contributes $0 to the total.
- Cost for trigger ingredients contributes $0.

---

### 3.8 Nutrition Summary

Show estimated nutritional information for the generated sandwich.

| # | Item | Description | Deliverable |
|---|---|---|---|
| 1 | Nutrition calculation utility | Create `calculateTotalNutrition(composition)` that sums all 7 nutrition fields (calories, protein, fat, carbs, fiber, sodium, sugar) across all selected ingredients. | `/src/utils/nutrition.ts` |
| 2 | Collapsible nutrition panel | A "Show nutrition" toggle below the cost display on the summary card. Expands to reveal a grid of nutrition values. Collapse by default. Animated expand/collapse. | `/src/components/NutritionPanel.tsx` |
| 3 | Nutrition display | Grid layout showing: Calories, Protein (g), Fat (g), Carbs (g), Fiber (g), Sodium (mg), Sugar (g). Prominent number with small label below. | Panel content |
| 4 | Nutrition disclaimer | Include within the panel: "Nutritional information is estimated based on USDA standard serving sizes and may not reflect actual nutritional content." | Disclaimer text |
| 5 | Track nutrition events | Fire `nutrition_panel_expanded` and `nutrition_panel_collapsed` per the Analytics Plan. | Analytics integration |

**Verification:**
- Nutrition totals are correct (manually verify against ingredient data for a known sandwich).
- Panel expands and collapses with animation.
- Nutrition updates when categories are re-rolled.
- Trigger ingredients and "No Cheese" contribute zero to all nutrition fields.

---

### Phase 2 Launch Checklist

- [ ] Dietary filters correctly restrict ingredient pools.
- [ ] Smart Mode produces noticeably more coherent sandwiches than Pure Random.
- [ ] Double toggles produce 2 selections and name reflects both.
- [ ] Chef's Special triggers ~20% of the time and animates correctly.
- [ ] Share button creates a working link that renders the shared sandwich page.
- [ ] OG meta tags render correctly in link previews (test with Twitter Card Validator, Facebook Sharing Debugger).
- [ ] Cost display shows correct ranges for both Retail and Restaurant contexts.
- [ ] Nutrition panel shows correct totals and expands/collapses cleanly.
- [ ] All Phase 2 analytics events fire correctly in PostHog.
- [ ] Generator and Sharing dashboards are set up in PostHog.
- [ ] API endpoints return correct response shapes (test against the API spec).
- [ ] Rate limiting is active on share creation endpoint.
- [ ] Database tables have correct RLS policies (test with Supabase SQL editor).
- [ ] No regression in Phase 1 functionality.
- [ ] Lighthouse scores maintained at 90+.

---

## 4. Phase 3: Accounts and Persistence

**Goal:** Enable user accounts so people can save, rate, and revisit sandwiches. Preferences persist across sessions.

---

### 4.1 Authentication

User accounts via Supabase Auth.

| # | Item | Description | Deliverable |
|---|---|---|---|
| 1 | Configure Supabase Auth | Enable email/password and OAuth (Google, Apple) providers in the Supabase dashboard. Configure redirect URLs for production and localhost. | Supabase Auth config |
| 2 | Create `profiles` table | Run the `CREATE TABLE profiles` migration. Create the `handle_new_user()` trigger function that auto-creates a profile on signup. Enable RLS policies (users can read/update own profile). | Migration file |
| 3 | Auth context provider | Create a React context that wraps the app with Supabase Auth state. Expose: `user`, `session`, `signUp()`, `signIn()`, `signInWithOAuth()`, `signOut()`, `loading`. | `/src/context/AuthContext.tsx` |
| 4 | Login page | Create `/login` page with email/password form, Google OAuth button, Apple OAuth button, and link to signup. Styled with the Design System form inputs. Redirect to `?redirect` param or home after success. | `/src/pages/Login.tsx` |
| 5 | Signup page | Create `/signup` page with email/password form, OAuth buttons, and link to login. On successful signup, create profile and redirect. | `/src/pages/Signup.tsx` |
| 6 | Auth-aware header | Update the header: show "Log in" for guests, show account dropdown (display name or email, Settings, History, Log out) for authenticated users. | Updated Header component |
| 7 | Auth gate utility | Create a higher-order component or hook that redirects unauthenticated users to `/login?redirect=[current_path]` when they try to access auth-gated pages. Preserve sandwich state across the redirect. | `/src/utils/authGate.ts` |
| 8 | `GET /api/auth/session` | Implement the session validation endpoint. Verify the JWT server-side. | `/api/auth/session.ts` |
| 9 | Track auth events | Fire `account_signed_up`, `account_logged_in`, `account_logged_out`, `account_auth_prompted` per the Analytics Plan. Identify users in PostHog on login. | Analytics integration |

**Verification:**
- Email/password signup creates a user in Supabase and a profile in the `profiles` table.
- Google and Apple OAuth flows complete successfully and create profiles.
- Authenticated users see the account dropdown in the header.
- Auth-gated pages redirect to login with the correct redirect URL.
- After login, users are redirected back to where they came from.
- Session persists across page refreshes (30-day sliding expiration).

---

### 4.2 User Profile and Preferences

Persist user preferences so they're auto-applied on return visits.

| # | Item | Description | Deliverable |
|---|---|---|---|
| 1 | `GET /api/profile` | Implement the profile read endpoint. Return the user's profile with all preferences. | `/api/profile/index.ts` (GET) |
| 2 | `PATCH /api/profile` | Implement the profile update endpoint. Validate input fields per the API spec. | `/api/profile/index.ts` (PATCH) |
| 3 | `DELETE /api/profile` | Implement the account deletion endpoint. Require `confirm: true`. Delete profile, cascade to saved sandwiches, delete Supabase Auth user. | `/api/profile/index.ts` (DELETE) |
| 4 | Settings page | Create `/account/settings` page. Display name field, dietary filter defaults, Smart Mode default, Double toggles default, cost context preference. Save button persists to profile. Account deletion button with confirmation modal. | `/src/pages/Settings.tsx` |
| 5 | Auto-apply preferences | On app load for authenticated users, fetch the profile and auto-apply: dietary filters, Smart Mode toggle, Double toggles, cost context. | Preference loading in app init |
| 6 | Sync preference changes | When an authenticated user changes a toggle (dietary filter, Smart Mode, double, cost context) in the generator, offer to save as default (or auto-save silently). | Preference sync logic |

**Verification:**
- Preferences saved in settings are applied when the user returns.
- Changing toggles in the generator reflects in the settings page.
- Account deletion removes all user data and logs the user out.
- Settings page is only accessible to authenticated users (redirects to login if guest).

---

### 4.3 Saved Sandwich History

Persistent history of generated sandwiches with ratings and favorites.

| # | Item | Description | Deliverable |
|---|---|---|---|
| 1 | `POST /api/sandwiches/saved` | Implement the save endpoint. Validate composition. Store with pre-computed name, estimated cost, and nutrition. FIFO eviction trigger handles the 50-sandwich limit. | `/api/sandwiches/saved/index.ts` (POST) |
| 2 | `GET /api/sandwiches/saved` | Implement the list endpoint with all query parameters: `q`, `ingredient`, `rating`, `favorites_only`, `sort`, `limit`, `offset`. | `/api/sandwiches/saved/index.ts` (GET) |
| 3 | `PATCH /api/sandwiches/saved/:id` | Implement the update endpoint for rating and favorite changes. | `/api/sandwiches/saved/[id].ts` (PATCH) |
| 4 | `DELETE /api/sandwiches/saved/:id` | Implement single sandwich deletion. | `/api/sandwiches/saved/[id].ts` (DELETE) |
| 5 | `DELETE /api/sandwiches/saved` (clear all) | Implement clear-all with `confirm` and `include_favorites` flags. | `/api/sandwiches/saved/index.ts` (DELETE) |
| 6 | Save button UI | Add a "Save" button to the summary card (next to Share). For guests, show an auth prompt ("Save this sandwich? Log in to keep your history."). For authenticated users, save immediately and show toast confirmation. | Save button in SummaryCard |
| 7 | History page | Create `/account/history` page. List of saved sandwiches with name, date, rating stars, favorite star, and delete button. Search bar, filter controls (favorites only, rating filter), sort dropdown. Pagination. | `/src/pages/History.tsx` |
| 8 | History search | Implement the search bar that calls the `GET` endpoint with the `q` parameter. Debounced input (300ms). Show result count. | Search in History page |
| 9 | Limit warning | When the user has 45+ saved sandwiches, show a subtle warning: "You're approaching your 50-sandwich limit." At 50, show: "History full. Remove a sandwich or unfavorite one to make room." | Warning component |

**Verification:**
- Saving a sandwich creates an entry in the database and appears in the history page.
- Search finds sandwiches by name and ingredient name.
- Rating a sandwich updates the star display and persists.
- Favoriting a sandwich persists and is filterable.
- At 50 sandwiches, the oldest non-favorited is evicted on new save.
- Clear all with `include_favorites: false` preserves favorites.

---

### 4.4 Star Rating System

Rate sandwiches 1-5 stars.

| # | Item | Description | Deliverable |
|---|---|---|---|
| 1 | Star rating component | A row of 5 interactive stars. Hover preview (fill stars up to hovered position). Click sets the rating. Display current rating with filled stars. Accessible with `aria-label` announcing value and label. | `/src/components/StarRating.tsx` |
| 2 | Rating on summary card | Add the star rating component to the summary card. For guests, show an auth prompt on click. For authenticated users, save the sandwich if not already saved, then set the rating. | Rating in SummaryCard |
| 3 | Rating on history page | Show the star rating on each history entry. Clickable to change rating. | Rating in History list item |
| 4 | Track rating events | Fire `history_sandwich_rated` with rating value, previous rating, and sandwich name. | Analytics integration |

**Verification:**
- Star rating saves to the database and persists across sessions.
- Rating a sandwich from the summary card auto-saves the sandwich.
- Changing a rating updates the stored value.
- Rating tooltip labels match the Design System (1 = "Very Poor / Terrible" through 5 = "Excellent / Masterpiece").

---

### 4.5 Auth Prompt System

Graceful prompts for guests who try to use auth-gated features.

| # | Item | Description | Deliverable |
|---|---|---|---|
| 1 | Auth prompt modal | A modal that appears when a guest tries to save, rate, or favorite. Message: "Log in to [action]." Two CTAs: "Log in" (goes to login page with redirect) and "Not now" (dismisses). | `/src/components/AuthPrompt.tsx` |
| 2 | Preserve state across auth | When a guest is redirected to login from an auth prompt, store the current sandwich state (composition, name) in sessionStorage. After login redirect, restore the state so the user doesn't lose their sandwich. | State preservation logic |
| 3 | Track auth prompt events | Fire `account_auth_prompted` with `action_attempted` property. Track conversion via funnel (prompt → signup). | Analytics integration |

**Verification:**
- Guest clicking Save shows the auth prompt, not a broken state.
- After logging in via the prompt, the user returns to their sandwich and the save completes.
- "Not now" dismisses the prompt without side effects.

---

### 4.6 Phase 3 Analytics

Complete the analytics instrumentation and dashboards.

| # | Item | Description | Deliverable |
|---|---|---|---|
| 1 | Implement all Phase 3 events | Instrument: all `history_*` events, all `account_*` events, `history_searched`. | Analytics integration |
| 2 | PostHog user identification | Call `posthog.identify(userId)` on login. Set user properties: `signup_method`, `signup_date`, `signup_trigger`. Update behavioral properties on relevant events. | PostHog identify calls |
| 3 | Create Account & Retention dashboard | Set up in PostHog: signup rate, signup method split, auth prompt conversion funnel, save rate, rating distribution, 7-day and 30-day retention cohorts. | PostHog dashboard |
| 4 | Set up alerts | Configure anomaly alerts: traffic drop (50% DAU drop), error spike (3x above average), performance degradation (p75 LCP > 2500ms), zero completions for 1 hour. | PostHog alerts |

**Verification:**
- Authenticated users show up as identified in PostHog with correct properties.
- Retention cohort chart shows data after 7+ days of production traffic.
- Alerts fire correctly (test by temporarily lowering thresholds).

---

### Phase 3 Launch Checklist

- [ ] Email/password signup and login work end-to-end.
- [ ] Google and Apple OAuth work end-to-end.
- [ ] User preferences persist across sessions.
- [ ] Settings page saves and loads all preferences.
- [ ] Account deletion removes all user data.
- [ ] Save button works for authenticated users, shows auth prompt for guests.
- [ ] History page displays saved sandwiches with search, filter, and sort.
- [ ] Star rating saves and persists.
- [ ] FIFO eviction works at the 50-sandwich limit.
- [ ] Auth prompt preserves sandwich state through the login redirect.
- [ ] All Phase 3 analytics events fire correctly.
- [ ] Account & Retention dashboard is live.
- [ ] No regression in Phase 1 or Phase 2 functionality.
- [ ] RLS policies prevent users from accessing each other's data (test with two accounts).

---

## 5. Phase 4: Future Features

**Goal:** Extend the platform beyond a randomizer into a sandwich community and reference resource. These sections are architectural outlines, not detailed build plans. They will be fully specced when development begins.

---

### 5.1 Sandwich Database (Encyclopedia)

| # | Item | Description |
|---|---|---|
| 1 | Database table and seed data | Create `sandwich_database` table with full-text search. Curate the initial 50-100 iconic sandwiches with editorial content. |
| 2 | Database API endpoints | `GET /api/database` (list/search), `GET /api/database/:slug` (single entry). |
| 3 | Database index page | Browsable, searchable index at `/sandwiches`. Card grid layout. Filter by region, diet. |
| 4 | Individual sandwich page | Dedicated page at `/sandwiches/:slug` using the Sandwich Card Page template. Origin, history, canonical ingredients, ratings. |
| 5 | Rating system for database entries | Authenticated users can rate database sandwiches. Aggregate average displayed. |
| 6 | Comments and photos | User-submitted comments and photos with moderation queue. |

---

### 5.2 Community Leaderboard

| # | Item | Description |
|---|---|---|
| 1 | Community sandwiches table | Create `community_sandwiches` table with aggregation logic (deduplication by composition). |
| 2 | Leaderboard API endpoints | `GET /api/community` with sort options (top rated, most popular, trending). |
| 3 | Leaderboard page | Browsable leaderboard at `/community`. Card grid with ranking indicators. |
| 4 | Community sandwich page | Individual pages at `/community/:slug` using the shared Sandwich Card Page template. |
| 5 | "Try This Sandwich" flow | CTA that loads a community sandwich's composition into the generator. |

---

### 5.3 Global Search

| # | Item | Description |
|---|---|---|
| 1 | `GET /api/search` | Unified search endpoint across database, community, and saved history. Full-text search with weighted relevance scoring. |
| 2 | Search results page | Dedicated `/search` page with query input, source filter, dietary filter, ingredient filter, and paginated results. |
| 3 | Search header integration | Persistent search icon in the header that expands into a search bar. Always visible for all users. |

---

### 5.4 Monetization

| # | Item | Description |
|---|---|---|
| 1 | Display ads | Integrate Google AdSense. Place ad units in non-intrusive positions (below the generator, sidebar on desktop, between history entries). Cookie consent banner required. |
| 2 | Affiliate links | Add affiliate links to ingredient names or a "Buy Ingredients" section. Partner with grocery delivery services. FTC disclosure required. |
| 3 | Analytics events | Track `ad_impression`, `ad_clicked`, `affiliate_link_clicked`, `affiliate_link_converted`. |
| 4 | Privacy policy update | Update the privacy policy to disclose ad tracking, affiliate partnerships, and cookie usage. |

---

### 5.5 Admin and Content Management

| # | Item | Description |
|---|---|---|
| 1 | Admin role and auth | Create admin role in Supabase. Protect `/api/admin/*` endpoints with role check. |
| 2 | Ingredient management | CRUD interface for ingredients: add, edit, disable, update cost/nutrition, manage dietary tags. |
| 3 | Compatibility matrix editor | UI for adjusting flavor group affinity scores. |
| 4 | Content moderation queue | Review and approve/reject user-submitted comments and photos. |
| 5 | Analytics dashboard in admin | Embedded PostHog dashboards or custom admin analytics page. |

---

## 6. Cross-Phase Work

Work that spans multiple phases or runs in parallel with feature development.

---

### 6.1 Ingredient Visual Assets

| # | Item | Description | Phase |
|---|---|---|---|
| 1 | Establish art style | Generate 10-15 test assets across categories using AI image generation. Validate the semi-realistic illustration style defined in the Design System (side profile, transparent background, warm lighting, consistent dimensions). | Pre-Phase 1 |
| 2 | Create prompt template | Develop a reusable prompt template that produces consistent results. Document the template for reproducibility. | Pre-Phase 1 |
| 3 | Generate all 111 assets | Batch-generate images for all ingredients. Manual quality review and regeneration for any inconsistencies. | Phase 1 (blocking) |
| 4 | Post-process assets | Ensure all assets have transparent backgrounds, correct dimensions (280px wide @2x), consistent lighting, and are optimized for web (PNG compression). | Phase 1 |
| 5 | Integrate into app | Place all assets in `/public/assets/ingredients/[category]/[slug].png`. Verify all `image_asset` paths in the ingredient data resolve correctly. | Phase 1 |

---

### 6.2 Content Writing

| # | Item | Description | Phase |
|---|---|---|---|
| 1 | About page | Write the About page content. Brand story, how the randomizer works, team/creator info. | Phase 1 (before public launch) |
| 2 | Privacy Policy | Write or generate a privacy policy covering: analytics (PostHog), session cookies, data storage, user data rights (CCPA). Legal review recommended. | Phase 1 (before public launch) |
| 3 | Terms of Service | Write or generate terms covering: acceptable use, intellectual property, limitation of liability, dispute resolution. Legal review recommended. | Phase 1 (before public launch) |
| 4 | Error page copy | Write friendly error messages for 404 ("This Sandwich Doesn't Exist (Yet)") and 500 ("Something Went Wrong") pages. | Phase 1 |
| 5 | UI microcopy | Write all button labels, tooltips, empty states, disclaimers, and toast messages. Consistent with the Voice and Tone guidelines in the Design System. | Phase 1 |
| 6 | OG descriptions | Write the default Open Graph description for the home page and template for shared sandwiches. | Phase 2 |
| 7 | Onboarding copy | Write any first-visit tooltips or hints (if added). | Phase 2 |

---

### 6.3 Testing Strategy

| # | Item | Description | Phase |
|---|---|---|---|
| 1 | Unit testing framework | Set up Vitest (or Jest) for unit tests. Configure coverage reporting. Target: 80%+ coverage on engine and utility code. | Phase 1 |
| 2 | Component testing | Set up React Testing Library for component tests. Test interactive flows (roll, lock, toggle). | Phase 1 |
| 3 | End-to-end testing | Set up Playwright or Cypress for E2E tests. Key flows: Roll All, re-roll, lock, share (Phase 2), login/save (Phase 3). | Phase 2 |
| 4 | Accessibility audit | Run axe-core automated tests. Manual keyboard navigation audit. Manual screen reader testing (VoiceOver on macOS, NVDA on Windows). | Each phase |
| 5 | Cross-browser testing | Test on Chrome, Safari, Firefox, Edge. Test on iOS Safari and Android Chrome. Focus on animation performance and touch interactions. | Each phase |
| 6 | Load testing | For Phase 2+: load test the share creation endpoint. Verify rate limiting works under load. | Phase 2 |

---

### 6.4 Performance Budget

| # | Item | Description | Phase |
|---|---|---|---|
| 1 | Bundle size monitoring | Set up `vite-plugin-bundle-analyzer` or equivalent. Phase 1 target: < 150KB gzipped. Set up CI check to fail if exceeded. | Phase 1 |
| 2 | Image optimization | All ingredient assets served as optimized PNGs. Consider WebP with PNG fallback. Implement lazy loading for off-screen images. | Phase 1 |
| 3 | Core Web Vitals monitoring | Track LCP, CLS, FID in PostHog. Set up weekly review cadence. | Phase 1 |
| 4 | API response time budget | All API endpoints must respond in < 200ms (p95). Monitor via Vercel analytics. | Phase 2 |
| 5 | Database query optimization | Review slow query logs in Supabase. Ensure indexes are used for all frequent queries. | Phase 2 |

---

## 7. Dependency Map

```
Phase 1
├── 2.1 Project Scaffolding ─────────────────────────────┐
├── 2.2 Ingredient Data Layer (depends on 2.1) ──────────┤
├── 2.3 Randomization Engine (depends on 2.2) ───────────┤
├── 2.4 App Shell and Layout (depends on 2.1) ───────────┤
├── 2.5 Generator UI (depends on 2.3, 2.4) ──────────────┤
├── 2.6 Session History (depends on 2.5) ─────────────────┤
└── 2.7 Analytics Setup (depends on 2.1) ─────────────────┘
                                                          |
Phase 2                                                   |
├── 3.1 Backend Infrastructure (depends on Phase 1) ──────┤
├── 3.2 Ingredients API (depends on 3.1) ─────────────────┤
├── 3.3 Dietary Filters (depends on 3.2) ─────────────────┤
├── 3.4 Smart Mode (depends on 3.1, 3.2) ────────────────┤
├── 3.5 Double Toggles & Chef's Special (depends on 2.5) ┤
├── 3.6 Shareable Links (depends on 3.1) ─────────────────┤
├── 3.7 Estimated Cost Display (depends on 3.2) ──────────┤
└── 3.8 Nutrition Summary (depends on 3.2) ───────────────┘
                                                          |
Phase 3                                                   |
├── 4.1 Authentication (depends on 3.1) ──────────────────┤
├── 4.2 User Profile & Preferences (depends on 4.1) ─────┤
├── 4.3 Saved Sandwich History (depends on 4.1) ──────────┤
├── 4.4 Star Rating System (depends on 4.3) ──────────────┤
├── 4.5 Auth Prompt System (depends on 4.1) ──────────────┤
└── 4.6 Phase 3 Analytics (depends on 4.1-4.5) ──────────┘
```

---

## 8. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Ingredient asset generation takes longer than expected | High | Blocks Phase 1 launch | Start asset generation immediately, in parallel with code development. Generate test batch of 15 early to validate style. |
| OG image generation for shared links is complex | Medium | Degrades share experience | Start with a static template image. Upgrade to dynamic OG images in a post-launch iteration. |
| Smart Mode compatibility weights feel wrong | Medium | Feature feels broken | Start with conservative weights (nothing below 0.3 except genuinely incompatible pairings). Tune based on analytics and user feedback post-launch. |
| Supabase free tier limits hit | Low | Service degradation | Monitor usage. The free tier (50K MAU, 500MB database, 1GB file storage) is generous for early traffic. Upgrade to Pro ($25/month) if needed. |
| OAuth provider approval delays | Medium | Blocks Phase 3 | Start the Google and Apple OAuth app registration process at the beginning of Phase 2, not Phase 3. Approval can take days to weeks. |
| Legal content (Privacy, Terms) not ready | Medium | Blocks public launch | Use a privacy policy generator for V1. Schedule legal review as a non-blocking follow-up. |
| Animation performance on low-end mobile | Medium | Poor UX for some users | Test on a low-end Android device early. The `prefers-reduced-motion` fallback is mandatory. Profile animation FPS on target devices during Phase 1 development. |
| Share link abuse (spam creation) | Low | Database bloat, cost | Rate limiting (10 shares/min/IP) is spec'd. 90-day TTL auto-expires stale links. Add a cleanup cron job. |

---

### Revision History

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0 | 2026-03-01 | Draft | Initial build plan for Between the Bread |
