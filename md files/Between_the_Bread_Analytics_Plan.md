# Between the Bread — Analytics and Tracking Plan

**Project Name:** Between the Bread
**Analytics Platform:** PostHog
**Version:** 1.0
**Date:** March 1, 2026
**Status:** Draft
**Related Documents:** PRD v1.0, Website Architecture v1.0

---

## Table of Contents

1. [Overview](#1-overview)
2. [Implementation](#2-implementation)
3. [Event Taxonomy](#3-event-taxonomy)
4. [Event Definitions](#4-event-definitions)
5. [User Properties](#5-user-properties)
6. [Key Dashboards](#6-key-dashboards)
7. [Success Metrics Tracking](#7-success-metrics-tracking)
8. [Privacy and Compliance](#8-privacy-and-compliance)
9. [Future Tracking](#9-future-tracking)

---

## 1. Overview

### 1.1 Purpose

This document defines every tracked event, user property, and dashboard required to measure the success metrics defined in the PRD. The goal is to answer three questions at any point in time: Are users engaging with the core mechanic? Are they sharing and returning? What features are underused or broken?

### 1.2 Platform Choice

| Attribute | Detail |
|---|---|
| **Platform** | PostHog (Cloud) |
| **Tier** | Free (up to 1M events/month) |
| **SDK** | `posthog-js` (React integration) |
| **Data Residency** | US (default PostHog cloud) |
| **Session Replay** | Enabled for 1% of sessions initially, increase as needed |
| **Feature Flags** | Available for phased rollouts (Smart Mode, dietary filters) |

### 1.3 Phase Rollout

| Phase | Tracking Scope |
|---|---|
| **Phase 1** | Core generator events, page views, session metrics, performance |
| **Phase 2** | Sharing events, Smart Mode usage, dietary filter usage, cost/nutrition views |
| **Phase 3** | Account events, save/rate/favorite actions, history usage, search |
| **Future** | Database browsing, community engagement, ad impressions, affiliate clicks |

---

## 2. Implementation

### 2.1 SDK Setup

```javascript
import posthog from 'posthog-js';

posthog.init('phc_YOUR_PROJECT_KEY', {
    api_host: 'https://app.posthog.com',
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: false,           // Manual event tracking only for clean data
    persistence: 'localStorage',
    loaded: function(posthog) {
        // Identify user if authenticated
        if (user) {
            posthog.identify(user.id, {
                email: user.email,
                created_at: user.created_at
            });
        }
    }
});
```

### 2.2 Naming Conventions

All events follow a consistent naming pattern:

- **Format:** `category_action` (lowercase, underscore-separated)
- **Categories:** `generator`, `share`, `account`, `filter`, `history`, `navigation`, `search`, `performance`
- **Actions:** Past tense verbs (`rolled`, `clicked`, `toggled`, `saved`, `rated`, `shared`, `viewed`)

Examples: `generator_rolled_all`, `share_link_created`, `account_signed_up`, `filter_dietary_toggled`

### 2.3 Event Properties Convention

All events include the following default properties (automatically captured by PostHog):

- `$current_url` - Page URL
- `$device_type` - Desktop / Mobile / Tablet
- `$browser` - Browser name and version
- `$os` - Operating system
- `$screen_width` / `$screen_height` - Viewport dimensions
- `$referrer` - Referring URL
- `distinct_id` - Anonymous or authenticated user ID
- `timestamp` - Event timestamp

Custom properties are added per event as defined in Section 4.

---

## 3. Event Taxonomy

### 3.1 Complete Event List

| # | Event Name | Phase | Category | Trigger |
|---|---|---|---|---|
| 1 | `generator_rolled_all` | 1 | generator | User clicks Roll All button |
| 2 | `generator_rolled_category` | 1 | generator | User clicks individual category dice |
| 3 | `generator_locked_category` | 1 | generator | User locks a category |
| 4 | `generator_unlocked_category` | 1 | generator | User unlocks a category |
| 5 | `generator_sandwich_completed` | 1 | generator | All categories have a result |
| 6 | `generator_chefs_special_triggered` | 1 | generator | Chef's Special activates |
| 7 | `generator_double_toggled` | 2 | generator | User toggles Double on protein or cheese |
| 8 | `generator_smart_mode_toggled` | 2 | generator | User toggles Smart Mode |
| 9 | `generator_cost_context_toggled` | 2 | generator | User toggles between Retail and Restaurant pricing |
| 10 | `filter_dietary_toggled` | 2 | filter | User enables/disables a dietary filter |
| 11 | `filter_dietary_warning` | 2 | filter | Category reduced to zero options by filters |
| 12 | `share_link_created` | 2 | share | User creates a share link |
| 13 | `share_link_copied` | 2 | share | Share URL copied to clipboard |
| 14 | `share_link_visited` | 2 | share | Someone opens a shared sandwich page |
| 15 | `share_make_your_own_clicked` | 2 | share | "Make Your Own" CTA clicked on shared page |
| 16 | `nutrition_panel_expanded` | 2 | generator | User expands the nutrition panel |
| 17 | `nutrition_panel_collapsed` | 2 | generator | User collapses the nutrition panel |
| 18 | `account_signed_up` | 3 | account | User creates an account |
| 19 | `account_logged_in` | 3 | account | User logs in |
| 20 | `account_logged_out` | 3 | account | User logs out |
| 21 | `account_deleted` | 3 | account | User deletes account |
| 22 | `account_auth_prompted` | 3 | account | Guest user hits an auth-gated action |
| 23 | `history_sandwich_saved` | 3 | history | User saves a sandwich |
| 24 | `history_sandwich_rated` | 3 | history | User rates a sandwich |
| 25 | `history_sandwich_favorited` | 3 | history | User favorites a sandwich |
| 26 | `history_sandwich_unfavorited` | 3 | history | User unfavorites a sandwich |
| 27 | `history_sandwich_deleted` | 3 | history | User deletes a saved sandwich |
| 28 | `history_cleared` | 3 | history | User clears all history |
| 29 | `history_viewed` | 3 | history | User opens history page |
| 30 | `history_searched` | 3 | search | User searches within saved history |
| 31 | `navigation_page_viewed` | 1 | navigation | Any page view (auto-captured) |
| 32 | `performance_page_load` | 1 | performance | Page load metrics captured |

---

## 4. Event Definitions

### 4.1 Generator Events

#### `generator_rolled_all`

Fired when the user clicks the Roll All button.

| Property | Type | Description |
|---|---|---|
| `roll_number` | integer | Sequential roll count for this session (1st roll, 2nd roll, etc.) |
| `locked_categories` | string[] | List of category slugs that were locked during this roll |
| `smart_mode` | boolean | Whether Smart Mode was active |
| `active_dietary_filters` | string[] | Currently active dietary filters |
| `double_protein` | boolean | Whether double protein toggle was on |
| `double_cheese` | boolean | Whether double cheese toggle was on |

#### `generator_rolled_category`

Fired when the user clicks an individual category's dice button.

| Property | Type | Description |
|---|---|---|
| `category` | string | Category slug (e.g., "bread", "protein") |
| `roll_number` | integer | Sequential roll count for this category in this session |
| `previous_ingredient` | string | Ingredient slug that was replaced |
| `new_ingredient` | string | Ingredient slug that was selected |

#### `generator_locked_category`

| Property | Type | Description |
|---|---|---|
| `category` | string | Category slug |
| `locked_ingredient` | string | Ingredient slug that is being locked |

#### `generator_unlocked_category`

| Property | Type | Description |
|---|---|---|
| `category` | string | Category slug |

#### `generator_sandwich_completed`

Fired when all categories have a result (after a Roll All or after manually rolling the last empty category). This is the primary conversion event.

| Property | Type | Description |
|---|---|---|
| `sandwich_name` | string | Generated sandwich name |
| `bread` | string | Bread ingredient slug |
| `protein` | string[] | Protein ingredient slug(s) |
| `cheese` | string[] | Cheese ingredient slug(s) |
| `toppings` | string[] | Topping ingredient slugs |
| `condiments` | string[] | Condiment ingredient slugs |
| `chefs_special` | string or null | Chef's Special ingredient slug if triggered |
| `total_estimated_cost_retail_low` | number | Total estimated retail low cost |
| `total_estimated_cost_retail_high` | number | Total estimated retail high cost |
| `total_estimated_cost_restaurant_low` | number | Total estimated restaurant low cost |
| `total_estimated_cost_restaurant_high` | number | Total estimated restaurant high cost |
| `cost_context` | string | Active cost context at time of completion: "retail" or "restaurant" |
| `total_calories` | integer | Total calories |
| `total_rolls` | integer | How many total rolls (all + individual) it took to reach this result |
| `smart_mode` | boolean | Whether Smart Mode was active |
| `active_dietary_filters` | string[] | Active dietary filters |

#### `generator_chefs_special_triggered`

| Property | Type | Description |
|---|---|---|
| `chefs_special_ingredient` | string | Chef's Special ingredient slug |
| `trigger_topping` | string | Which trigger item was selected |
| `topping_count` | integer | Number of toppings rolled (1-4) |

#### `generator_double_toggled`

| Property | Type | Description |
|---|---|---|
| `category` | string | "protein" or "cheese" |
| `enabled` | boolean | New state of the toggle |

#### `generator_smart_mode_toggled`

| Property | Type | Description |
|---|---|---|
| `enabled` | boolean | New state of the toggle |

#### `generator_cost_context_toggled`

| Property | Type | Description |
|---|---|---|
| `context` | string | New cost context: "retail" or "restaurant" |
| `previous_context` | string | Previous cost context |

---

### 4.2 Filter Events

#### `filter_dietary_toggled`

| Property | Type | Description |
|---|---|---|
| `filter` | string | Filter slug: "vegetarian", "vegan", "gluten_free", "dairy_free" |
| `enabled` | boolean | New state of the filter |
| `active_filters` | string[] | All currently active filters after this change |

#### `filter_dietary_warning`

| Property | Type | Description |
|---|---|---|
| `category` | string | Category slug that was reduced to zero options |
| `active_filters` | string[] | Filters that caused the empty state |

---

### 4.3 Share Events

#### `share_link_created`

| Property | Type | Description |
|---|---|---|
| `hash` | string | Share link hash |
| `sandwich_name` | string | Sandwich name |

#### `share_link_copied`

| Property | Type | Description |
|---|---|---|
| `hash` | string | Share link hash |

#### `share_link_visited`

| Property | Type | Description |
|---|---|---|
| `hash` | string | Share link hash |
| `referrer` | string | Where the visitor came from |

#### `share_make_your_own_clicked`

| Property | Type | Description |
|---|---|---|
| `hash` | string | Share link hash of the sandwich they were viewing |

---

### 4.4 Account Events

#### `account_signed_up`

| Property | Type | Description |
|---|---|---|
| `method` | string | "email", "google", or "apple" |
| `trigger` | string | What prompted signup: "direct", "save_prompt", "rate_prompt", "history_prompt" |

#### `account_logged_in`

| Property | Type | Description |
|---|---|---|
| `method` | string | "email", "google", or "apple" |

#### `account_logged_out`

No custom properties.

#### `account_deleted`

No custom properties.

#### `account_auth_prompted`

| Property | Type | Description |
|---|---|---|
| `action_attempted` | string | The action that triggered the auth prompt: "save", "rate", "favorite", "history" |
| `converted` | boolean | Whether the user actually signed up after the prompt (tracked via funnel, not this event) |

---

### 4.5 History Events

#### `history_sandwich_saved`

| Property | Type | Description |
|---|---|---|
| `sandwich_name` | string | Sandwich name |
| `saved_count` | integer | User's total saved sandwich count after this save |

#### `history_sandwich_rated`

| Property | Type | Description |
|---|---|---|
| `rating` | integer | Star rating (1-5) |
| `previous_rating` | integer or null | Previous rating if changed, null if first rating |
| `sandwich_name` | string | Sandwich name |

#### `history_sandwich_favorited`

| Property | Type | Description |
|---|---|---|
| `sandwich_name` | string | Sandwich name |
| `total_favorites` | integer | User's total favorite count after this action |

#### `history_sandwich_unfavorited`

| Property | Type | Description |
|---|---|---|
| `sandwich_name` | string | Sandwich name |

#### `history_sandwich_deleted`

No custom properties beyond the default.

#### `history_cleared`

| Property | Type | Description |
|---|---|---|
| `deleted_count` | integer | Number of sandwiches deleted |
| `included_favorites` | boolean | Whether favorites were included in the clear |

#### `history_viewed`

No custom properties.

#### `history_searched`

| Property | Type | Description |
|---|---|---|
| `query` | string | Search query text |
| `results_count` | integer | Number of results returned |
| `filters_applied` | string[] | Any active filters (rating, favorites_only) |

---

### 4.6 Performance Events

#### `performance_page_load`

Captured automatically on initial page load using the Web Performance API.

| Property | Type | Description |
|---|---|---|
| `lcp_ms` | integer | Largest Contentful Paint in milliseconds |
| `fid_ms` | integer | First Input Delay in milliseconds |
| `cls` | number | Cumulative Layout Shift score |
| `ttfb_ms` | integer | Time to First Byte in milliseconds |
| `page` | string | Page path |
| `connection_type` | string | Network connection type (4g, 3g, wifi) |

---

## 5. User Properties

User properties are set on the PostHog user profile and persist across sessions. They are updated when values change.

### 5.1 Identity Properties

| Property | Type | Set When | Description |
|---|---|---|---|
| `user_id` | string | Account creation | Supabase auth user ID |
| `email` | string | Account creation | User email |
| `signup_method` | string | Account creation | "email", "google", or "apple" |
| `signup_date` | datetime | Account creation | Account creation timestamp |
| `signup_trigger` | string | Account creation | What prompted signup: "direct", "save_prompt", "rate_prompt" |

### 5.2 Behavioral Properties

| Property | Type | Updated When | Description |
|---|---|---|---|
| `total_rolls` | integer | Each roll | Lifetime total rolls across all sessions |
| `total_sandwiches_completed` | integer | Each completion | Lifetime total completed sandwiches |
| `total_shares` | integer | Each share | Lifetime total share links created |
| `total_saved` | integer | Each save/delete | Current saved sandwich count |
| `total_favorites` | integer | Each favorite/unfavorite | Current favorite count |
| `avg_rating_given` | number | Each rating | Average of all ratings this user has given |
| `uses_smart_mode` | boolean | Toggle change | Whether the user's current preference is Smart Mode on |
| `dietary_filters` | string[] | Filter change | User's current active dietary filters |
| `uses_double_protein` | boolean | Toggle change | Current double protein preference |
| `uses_double_cheese` | boolean | Toggle change | Current double cheese preference |
| `cost_context` | string | Context toggle | Current cost context preference: "retail" or "restaurant" |
| `last_active_at` | datetime | Any event | Last activity timestamp |

### 5.3 Cohort Tags

| Tag | Criteria | Purpose |
|---|---|---|
| `power_user` | 10+ completed sandwiches AND 3+ sessions | Identify high-engagement users |
| `sharer` | 1+ share links created | Users who drive organic growth |
| `rater` | 3+ ratings given | Users providing quality signal data |
| `churned` | No activity in 30+ days after 2+ sessions | Re-engagement targeting |

---

## 6. Key Dashboards

### 6.1 Overview Dashboard

The primary dashboard, checked daily.

| Widget | Metric | Visualization |
|---|---|---|
| Daily Active Users | Unique users per day | Line chart, 30-day trend |
| Rolls per Day | Total `generator_rolled_all` events | Line chart, 30-day trend |
| Sandwiches Completed | Total `generator_sandwich_completed` events | Line chart, 30-day trend |
| Avg Rolls per Session | Mean roll count per session | Single number with trend |
| Avg Session Duration | Mean session length | Single number with trend |
| Share Rate | `share_link_created` / `generator_sandwich_completed` | Percentage with trend |
| New Users vs Returning | First visit vs return visit | Stacked bar chart |
| Device Split | Desktop vs mobile vs tablet | Pie chart |

### 6.2 Generator Dashboard

Deep dive into the core mechanic.

| Widget | Metric | Visualization |
|---|---|---|
| Rolls per Session Distribution | Histogram of roll counts per session | Bar chart |
| Lock Usage Rate | % of rolls with at least one locked category | Percentage with trend |
| Most Locked Categories | Which categories are locked most often | Horizontal bar chart |
| Chef's Special Trigger Rate | `chefs_special_triggered` / total topping rolls | Percentage |
| Smart Mode Adoption | % of completed sandwiches with Smart Mode on | Percentage with trend |
| Double Toggle Usage | % of completions with double protein/cheese | Stacked bar |
| Cost Context Split | % of sessions using Retail vs Restaurant pricing | Pie chart |
| Top 10 Ingredients | Most frequently appearing ingredients across all completions | Ranked list |
| Top 10 Sandwich Combinations | Most frequently generated full combinations | Ranked list |
| Dietary Filter Usage | % of sessions with each filter active | Bar chart |
| Filter Warning Rate | `filter_dietary_warning` frequency by filter combo | Table |

### 6.3 Sharing Dashboard

Track viral mechanics.

| Widget | Metric | Visualization |
|---|---|---|
| Shares per Day | `share_link_created` count | Line chart |
| Share-to-Visit Ratio | `share_link_visited` / `share_link_created` | Percentage |
| Viral Coefficient | New users from shared links / total sharers | Number with trend |
| Make Your Own Conversion | `share_make_your_own_clicked` / `share_link_visited` | Percentage |
| Top Referrers for Shared Links | Referrer domain breakdown | Table |

### 6.4 Account and Retention Dashboard

Track user lifecycle. Phase 3.

| Widget | Metric | Visualization |
|---|---|---|
| Signup Rate | `account_signed_up` / unique visitors | Percentage |
| Signup Method Split | Email vs Google vs Apple | Pie chart |
| Signup Trigger Split | What prompted signups | Bar chart |
| Auth Prompt Conversion | % of `account_auth_prompted` that lead to signup | Funnel |
| Save Rate | `history_sandwich_saved` / `generator_sandwich_completed` (auth users) | Percentage |
| Rating Distribution | Distribution of ratings 1-5 | Bar chart |
| Favorite Rate | % of saved sandwiches that are favorited | Percentage |
| 7-Day Retention | % of users returning within 7 days of first visit | Cohort chart |
| 30-Day Retention | % of users returning within 30 days | Cohort chart |

### 6.5 Performance Dashboard

Track technical health.

| Widget | Metric | Visualization |
|---|---|---|
| LCP (p50, p75, p95) | Largest Contentful Paint percentiles | Line chart |
| CLS (p50, p75, p95) | Cumulative Layout Shift percentiles | Line chart |
| FID (p50, p75, p95) | First Input Delay percentiles | Line chart |
| Performance by Device | LCP breakdown by device type | Table |
| Performance by Connection | LCP breakdown by connection type | Table |
| Error Rate | Client-side error count | Line chart |

---

## 7. Success Metrics Tracking

Mapping the PRD success metrics (Section 11) to specific analytics queries.

### 7.1 Phase 1 Targets

| PRD Metric | Target | PostHog Query |
|---|---|---|
| Rolls per session | 3+ average | Mean of `roll_number` property on last `generator_rolled_all` per session |
| Session duration | 60+ seconds | PostHog session duration (auto-captured) |
| Lighthouse score | 90+ | Manual audit (not tracked in PostHog). Schedule monthly. |
| Core Web Vitals | All green | `performance_page_load` events, filter by LCP < 1500, CLS < 0.1, FID < 100 |

### 7.2 Phase 2-3 Targets

| PRD Metric | Target | PostHog Query |
|---|---|---|
| Rolls per session | 5+ average | Same as Phase 1, higher threshold |
| Share rate | 10% | `share_link_created` count / `generator_sandwich_completed` count, per day |
| Return visitor rate | 15% within 7 days | PostHog retention cohort: users who triggered any event in week 0 and returned in week 1 |
| Account creation | 8% of visitors | `account_signed_up` count / unique visitors, per day |

### 7.3 Alerting

Set up PostHog alerts for anomalies:

| Alert | Condition | Severity |
|---|---|---|
| Traffic drop | DAU drops 50%+ day-over-day | High |
| Error spike | Client errors increase 3x above 7-day average | High |
| Performance degradation | p75 LCP exceeds 2500ms for 1 hour | Medium |
| Share rate drop | Daily share rate drops below 5% for 3 consecutive days | Medium |
| Zero completions | No `generator_sandwich_completed` events in 1 hour during peak hours | High |

---

## 8. Privacy and Compliance

### 8.1 Data Collection Principles

- Collect only what is needed to measure the defined success metrics.
- Never track personally identifiable information (PII) in event properties beyond the user ID and email set on the profile.
- Sandwich names and ingredient slugs are not PII.
- Never track user-entered free-text beyond search queries (which are anonymized after 90 days).

### 8.2 Cookie and Consent

- PostHog uses a first-party cookie for session tracking.
- V1 does not serve ads and does not share data with third parties, so a full cookie consent banner is not legally required under CCPA for analytics-only cookies. However, the privacy policy must disclose PostHog usage.
- When ads and affiliate tracking are introduced (future), a cookie consent banner will be required. The privacy policy should be pre-written to accommodate this transition.

### 8.3 User Data Rights (CCPA)

- Users can request data export or deletion via the account settings page or by contacting support.
- Account deletion (`account_deleted` event) triggers deletion of the PostHog user profile and all associated events.
- PostHog's data deletion API is used to honor these requests.

### 8.4 Session Replay Privacy

- Session replay is enabled at 1% of sessions for UX debugging.
- All text input fields are automatically masked in replays (PostHog default).
- Replay data is retained for 30 days.
- Session replay must be disclosed in the privacy policy.

---

## 9. Future Tracking

### 9.1 Sandwich Database Events (Future)

| Event | Trigger |
|---|---|
| `database_entry_viewed` | User views a sandwich database entry |
| `database_searched` | User searches the database |
| `database_filtered` | User applies filters (region, diet, ingredient) |
| `database_entry_rated` | User rates a database entry |
| `database_comment_posted` | User posts a comment |
| `database_photo_uploaded` | User uploads a photo |

### 9.2 Community Events (Future)

| Event | Trigger |
|---|---|
| `community_leaderboard_viewed` | User views the leaderboard |
| `community_entry_viewed` | User views a community sandwich |
| `community_entry_rated` | User rates a community sandwich |
| `community_try_sandwich_clicked` | User clicks "Try This Sandwich" |
| `community_comment_posted` | User posts a comment |
| `community_photo_uploaded` | User uploads a photo |

### 9.3 Monetization Events (Future)

| Event | Properties | Trigger |
|---|---|---|
| `ad_impression` | `ad_unit`, `ad_position`, `page` | Display ad rendered on screen |
| `ad_clicked` | `ad_unit`, `ad_position`, `page` | User clicks a display ad |
| `affiliate_link_clicked` | `partner`, `ingredient_slug` or `product`, `page` | User clicks an affiliate link |
| `affiliate_link_converted` | `partner`, `order_value` | Affiliate conversion tracked (if available) |

### 9.4 Global Search Events (Future)

| Event | Properties | Trigger |
|---|---|---|
| `search_performed` | `query`, `source_filter`, `results_count` | User submits a global search |
| `search_result_clicked` | `query`, `result_type`, `result_slug`, `result_position` | User clicks a search result |
| `search_no_results` | `query`, `source_filter` | Search returns zero results |

---

### Revision History

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0 | 2026-03-01 | Draft | Initial analytics and tracking plan for Between the Bread |
