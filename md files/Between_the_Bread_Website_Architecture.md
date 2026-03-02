# Between the Bread — Website Architecture Document

**Project Name:** Between the Bread
**Domain:** betweenbread.co
**Version:** 1.0
**Date:** March 1, 2026
**Status:** Draft
**Related Document:** Between the Bread PRD v1.0

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [URL Structure Conventions](#2-url-structure-conventions)
3. [Site Map](#3-site-map)
4. [Navigation Structure](#4-navigation-structure)
5. [Page Templates and Shared Layouts](#5-page-templates-and-shared-layouts)
6. [Page Specifications](#6-page-specifications)
7. [User Flows](#7-user-flows)
8. [Authentication States](#8-authentication-states)
9. [Redirects and Error Handling](#9-redirects-and-error-handling)
10. [Future Architecture Considerations](#10-future-architecture-considerations)

---

## 1. Architecture Overview

Between the Bread launches as a single-feature product (the Random Sandwich Generator) and evolves into a multi-section sandwich platform. The V1 architecture must support the immediate feature set while establishing URL patterns, navigation slots, and template structures that accommodate planned expansions without breaking changes.

### 1.1 Architecture Principles

- **URL stability:** Once a URL is live and indexed, it never changes. Future features are additive, not restructuring.
- **Progressive disclosure:** V1 navigation is minimal and focused. New sections are added to navigation as they launch, not before.
- **Template reuse:** Pages that share structure (e.g., sandwich database entries and leaderboard entries) use the same underlying template from the start.
- **SEO-first URL design:** URLs are human-readable, keyword-rich, and follow a consistent hierarchy.
- **Auth-optional:** Every page has a meaningful experience for unauthenticated users. Auth unlocks additional functionality, never gates core content.

---

## 2. URL Structure Conventions

### 2.1 General Rules

- All URLs are lowercase, hyphen-separated, with no trailing slashes.
- No file extensions in URLs (no `.html`, no `.php`).
- Maximum URL depth of 3 segments (e.g., `betweenbread.co/sandwiches/cuban-sandwich`).
- Query parameters are used for filters and transient state only (e.g., `?diet=vegan`), never for core page identity.
- Fragment identifiers (`#section`) are used for in-page navigation only.
- All URLs are served over HTTPS. HTTP requests redirect to HTTPS with a 301.

### 2.2 URL Hierarchy

```
betweenbread.co/                              # Home / Generator
betweenbread.co/sandwich/[hash]               # Shared sandwich result
betweenbread.co/account                       # User account hub
betweenbread.co/account/history               # Saved sandwich history
betweenbread.co/account/settings              # Account settings
betweenbread.co/about                         # About page
betweenbread.co/privacy                       # Privacy policy
betweenbread.co/terms                         # Terms of service

# FUTURE (reserved, not built in V1)
betweenbread.co/search                        # Search results page
betweenbread.co/search?q=[query]              # Search with query
betweenbread.co/sandwiches                    # Sandwich database index
betweenbread.co/sandwiches/[slug]             # Individual sandwich entry
betweenbread.co/community                     # Community hub / leaderboard
betweenbread.co/community/[slug]              # Individual community sandwich
betweenbread.co/blog                          # Blog index
betweenbread.co/blog/[slug]                   # Individual blog post
```

### 2.3 Slug Conventions

- Sandwich database slugs are derived from the sandwich name: "Cuban Sandwich" becomes `cuban-sandwich`.
- Shared sandwich hashes are short, non-sequential alphanumeric strings (8-12 characters, e.g., `a3f8k2m9`).
- Community sandwich slugs combine a sanitized name with a short hash for uniqueness: `pastrami-gruyere-sourdough-a3f8`.
- Blog post slugs are derived from the post title, truncated to 60 characters max.

---

## 3. Site Map

### 3.1 V1 Site Map

```
betweenbread.co
|
+-- / (Home)
|   The Random Sandwich Generator ("The Delicatessen of Destiny")
|   Primary landing page and core feature.
|
+-- /sandwich/[hash] (Shared Sandwich)
|   Read-only view of a specific generated sandwich.
|   Accessed via shared links.
|
+-- /account (Account Hub) [AUTH REQUIRED]
|   |
|   +-- /account/history (Sandwich History)
|   |   Saved sandwiches with ratings and favorites.
|   |
|   +-- /account/settings (Account Settings)
|       Profile, dietary preferences, email, password, delete account.
|
+-- /login (Login Page)
|   Email/password and OAuth (Google, Apple).
|
+-- /signup (Registration Page)
|   Account creation flow.
|
+-- /about (About Page)
|   What is Between the Bread, team/creator info, contact.
|
+-- /privacy (Privacy Policy)
|
+-- /terms (Terms of Service)
```

### 3.2 Future Site Map (Planned, Not Built in V1)

```
betweenbread.co
|
+-- /search (Search Results Page) [FUTURE]
|   Unified search across sandwich database, community,
|   and user's saved history. Filterable by source, diet,
|   ingredient, region, and rating.
|
+-- /sandwiches (Sandwich Database Index) [FUTURE]
|   |   Browsable, searchable encyclopedia of world sandwiches.
|   |   Filterable by region, ingredients, dietary tags.
|   |
|   +-- /sandwiches/[slug] (Sandwich Entry Page) [FUTURE]
|       Individual sandwich with history, details, origin,
|       user ratings, comments, and photos.
|
+-- /community (Community Hub) [FUTURE]
|   |   Leaderboard: Top Rated, Most Popular, Trending.
|   |   Filterable by dietary category, ingredient.
|   |
|   +-- /community/[slug] (Community Sandwich Page) [FUTURE]
|       Individual community-generated sandwich with ratings,
|       comments, photos, and "Try This Sandwich" button.
|
+-- /blog (Blog Index) [FUTURE]
|   |
|   +-- /blog/[slug] (Blog Post) [FUTURE]
|
+-- /account/favorites (Favorites Page) [FUTURE]
|   Dedicated page for starred sandwiches (currently inline in history).
```

### 3.3 Page Count Summary

| Phase | Pages | Notes |
|---|---|---|
| V1 | 9 | Home, shared sandwich, account hub, history, settings, login, signup, about, privacy/terms |
| V1 + Phase 2 | 10 | Adds shared sandwich pages (same template, more traffic) |
| V1 + Phase 3 | 10 | Adds authenticated account features (same pages, richer functionality) |
| Future | 15+ | Adds sandwich database, community, blog sections |

---

## 4. Navigation Structure

### 4.1 Header Navigation (V1)

The header is persistent across all pages. It adapts based on authentication state and current page.

```
+-----------------------------------------------------------------------+
|  [Logo: Between the Bread]              [Search 🔍]  [Login] / [Account ▾]   |
+-----------------------------------------------------------------------+
```

**Logo:** Always links to home (`/`). Text logo or wordmark, no icon-only logo in V1.

**Search icon:** A magnifying glass icon that expands into a search input field on click/tap. In V1, search is scoped to the user's saved sandwich history only (requires auth). For unauthenticated users, the search icon is hidden in V1 since there is nothing to search. When the sandwich database and community features launch, search becomes a prominent, always-visible element for all users.

**Right-side actions (unauthenticated):**
- "Log In" text link (links to `/login`)

**Right-side actions (authenticated):**
- User avatar or initials icon
- Dropdown on click: "My Sandwiches" (`/account/history`), "Settings" (`/account/settings`), "Log Out"

**V1 has no primary navigation links** in the header beyond the logo and auth action. The site is a single-feature product and doesn't need nav links yet. Adding empty nav items for future sections (Sandwiches, Community) before they exist creates a confusing experience.

### 4.2 Header Navigation (Future)

When additional sections launch, the header expands:

```
+-----------------------------------------------------------------------+
|  [Logo]    Generator    Sandwiches    Community    [Search 🔍]  [Account ▾]   |
+-----------------------------------------------------------------------+
```

- "Generator" links to `/` (the randomizer)
- "Sandwiches" links to `/sandwiches` (the database)
- "Community" links to `/community` (the leaderboard)
- Search icon expands into a full search bar. Queries route to `/search?q=[query]`.
- Active section is visually highlighted

### 4.3 Footer Navigation (V1)

The footer is persistent across all pages and contains secondary/legal links.

```
+-----------------------------------------------------------------------+
|  Between the Bread                                                     |
|                                                                        |
|  Generator    About    Privacy Policy    Terms of Service              |
|                                                                        |
|  © 2026 Between the Bread. All rights reserved.                       |
+-----------------------------------------------------------------------+
```

### 4.4 Footer Navigation (Future)

Expands to include additional sections and potentially an affiliate disclosure link:

```
+-----------------------------------------------------------------------+
|  Between the Bread                                                     |
|                                                                        |
|  EXPLORE             COMPANY            LEGAL                          |
|  Generator           About              Privacy Policy                 |
|  Sandwich Database   Blog               Terms of Service               |
|  Community           Contact            Affiliate Disclosure           |
|                                                                        |
|  © 2026 Between the Bread. All rights reserved.                       |
+-----------------------------------------------------------------------+
```

### 4.5 Mobile Navigation (V1)

On mobile (<480px), the header collapses to:

```
+---------------------------------------+
|  [Logo]              [🔍]  [☰ Menu]   |
+---------------------------------------+
```

The search icon opens an expandable search input overlay. The hamburger menu opens a slide-out or full-screen overlay containing: "Log In" or account links, "About," and footer legal links. In V1 the search icon is hidden for unauthenticated users. When the database and community launch, search is always visible.

---

## 5. Page Templates and Shared Layouts

### 5.1 Template Overview

V1 uses three page templates. Future sections reuse and extend these templates to minimize development effort.

| Template | V1 Pages | Future Pages | Description |
|---|---|---|---|
| **App Shell** | Home (`/`) | -- | Full-width interactive application layout. No sidebar. Minimal chrome. The generator lives here. |
| **Content Page** | About, Privacy, Terms | Blog posts | Centered single-column reading layout. Max-width 720px. Suitable for long-form text. |
| **Account Page** | Account Hub, History, Settings | Favorites | Sidebar navigation (account sub-pages) + main content area. Auth-gated. |
| **Sandwich Card Page** | Shared Sandwich (`/sandwich/[hash]`) | Sandwich Database entries, Community entries, Leaderboard entries | Standardized sandwich display: visual stack, ingredient list, metadata, and action buttons. Ratings, comments, and photos are additive modules on this template. |
| **Search Results Page** | -- | Search (`/search`) | Search input, filter controls, and a list of result cards. Results link to their respective pages (database entry, community entry, or saved sandwich detail). Future template, reserved. |

### 5.2 Shared Layout: App Frame

All pages share a common outer frame:

```
+-----------------------------------------------------------------------+
|  [Header]                                                              |
+-----------------------------------------------------------------------+
|                                                                        |
|                         [Page Content]                                 |
|                    (template-specific area)                            |
|                                                                        |
+-----------------------------------------------------------------------+
|  [Footer]                                                              |
+-----------------------------------------------------------------------+
```

- Header and footer are rendered at the layout level, not per-page.
- Page content area is the only part that changes between routes.
- On the Home page, the footer is pushed below the fold to keep the generator front and center.

### 5.3 Template: App Shell (Home Page)

```
+-----------------------------------------------------------------------+
|  [Header]                                                              |
+-----------------------------------------------------------------------+
|                                                                        |
|  [Title / Tagline Block]                                               |
|                                                                        |
|  [Sandwich Visual Builder]          <- max-width 480px, centered       |
|                                                                        |
|  [Roll All Button]                                                     |
|                                                                        |
|  [Mode Toggle: Smart Mode]                                             |
|  [Dietary Filters (collapsible)]                                       |
|                                                                        |
|  [Category Row: Bread]                                                 |
|  [Category Row: Protein]                                               |
|  [Category Row: Cheese]                                                |
|  [Category Row: Toppings]                                              |
|  [Category Row: Condiments]                                            |
|  [Category Row: Chef's Special]     <- conditional                     |
|                                                                        |
|  [Summary Card]                     <- appears after all rolls         |
|    - Sandwich name                                                     |
|    - Estimated cost                                                    |
|    - Share / Save / Rate buttons                                       |
|                                                                        |
|  [Nutrition Panel (collapsible)]                                       |
|                                                                        |
|  [History Panel (collapsible)]                                         |
|                                                                        |
+-----------------------------------------------------------------------+
|  [Footer]                                                              |
+-----------------------------------------------------------------------+
```

### 5.4 Template: Sandwich Card Page

This template is critical because it is reused across three current and future contexts: shared sandwich results (V1), sandwich database entries (future), and community leaderboard entries (future). Design it once, extend it with modules.

```
+-----------------------------------------------------------------------+
|  [Header]                                                              |
+-----------------------------------------------------------------------+
|                                                                        |
|  [Sandwich Visual Stack]            <- same component as home page     |
|                                                                        |
|  [Sandwich Title & Description]                                        |
|    - Name (e.g., "Pastrami & Gruyere on Sourdough")                   |
|    - Full ingredient list                                              |
|    - Estimated cost + Nutrition summary                                |
|                                                                        |
|  [Action Bar]                                                          |
|    - Share button                                                      |
|    - "Make Your Own" button (links to home with combo pre-loaded)      |
|    - Save button (auth)                                                |
|    - Rate (auth)                                                       |
|                                                                        |
|  [MODULE: Origin & History]         <- FUTURE: sandwich database only  |
|  [MODULE: User Ratings Aggregate]   <- FUTURE: database + community   |
|  [MODULE: User Comments]            <- FUTURE: database + community   |
|  [MODULE: User Photos Gallery]      <- FUTURE: database + community   |
|                                                                        |
+-----------------------------------------------------------------------+
|  [Footer]                                                              |
+-----------------------------------------------------------------------+
```

### 5.5 Template: Content Page

```
+-----------------------------------------------------------------------+
|  [Header]                                                              |
+-----------------------------------------------------------------------+
|                                                                        |
|  [Page Title]                       <- max-width 720px, centered       |
|                                                                        |
|  [Body Content]                                                        |
|    - Rendered Markdown or rich text                                    |
|    - Supports headings, paragraphs, images, links                     |
|                                                                        |
+-----------------------------------------------------------------------+
|  [Footer]                                                              |
+-----------------------------------------------------------------------+
```

### 5.6 Template: Account Page

```
+-----------------------------------------------------------------------+
|  [Header]                                                              |
+-----------------------------------------------------------------------+
|                                                                        |
|  [Account Sidebar]     |  [Main Content Area]                         |
|    - My Sandwiches     |    Content varies by sub-page:               |
|    - Settings          |    - History: list of saved sandwiches       |
|    - Log Out           |    - Settings: form fields                   |
|                        |                                               |
+-----------------------------------------------------------------------+
|  [Footer]                                                              |
+-----------------------------------------------------------------------+
```

On mobile (<768px), the sidebar collapses into a horizontal tab bar or dropdown above the main content area.

---

## 6. Page Specifications

### 6.1 Home Page (`/`)

| Attribute | Detail |
|---|---|
| **Template** | App Shell |
| **Purpose** | Primary landing page and core product experience. The Random Sandwich Generator. |
| **SEO Title** | Between the Bread - Random Sandwich Generator |
| **Meta Description** | Discover your next sandwich with Between the Bread's random sandwich generator. Roll the dice, mix ingredients, and find your perfect combo. |
| **OG Image** | Branded hero image showing a stylized sandwich stack with the Between the Bread logo. |
| **Key Components** | Sandwich visual builder, Roll All button, category rows (5 standard + Chef's Special conditional), Smart Mode toggle, dietary filters, summary card, cost estimate, nutrition panel, history panel. |
| **Auth Behavior** | Fully functional for guests. Auth adds: persistent history, save/favorite, star ratings, persistent filter preferences. |

### 6.2 Shared Sandwich Page (`/sandwich/[hash]`)

| Attribute | Detail |
|---|---|
| **Template** | Sandwich Card Page |
| **Purpose** | Display a specific generated sandwich combination via a shared link. |
| **SEO Title** | [Protein] & [Cheese] on [Bread] - Between the Bread |
| **Meta Description** | Check out this sandwich: [Protein] & [Cheese] on [Bread] with [Toppings] and [Condiments]. Generate your own random sandwich at Between the Bread. |
| **OG Image** | Dynamically generated or pre-rendered image of the sandwich visual stack for rich link previews. |
| **Key Components** | Sandwich visual stack, full ingredient list, estimated cost, nutrition summary, Share button (re-copy link), "Make Your Own" CTA button. |
| **Auth Behavior** | Fully viewable by anyone. Auth adds: Save and Rate buttons. |
| **Edge Cases** | Invalid or expired hash: show 404 page with CTA to generate a new sandwich. |

### 6.3 Login Page (`/login`)

| Attribute | Detail |
|---|---|
| **Template** | Content Page (centered, narrow) |
| **Purpose** | User authentication. |
| **Key Components** | Email/password form, "Or sign in with" OAuth buttons (Google, Apple), "Forgot password" link, "Don't have an account? Sign up" link. |
| **Post-Login Redirect** | Return user to the page they were on before login (store referrer). Default to home if no referrer. |

### 6.4 Signup Page (`/signup`)

| Attribute | Detail |
|---|---|
| **Template** | Content Page (centered, narrow) |
| **Purpose** | New account creation. |
| **Key Components** | Email/password form with password requirements, OAuth sign-up buttons, "Already have an account? Log in" link, Terms/Privacy agreement checkbox. |
| **Post-Signup Redirect** | Return to referrer page or home. |

### 6.5 Account Hub (`/account`)

| Attribute | Detail |
|---|---|
| **Template** | Account Page |
| **Purpose** | Central hub for authenticated user's account. Redirects to `/account/history` by default (no standalone hub page needed in V1). |
| **Auth Behavior** | Auth required. Unauthenticated visitors are redirected to `/login?redirect=/account`. |

### 6.6 Sandwich History (`/account/history`)

| Attribute | Detail |
|---|---|
| **Template** | Account Page |
| **Purpose** | View, manage, rate, and favorite saved sandwiches. |
| **Key Components** | List of saved sandwiches (max 50) sorted by most recent. Each entry shows: sandwich name, full ingredients, timestamp, star rating (editable), favorite toggle. Clicking an entry expands to show full details or navigates to a sandwich card view. "Clear All History" action with confirmation. |
| **Auth Behavior** | Auth required. |

### 6.7 Account Settings (`/account/settings`)

| Attribute | Detail |
|---|---|
| **Template** | Account Page |
| **Purpose** | Manage profile, preferences, and account. |
| **Key Components** | Display name, email (changeable), password change, default dietary filters, Smart Mode default preference, "Delete Account" with confirmation flow. |
| **Auth Behavior** | Auth required. |

### 6.8 About Page (`/about`)

| Attribute | Detail |
|---|---|
| **Template** | Content Page |
| **Purpose** | Tell the story of Between the Bread. Build brand trust and personality. |
| **Key Components** | Project description, creator info, mission/vision, contact information or form, link to the generator as CTA. |
| **Auth Behavior** | Public, no auth required. |

### 6.9 Privacy Policy (`/privacy`)

| Attribute | Detail |
|---|---|
| **Template** | Content Page |
| **Purpose** | Legal privacy policy. |
| **Key Components** | Standard privacy policy covering data collection, cookies, third-party services, user rights, contact for data requests. Must address CCPA (California) requirements. Should preemptively include language for future cookie consent (ads) and affiliate tracking even if not yet implemented. |
| **Auth Behavior** | Public, no auth required. |

### 6.10 Terms of Service (`/terms`)

| Attribute | Detail |
|---|---|
| **Template** | Content Page |
| **Purpose** | Legal terms of use. |
| **Key Components** | Standard terms covering acceptable use, intellectual property, limitation of liability, user-generated content rights (forward-looking for comments/photos), disclaimers for cost and nutritional estimates. |
| **Auth Behavior** | Public, no auth required. |

---

## 7. User Flows

### 7.1 First-Time Visitor (Core Flow)

```
[User lands on betweenbread.co]
         |
         v
[Home page loads with empty sandwich builder]
         |
         v
[User clicks "Roll the Dice"]
         |
         v
[Staggered animation rolls all 5 categories]
[~20% chance Chef's Special triggers]
         |
         v
[Sandwich visual builds layer by layer]
[Summary card appears with name, cost, nutrition]
         |
         v
[User has several options:]
    |           |              |              |
    v           v              v              v
[Re-roll    [Lock some     [Click         [Click
 all]       & re-roll       "Share"]       "Save"]
             rest]              |              |
                               v              v
                        [URL copied      [Prompted to
                         to clipboard]    create account]
```

### 7.2 Shared Link Visitor Flow

```
[User clicks shared link: betweenbread.co/sandwich/a3f8k2m9]
         |
         v
[Sandwich Card Page loads with full sandwich display]
[Visual stack, ingredients, cost, nutrition]
         |
         v
[User sees "Make Your Own" CTA button]
         |
         v
[Clicks CTA]
         |
         v
[Redirected to home page (/)]
[Generator loads fresh, ready to roll]
```

### 7.3 Return Visitor (Authenticated) Flow

```
[User lands on betweenbread.co, already logged in]
         |
         v
[Home page loads]
[Dietary filter preferences auto-applied]
[Smart Mode preference auto-applied]
         |
         v
[User rolls a sandwich]
         |
         v
[Summary card shows with Save + Rate options]
         |
         v
[User clicks "Save"]
         |
         v
[Sandwich saved to history]
[Star rating widget activates]
         |
         v
[User rates 4 stars ("Good / Above Average")]
         |
         v
[Rating saved to history entry]
[User can view in /account/history anytime]
```

### 7.4 Account Creation Flow

```
[User clicks "Save" or "Rate" on summary card (unauthenticated)]
         |
         v
[Modal or redirect to /signup?redirect=/]
         |
         v
[User signs up via email or OAuth]
         |
         v
[Account created, user redirected back to home]
[Previous sandwich state is preserved in session]
[User can now save and rate the sandwich they just generated]
```

### 7.5 Dietary Filter Flow

```
[User opens dietary filter panel on home page]
         |
         v
[Toggles: Vegetarian ON, Gluten-Free ON]
         |
         v
[Ingredient pools are filtered immediately]
[Category option counts update visually]
         |
         v
[User rolls]
         |
         v
[Only eligible ingredients appear in results]
         |
         v
[If any category has 0 eligible options:]
    |
    v
[Warning displayed: "No [category] options match
 your filters. Try loosening your dietary restrictions."]
[Category shows placeholder, roll proceeds for others]
```

### 7.6 Smart Mode Flow

```
[User toggles "Smart Mode" ON]
         |
         v
[Visual indicator shows Smart Mode is active]
         |
         v
[User clicks "Roll the Dice"]
         |
         v
[Bread rolls first (unweighted)]
         |
         v
[Protein rolls, weighted by bread's compatGroup]
         |
         v
[Cheese rolls, weighted by bread + protein compatGroups]
         |
         v
[Toppings roll, weighted by all prior selections]
         |
         v
[Condiments roll, weighted by all prior selections]
         |
         v
[Result: coherent flavor-profile sandwich]
[10% probability floor ensures surprises still occur]
```

### 7.7 Chef's Special Trigger Flow

```
[User rolls (Roll All or re-rolls Toppings)]
         |
         v
[Toppings category selects 1-4 items from pool of 22]
         |
         v
[System checks if any selected item is a trigger]
         |
    +----+----+
    |         |
    v         v
[No trigger]  [Trigger found]
    |              |
    v              v
[Normal       [Trigger item silently removed from
 display]      displayed toppings]
                   |
                   v
              [Chef's Special row animates in
               with shimmer/glow effect]
                   |
                   v
              [Single item auto-rolled from
               Chef's Special pool (15 items)]
                   |
                   v
              [Summary card includes:
               "with a Chef's Special: [item]"]
```

### 7.8 Search Flow (Future)

```
[User clicks search icon in header]
         |
         v
[Search input expands / search page loads]
         |
         v
[User types query (e.g., "cuban")]
         |
         v
[Results load from /api/search?q=cuban]
[Results grouped by source: Database, Community, Saved]
         |
         v
[User can filter results:]
    |           |              |              |
    v           v              v              v
[By source   [By dietary    [By            [By minimum
 (database,   restriction]   ingredient]    rating]
  community,
  saved)]
         |
         v
[User clicks a result]
         |
    +----+----+
    |         |
    v         v
[Database  [Community
 entry      entry
 page]      page]
```

**V1 behavior:** Search is limited to the authenticated user's saved sandwich history only, accessible via the history page (`/account/history`) filter controls rather than a dedicated search page. The global `/search` page launches with the sandwich database and community features.

---

## 8. Authentication States

### 8.1 State Definitions

| State | Definition |
|---|---|
| **Guest** | No account. No session. Default state for all new visitors. |
| **Authenticated** | Logged in with a valid session. Has access to account features. |
| **Auth-Prompted** | Guest user who attempted an auth-gated action. Shown login/signup with redirect back to context. |

### 8.2 Per-Page Authentication Behavior

| Page | Guest | Authenticated |
|---|---|---|
| **Home (`/`)** | Full generator access. Session-only history. Save/Rate buttons prompt signup. | Full generator access. Persistent history, save, rate, favorites. Dietary and Smart Mode preferences auto-applied. |
| **Shared Sandwich (`/sandwich/[hash]`)** | Full read-only view. Share and "Make Your Own" buttons work. Save/Rate prompt signup. | Full view plus Save and Rate functionality. |
| **Login (`/login`)** | Login form displayed. | Redirects to `/account/history`. |
| **Signup (`/signup`)** | Signup form displayed. | Redirects to `/account/history`. |
| **Account Hub (`/account`)** | Redirects to `/login?redirect=/account`. | Redirects to `/account/history`. |
| **History (`/account/history`)** | Redirects to `/login?redirect=/account/history`. | Full history with ratings, favorites, delete. |
| **Settings (`/account/settings`)** | Redirects to `/login?redirect=/account/settings`. | Full settings access. |
| **About (`/about`)** | Full access. | Full access. |
| **Privacy (`/privacy`)** | Full access. | Full access. |
| **Terms (`/terms`)** | Full access. | Full access. |

### 8.3 Session Management

- Sessions are managed via secure, httpOnly cookies (not localStorage).
- Session duration: 30 days with sliding expiration (refreshed on activity).
- "Remember me" is the default behavior (no explicit checkbox needed).
- Expired sessions redirect to `/login` with the original URL as the redirect parameter.
- OAuth sessions follow the same cookie-based session management after the initial token exchange.

### 8.4 Auth-Prompted Interactions

When a guest user attempts a gated action, the system preserves context:

- **Save sandwich:** The current sandwich state is stored in a session cookie. After signup/login, the sandwich is automatically saved to history.
- **Rate sandwich:** Same as save. After auth, the rating widget is immediately available on the restored sandwich.
- **Account pages:** The requested URL is passed as a `?redirect=` parameter and honored after auth.

---

## 9. Redirects and Error Handling

### 9.1 Redirect Rules

| Trigger | From | To | Status Code |
|---|---|---|---|
| HTTP to HTTPS | `http://betweenbread.co/*` | `https://betweenbread.co/*` | 301 |
| www to non-www | `www.betweenbread.co/*` | `betweenbread.co/*` | 301 |
| Trailing slash removal | `betweenbread.co/about/` | `betweenbread.co/about` | 301 |
| Auth-gated page (guest) | `/account/*` | `/login?redirect=[original]` | 302 |
| Login (already auth'd) | `/login` | `/account/history` | 302 |
| Signup (already auth'd) | `/signup` | `/account/history` | 302 |
| Account hub | `/account` | `/account/history` | 302 |

### 9.2 Error Pages

#### 404 Not Found

**Triggers:** Invalid URL, expired or invalid sandwich hash, any unrecognized route.

**Design:** On-brand, friendly page that maintains the playful tone.

**Content:**

- Headline: "This Sandwich Doesn't Exist (Yet)"
- Subtext: "We couldn't find what you're looking for. Maybe it's time to create something new."
- Primary CTA: "Generate a Sandwich" (links to `/`)
- Secondary link: "Go back to the home page"

**Technical:** Returns a proper 404 HTTP status code (not a soft 404 with 200 status).

#### 500 Internal Server Error

**Triggers:** Unhandled server errors, API failures.

**Design:** Minimal, reassuring.

**Content:**

- Headline: "Something Went Wrong"
- Subtext: "We're having trouble on our end. Please try again in a moment."
- Primary CTA: "Try Again" (refreshes current page)
- Secondary CTA: "Go Home" (links to `/`)

**Technical:** Returns proper 500 status code. Error details logged server-side, never exposed to user.

#### 403 Forbidden

Not needed in V1. No content requires authorization beyond the account pages, which redirect to login rather than showing a 403.

### 9.3 Shared Sandwich Link Edge Cases

| Scenario | Behavior |
|---|---|
| Valid hash, sandwich exists | Render sandwich card page normally. |
| Invalid hash (malformed) | 404 page. |
| Expired hash (past TTL) | 404 page with messaging: "This sandwich link has expired. Generate a fresh one!" |
| Hash for sandwich with ingredients that have since been disabled | Render normally with all original ingredients. Disabled ingredients are only excluded from future rolls, not from historical records. |

---

## 10. Future Architecture Considerations

### 10.1 Reserved URL Patterns

The following URL patterns are reserved for future features. V1 routing should return a 404 for these paths but must not assign them to other purposes.

| Pattern | Future Feature | Notes |
|---|---|---|
| `/search` | Search results page | Unified search across all sandwich sources. |
| `/sandwiches` | Sandwich Database index | Browsable, searchable encyclopedia. |
| `/sandwiches/[slug]` | Individual sandwich entry | Unique page per classic sandwich. |
| `/community` | Community hub / leaderboard | Top Rated, Most Popular, Trending. |
| `/community/[slug]` | Community sandwich page | User-generated combos with social features. |
| `/blog` | Blog index | Content marketing, SEO. |
| `/blog/[slug]` | Blog post | Individual articles. |
| `/account/favorites` | Favorites page | Dedicated view for starred sandwiches. |
| `/api/*` | Public API | If API access is ever offered. |

### 10.2 Template Extension Plan

The Sandwich Card Page template (Section 5.4) is designed to accommodate future modules without restructuring:

| Module | Used By | V1 Status |
|---|---|---|
| Sandwich visual stack | Shared sandwich, Database, Community | Built in V1 |
| Ingredient list + metadata | Shared sandwich, Database, Community | Built in V1 |
| Action bar (share, save, rate) | Shared sandwich, Database, Community | Built in V1 |
| Origin & History (editorial) | Database only | Future |
| User Ratings (aggregate) | Database, Community | Future |
| User Comments (threaded) | Database, Community | Future |
| User Photos (gallery) | Database, Community | Future |
| "Try This Sandwich" pre-loader | Community only | Future |

### 10.3 Navigation Slot Reservation

The header navigation in V1 intentionally has empty space to the right of the logo. Future sections ("Sandwiches," "Community," "Blog") will be added as top-level nav items as they launch. The mobile hamburger menu will expand accordingly. No V1 code changes should be needed to add a nav item; the navigation component should accept a configurable list of routes.

### 10.4 SEO Architecture for Future Content

When the sandwich database and blog launch, each page will need:

- Unique `<title>` and `<meta description>` tags.
- Structured data (JSON-LD) for Recipe schema (sandwich database entries) and Article schema (blog posts).
- An XML sitemap generated dynamically as content is added.
- Internal linking strategy: sandwich database entries link to related generator results; blog posts link to relevant database entries; community pages link to "Try This Sandwich" on the generator.

### 10.5 Content Moderation Infrastructure

The community features (comments, photos) will require moderation tooling. Architectural decisions to make before those features launch:

- Automated content filtering (text toxicity detection, image NSFW detection).
- Admin review queue with approve/reject/flag workflow.
- User reporting mechanism on all user-generated content.
- Rate limiting on comment and photo submissions.
- The admin panel for moderation can be a separate internal tool or a protected route (e.g., `/admin`) that is not publicly linked.

---

### Revision History

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0 | 2026-03-01 | Draft | Initial website architecture document for Between the Bread |
