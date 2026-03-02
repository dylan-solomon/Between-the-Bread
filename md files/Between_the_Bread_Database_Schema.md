# Between the Bread — Database Schema

**Project Name:** Between the Bread
**Database:** Supabase (PostgreSQL)
**Version:** 1.0
**Date:** March 1, 2026
**Status:** Draft
**Related Documents:** PRD v1.0, Website Architecture v1.0

---

## Table of Contents

1. [Overview](#1-overview)
2. [Entity Relationship Diagram](#2-entity-relationship-diagram)
3. [Table Definitions](#3-table-definitions)
4. [Row-Level Security Policies](#4-row-level-security-policies)
5. [Indexes](#5-indexes)
6. [Seed Data](#6-seed-data)
7. [Future Schema Extensions](#7-future-schema-extensions)

---

## 1. Overview

### 1.1 Design Principles

- **Supabase-native:** Leverage Supabase Auth's built-in `auth.users` table for authentication. Application tables reference `auth.users.id` as the foreign key.
- **Row-Level Security (RLS):** All tables have RLS enabled. Users can only access their own data unless explicitly public.
- **Soft deletes where appropriate:** Ingredients use an `enabled` flag rather than hard deletion to preserve historical sandwich references.
- **JSONB for flexible nested data:** Nutrition data and sandwich compositions are stored as JSONB to avoid excessive normalization for read-heavy, write-light data.
- **UUID primary keys:** All tables use UUID primary keys for security (non-sequential) and Supabase compatibility.

### 1.2 Schema Scope

| Phase | Tables |
|---|---|
| **V1 (Phase 1)** | `ingredients`, `categories` |
| **Phase 2** | `shared_sandwiches` |
| **Phase 3** | `profiles`, `saved_sandwiches` |
| **Future** | `sandwich_database`, `comments`, `photos`, `community_sandwiches` |

Note: All tables are defined in this document for architectural planning. Tables not needed until later phases should not be created until their phase begins, but their structure should be considered when designing V1 tables to avoid migration conflicts.

---

## 2. Entity Relationship Diagram

```
auth.users (Supabase managed)
    |
    | 1:1
    v
profiles
    |
    | 1:many
    +---------------------------+
    |                           |
    v                           v
saved_sandwiches          shared_sandwiches
    |                           |
    | references                | references
    v                           v
ingredients <--- categories     ingredients (via JSONB composition)
```

### Detailed Relationships

```
categories 1:many --> ingredients
    (each ingredient belongs to one category)

auth.users 1:1 --> profiles
    (each user has one profile with preferences)

auth.users 1:many --> saved_sandwiches
    (each user can save up to 50 sandwiches)

shared_sandwiches (standalone)
    (no user association required; anonymous sharing)

saved_sandwiches --> ingredients
    (composition stored as JSONB array of ingredient IDs)

shared_sandwiches --> ingredients
    (composition stored as JSONB array of ingredient IDs)
```

---

## 3. Table Definitions

### 3.1 `categories`

Stores the ingredient category definitions. Mostly static reference data.

```sql
CREATE TABLE categories (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL UNIQUE,
    slug            TEXT NOT NULL UNIQUE,
    display_order   INTEGER NOT NULL,
    selection_type  TEXT NOT NULL CHECK (selection_type IN ('single', 'multi')),
    min_picks       INTEGER NOT NULL DEFAULT 1,
    max_picks       INTEGER NOT NULL DEFAULT 1,
    emoji           TEXT,
    color           TEXT,
    has_double_toggle BOOLEAN NOT NULL DEFAULT false,
    is_bonus        BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key. |
| `name` | TEXT | Display name (e.g., "Bread", "Protein", "Chef's Special"). |
| `slug` | TEXT | URL-safe identifier (e.g., "bread", "protein", "chefs-special"). |
| `display_order` | INTEGER | Controls rendering order in the UI (1 = bread, 2 = protein, etc.). |
| `selection_type` | TEXT | "single" or "multi". Determines pick behavior. |
| `min_picks` | INTEGER | Minimum selections for multi-pick categories. |
| `max_picks` | INTEGER | Maximum selections for multi-pick categories. |
| `emoji` | TEXT | Category emoji for UI display. |
| `color` | TEXT | Hex color code for category theming. |
| `has_double_toggle` | BOOLEAN | Whether this category supports the "Double" toggle (Protein, Cheese). |
| `is_bonus` | BOOLEAN | Whether this is a hidden bonus category (Chef's Special). |
| `created_at` | TIMESTAMPTZ | Row creation timestamp. |
| `updated_at` | TIMESTAMPTZ | Last modification timestamp. |

**V1 Seed Data:** 6 rows (Bread, Protein, Cheese, Toppings, Condiments, Chef's Special).

---

### 3.2 `ingredients`

Stores all ingredients across all categories, including dietary tags, compatibility grouping, cost, and nutrition.

```sql
CREATE TABLE ingredients (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id     UUID NOT NULL REFERENCES categories(id),
    name            TEXT NOT NULL,
    slug            TEXT NOT NULL,
    dietary_tags    TEXT[] NOT NULL DEFAULT '{}',
    compat_group    TEXT,
    estimated_cost   JSONB,
    nutrition       JSONB,
    image_asset     TEXT,
    is_trigger      BOOLEAN NOT NULL DEFAULT false,
    enabled         BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE(category_id, slug)
);
```

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key. |
| `category_id` | UUID | Foreign key to `categories`. |
| `name` | TEXT | Display name (e.g., "Sourdough", "Pastrami"). |
| `slug` | TEXT | URL-safe identifier, unique within category. |
| `dietary_tags` | TEXT[] | PostgreSQL array of tags: "vegetarian", "vegan", "gluten_free", "dairy_free". |
| `compat_group` | TEXT | Flavor profile grouping for Smart Mode (e.g., "italian", "deli_classic"). |
| `estimated_cost` | JSONB | Per-serving cost in USD across four estimated cost points: `{"retail_low": 0.30, "retail_high": 1.20, "restaurant_low": 0.90, "restaurant_high": 3.60}`. Nullable for ingredients where cost is not applicable. |
| `nutrition` | JSONB | Per-serving nutrition: `{"calories": 120, "protein_g": 5, "fat_g": 2, "carbs_g": 22, "fiber_g": 1, "sodium_mg": 200, "sugar_g": 2}`. Nullable. |
| `image_asset` | TEXT | Path or URL to the ingredient's visual asset. |
| `is_trigger` | BOOLEAN | If true, this ingredient is a Chef's Special trigger (hidden from display, activates bonus category). |
| `enabled` | BOOLEAN | Admin toggle. Disabled ingredients are excluded from rolls but preserved in historical sandwiches. |
| `created_at` | TIMESTAMPTZ | Row creation timestamp. |
| `updated_at` | TIMESTAMPTZ | Last modification timestamp. |

**V1 Seed Data:** 112 rows (17 bread + 20 protein + 17 cheese + 22 toppings + 20 condiments + 15 Chef's Special + 1 "No Cheese" is included in the 17 cheese count).

---

### 3.3 `shared_sandwiches`

Stores sandwich compositions for shareable URLs. No user association required.

```sql
CREATE TABLE shared_sandwiches (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hash            TEXT NOT NULL UNIQUE,
    composition     JSONB NOT NULL,
    name            TEXT NOT NULL,
    total_estimated_cost JSONB,
    total_nutrition JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at      TIMESTAMPTZ
);
```

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key. |
| `hash` | TEXT | Short alphanumeric hash for the URL (e.g., "a3f8k2m9"). Unique, indexed. |
| `composition` | JSONB | Full sandwich structure: `{"bread": ["id"], "protein": ["id1", "id2"], "cheese": ["id"], "toppings": ["id1", "id2", "id3"], "condiments": ["id1"], "chefs_special": ["id"] or null}`. Stores ingredient UUIDs per category. |
| `name` | TEXT | Pre-computed sandwich name string (e.g., "Pastrami & Gruyere on Sourdough"). |
| `total_estimated_cost` | JSONB | Pre-computed total pricing at time of sharing: `{"retail_low": 4.20, "retail_high": 8.50, "restaurant_low": 12.60, "restaurant_high": 25.50}`. |
| `total_nutrition` | JSONB | Pre-computed total nutrition at time of sharing. |
| `created_at` | TIMESTAMPTZ | Creation timestamp. |
| `expires_at` | TIMESTAMPTZ | Optional expiration. Null = no expiration. Default: 90 days from creation for unclaimed links. |

**Phase:** Phase 2.

**Notes:** Composition stores ingredient IDs, not names. The API resolves IDs to current ingredient data at render time, but pre-computes name/cost/nutrition at share time as a snapshot. This means shared sandwiches always show the name and stats from when they were shared, even if ingredient data is later updated.

---

### 3.4 `profiles`

Extends Supabase Auth's `auth.users` with application-specific user data. Created automatically via a database trigger on user signup.

```sql
CREATE TABLE profiles (
    id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name        TEXT,
    dietary_filters     TEXT[] NOT NULL DEFAULT '{}',
    smart_mode_default  BOOLEAN NOT NULL DEFAULT false,
    double_protein      BOOLEAN NOT NULL DEFAULT false,
    double_cheese       BOOLEAN NOT NULL DEFAULT false,
    cost_context        TEXT NOT NULL DEFAULT 'retail' CHECK (cost_context IN ('retail', 'restaurant')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key. Same as `auth.users.id` (1:1 relationship). |
| `display_name` | TEXT | User's chosen display name. Nullable (can use email as fallback). |
| `dietary_filters` | TEXT[] | Persisted dietary filter preferences: "vegetarian", "vegan", "gluten_free", "dairy_free". |
| `smart_mode_default` | BOOLEAN | Whether Smart Mode is enabled by default for this user. |
| `double_protein` | BOOLEAN | Whether double protein toggle is enabled by default. |
| `double_cheese` | BOOLEAN | Whether double cheese toggle is enabled by default. |
| `cost_context` | TEXT | Preferred cost context: "retail" (default) or "restaurant". Auto-applied on load. |
| `created_at` | TIMESTAMPTZ | Profile creation timestamp. |
| `updated_at` | TIMESTAMPTZ | Last modification timestamp. |

**Phase:** Phase 3.

**Auto-creation trigger:**

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

### 3.5 `saved_sandwiches`

Stores user-saved sandwich history with ratings and favorites.

```sql
CREATE TABLE saved_sandwiches (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    composition     JSONB NOT NULL,
    name            TEXT NOT NULL,
    total_estimated_cost JSONB,
    total_nutrition JSONB,
    rating          INTEGER CHECK (rating >= 1 AND rating <= 5),
    is_favorite     BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key. |
| `user_id` | UUID | Foreign key to `auth.users`. Indexed. |
| `composition` | JSONB | Same structure as `shared_sandwiches.composition`. |
| `name` | TEXT | Pre-computed sandwich name. |
| `total_estimated_cost` | JSONB | Pre-computed total pricing at time of save: `{"retail_low": 4.20, "retail_high": 8.50, "restaurant_low": 12.60, "restaurant_high": 25.50}`. |
| `total_nutrition` | JSONB | Pre-computed total nutrition at time of save. |
| `rating` | INTEGER | User rating 1-5. Nullable (unrated). Constrained to valid range. |
| `is_favorite` | BOOLEAN | Whether the user has starred this sandwich. |
| `created_at` | TIMESTAMPTZ | Save timestamp. |
| `updated_at` | TIMESTAMPTZ | Last modification (rating change, favorite toggle). |

**Phase:** Phase 3.

**History limit enforcement (50 max per user):**

```sql
CREATE OR REPLACE FUNCTION enforce_sandwich_limit()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM saved_sandwiches
    WHERE id IN (
        SELECT id FROM saved_sandwiches
        WHERE user_id = NEW.user_id
        AND is_favorite = false
        ORDER BY created_at DESC
        OFFSET 50
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_saved_sandwich_limit
    AFTER INSERT ON saved_sandwiches
    FOR EACH ROW EXECUTE FUNCTION enforce_sandwich_limit();
```

**Notes:** The FIFO eviction trigger only deletes non-favorited sandwiches. If a user has 50 favorites, no automatic deletion occurs, and they must manually remove entries. The UI should warn when approaching the limit.

---

### 3.6 `compat_matrix` (Smart Mode)

Stores flavor group affinity scores for Smart Mode weighting.

```sql
CREATE TABLE compat_matrix (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_a     TEXT NOT NULL,
    group_b     TEXT NOT NULL,
    affinity    NUMERIC(3,2) NOT NULL CHECK (affinity >= 0 AND affinity <= 1),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE(group_a, group_b)
);
```

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key. |
| `group_a` | TEXT | First flavor group (e.g., "italian"). |
| `group_b` | TEXT | Second flavor group (e.g., "mediterranean"). |
| `affinity` | NUMERIC(3,2) | Pairwise affinity score from 0.0 (incompatible) to 1.0 (perfect pairing). |
| `created_at` | TIMESTAMPTZ | Row creation timestamp. |

**Phase:** Phase 2.

**Notes:** The matrix is symmetric. Store each pair once with `group_a < group_b` alphabetically. The application layer handles lookups in both directions. Self-affinity (e.g., "italian" to "italian") should always be 1.0. Estimated V1 size: ~36 rows for 8 flavor groups.

---

## 4. Row-Level Security Policies

All tables have RLS enabled. Policies follow the principle of least privilege.

### 4.1 `categories`

```sql
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Public read access (anyone can view categories)
CREATE POLICY "Categories are publicly readable"
    ON categories FOR SELECT
    USING (true);
```

### 4.2 `ingredients`

```sql
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;

-- Public read access for enabled ingredients
CREATE POLICY "Enabled ingredients are publicly readable"
    ON ingredients FOR SELECT
    USING (enabled = true);
```

### 4.3 `shared_sandwiches`

```sql
ALTER TABLE shared_sandwiches ENABLE ROW LEVEL SECURITY;

-- Public read access (anyone can view a shared sandwich)
CREATE POLICY "Shared sandwiches are publicly readable"
    ON shared_sandwiches FOR SELECT
    USING (true);

-- Anyone can create a shared sandwich (no auth required)
CREATE POLICY "Anyone can create shared sandwiches"
    ON shared_sandwiches FOR INSERT
    WITH CHECK (true);
```

### 4.4 `profiles`

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);
```

### 4.5 `saved_sandwiches`

```sql
ALTER TABLE saved_sandwiches ENABLE ROW LEVEL SECURITY;

-- Users can read their own saved sandwiches
CREATE POLICY "Users can read own sandwiches"
    ON saved_sandwiches FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own saved sandwiches
CREATE POLICY "Users can save sandwiches"
    ON saved_sandwiches FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own saved sandwiches (rating, favorite)
CREATE POLICY "Users can update own sandwiches"
    ON saved_sandwiches FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can delete their own saved sandwiches
CREATE POLICY "Users can delete own sandwiches"
    ON saved_sandwiches FOR DELETE
    USING (auth.uid() = user_id);
```

### 4.6 `compat_matrix`

```sql
ALTER TABLE compat_matrix ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Compat matrix is publicly readable"
    ON compat_matrix FOR SELECT
    USING (true);
```

---

## 5. Indexes

### 5.1 V1 Indexes

```sql
-- Ingredients: fast lookup by category and enabled status
CREATE INDEX idx_ingredients_category_enabled
    ON ingredients(category_id, enabled);

-- Ingredients: dietary tag filtering (GIN index for array containment)
CREATE INDEX idx_ingredients_dietary_tags
    ON ingredients USING GIN(dietary_tags);
```

### 5.2 Phase 2 Indexes

```sql
-- Shared sandwiches: fast hash lookup for URL resolution
CREATE UNIQUE INDEX idx_shared_sandwiches_hash
    ON shared_sandwiches(hash);

-- Shared sandwiches: expiration cleanup
CREATE INDEX idx_shared_sandwiches_expires
    ON shared_sandwiches(expires_at)
    WHERE expires_at IS NOT NULL;

-- Compat matrix: fast pair lookup
CREATE INDEX idx_compat_matrix_groups
    ON compat_matrix(group_a, group_b);
```

### 5.3 Phase 3 Indexes

```sql
-- Saved sandwiches: fast lookup by user, ordered by recency
CREATE INDEX idx_saved_sandwiches_user_created
    ON saved_sandwiches(user_id, created_at DESC);

-- Saved sandwiches: favorites quick access
CREATE INDEX idx_saved_sandwiches_user_favorites
    ON saved_sandwiches(user_id)
    WHERE is_favorite = true;

-- Saved sandwiches: rating queries (for future aggregate analytics)
CREATE INDEX idx_saved_sandwiches_rating
    ON saved_sandwiches(rating)
    WHERE rating IS NOT NULL;
```

---

## 6. Seed Data

### 6.1 Categories Seed

```json
[
    {"name": "Bread", "slug": "bread", "display_order": 1, "selection_type": "single", "min_picks": 1, "max_picks": 1, "emoji": "🍞", "color": "#D4A056", "has_double_toggle": false, "is_bonus": false},
    {"name": "Protein", "slug": "protein", "display_order": 2, "selection_type": "single", "min_picks": 1, "max_picks": 1, "emoji": "🥩", "color": "#C0392B", "has_double_toggle": true, "is_bonus": false},
    {"name": "Cheese", "slug": "cheese", "display_order": 3, "selection_type": "single", "min_picks": 1, "max_picks": 1, "emoji": "🧀", "color": "#F4D03F", "has_double_toggle": true, "is_bonus": false},
    {"name": "Toppings", "slug": "toppings", "display_order": 4, "selection_type": "multi", "min_picks": 1, "max_picks": 4, "emoji": "🥬", "color": "#27AE60", "has_double_toggle": false, "is_bonus": false},
    {"name": "Condiments", "slug": "condiments", "display_order": 5, "selection_type": "multi", "min_picks": 1, "max_picks": 2, "emoji": "🫙", "color": "#E67E22", "has_double_toggle": false, "is_bonus": false},
    {"name": "Chef's Special", "slug": "chefs-special", "display_order": 6, "selection_type": "single", "min_picks": 1, "max_picks": 1, "emoji": "👨‍🍳", "color": "#8E44AD", "has_double_toggle": false, "is_bonus": true}
]
```

### 6.2 Ingredients Seed (Structure)

Each ingredient follows this structure. The full seed file with all 112 ingredients, dietary tags, compat groups, cost, and nutrition data will be provided in the separate Ingredient Data JSON document.

```json
{
    "name": "Sourdough",
    "slug": "sourdough",
    "category_slug": "bread",
    "dietary_tags": ["vegetarian", "vegan"],
    "compat_group": "neutral",
    "estimated_cost": {
        "retail_low": 0.30,
        "retail_high": 1.20,
        "restaurant_low": 0.90,
        "restaurant_high": 3.60
    },
    "nutrition": {
        "calories": 120,
        "protein_g": 4,
        "fat_g": 0.5,
        "carbs_g": 24,
        "fiber_g": 1,
        "sodium_mg": 210,
        "sugar_g": 1
    },
    "image_asset": "/assets/ingredients/bread/sourdough.png",
    "is_trigger": false,
    "enabled": true
}
```

---

## 7. Future Schema Extensions

### 7.1 Sandwich Database (Future)

```sql
-- Editorial sandwich encyclopedia entries
CREATE TABLE sandwich_database (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    slug            TEXT NOT NULL UNIQUE,
    description     TEXT,
    history         TEXT,
    origin_country  TEXT,
    origin_region   TEXT,
    canonical_ingredients JSONB,
    image_url       TEXT,
    avg_rating      NUMERIC(3,2),
    rating_count    INTEGER NOT NULL DEFAULT 0,
    search_vector   TSVECTOR,
    published       BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Full-text search index
CREATE INDEX idx_sandwich_database_search
    ON sandwich_database USING GIN(search_vector);

-- Auto-update search vector on insert/update
CREATE OR REPLACE FUNCTION sandwich_database_search_update()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.origin_country, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.origin_region, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(NEW.history, '')), 'D');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sandwich_database_search_trigger
    BEFORE INSERT OR UPDATE ON sandwich_database
    FOR EACH ROW EXECUTE FUNCTION sandwich_database_search_update();
```

### 7.2 Comments (Future)

```sql
-- Threaded comments for database entries and community sandwiches
CREATE TABLE comments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    target_type     TEXT NOT NULL CHECK (target_type IN ('database', 'community')),
    target_id       UUID NOT NULL,
    parent_id       UUID REFERENCES comments(id) ON DELETE CASCADE,
    body            TEXT NOT NULL,
    is_flagged      BOOLEAN NOT NULL DEFAULT false,
    is_approved     BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 7.3 User Photos (Future)

```sql
-- User-uploaded photos for database entries and community sandwiches
CREATE TABLE photos (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    target_type     TEXT NOT NULL CHECK (target_type IN ('database', 'community')),
    target_id       UUID NOT NULL,
    storage_path    TEXT NOT NULL,
    caption         TEXT,
    is_approved     BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 7.4 Community Sandwiches (Future)

```sql
-- Community-generated sandwich combinations for leaderboard
CREATE TABLE community_sandwiches (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug            TEXT NOT NULL UNIQUE,
    composition     JSONB NOT NULL,
    name            TEXT NOT NULL,
    generated_count INTEGER NOT NULL DEFAULT 1,
    avg_rating      NUMERIC(3,2),
    rating_count    INTEGER NOT NULL DEFAULT 0,
    search_vector   TSVECTOR,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Full-text search index
CREATE INDEX idx_community_sandwiches_search
    ON community_sandwiches USING GIN(search_vector);

-- Auto-update search vector on insert/update
CREATE OR REPLACE FUNCTION community_sandwiches_search_update()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER community_sandwiches_search_trigger
    BEFORE INSERT OR UPDATE ON community_sandwiches
    FOR EACH ROW EXECUTE FUNCTION community_sandwiches_search_update();
```

### 7.5 Migration Strategy

- Each phase introduces new tables via Supabase migrations.
- Existing tables are never dropped or renamed; only additive changes (new columns, new tables).
- If a column needs to be added to an existing table, it must be nullable or have a default value to avoid breaking existing rows.
- All migrations are version-controlled in the repository under `/supabase/migrations/`.

---

### Revision History

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0 | 2026-03-01 | Draft | Initial database schema for Between the Bread |
