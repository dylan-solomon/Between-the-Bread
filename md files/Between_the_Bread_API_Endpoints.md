# Between the Bread — API Endpoints Specification

**Project Name:** Between the Bread
**API Host:** betweenbread.co/api
**Version:** 1.0
**Date:** March 1, 2026
**Status:** Draft
**Related Documents:** PRD v1.0, Website Architecture v1.0, Database Schema v1.0

---

## Table of Contents

1. [Overview](#1-overview)
2. [API Conventions](#2-api-conventions)
3. [Authentication Endpoints](#3-authentication-endpoints)
4. [Ingredient Endpoints](#4-ingredient-endpoints)
5. [Sandwich Sharing Endpoints](#5-sandwich-sharing-endpoints)
6. [User Profile Endpoints](#6-user-profile-endpoints)
7. [Saved Sandwich Endpoints](#7-saved-sandwich-endpoints)
8. [Compatibility Matrix Endpoints](#8-compatibility-matrix-endpoints)
9. [Error Reference](#9-error-reference)
10. [Rate Limiting](#10-rate-limiting)
11. [Future Endpoints](#11-future-endpoints)

---

## 1. Overview

### 1.1 Architecture

The Between the Bread API is implemented as Vercel Serverless Functions (Next.js API routes) that communicate with a Supabase PostgreSQL backend. Authentication is handled by Supabase Auth with JWT tokens.

```
Client (React)
    |
    | HTTPS
    v
Vercel Edge Network
    |
    v
API Routes (/api/*)              Supabase Auth
    |                                |
    | PostgreSQL connection          | JWT verification
    v                                v
Supabase Database <----------> Supabase Auth
```

### 1.2 Base URL

- **Production:** `https://betweenbread.co/api`
- **Staging:** `https://staging.betweenbread.co/api` (future)
- **Local Development:** `http://localhost:3000/api`

### 1.3 Phase Rollout

| Phase | Endpoints |
|---|---|
| **Phase 1** | Ingredients (read-only, served as static JSON in V1 but API-ready) |
| **Phase 2** | Sandwich sharing, compatibility matrix |
| **Phase 3** | Authentication, user profiles, saved sandwiches |
| **Future** | Sandwich database, comments, photos, community |

Note: While Supabase Auth handles the actual auth flow client-side, wrapper endpoints are provided for profile management and session validation.

---

## 2. API Conventions

### 2.1 Request Format

- All request bodies are JSON (`Content-Type: application/json`).
- Query parameters are used for filtering, pagination, and search.
- Path parameters are used for resource identification.

### 2.2 Response Format

All responses follow a consistent envelope structure:

**Success:**

```json
{
    "data": { ... },
    "meta": {
        "timestamp": "2026-03-01T12:00:00Z"
    }
}
```

**Success (list):**

```json
{
    "data": [ ... ],
    "meta": {
        "timestamp": "2026-03-01T12:00:00Z",
        "count": 20,
        "total": 112
    }
}
```

**Error:**

```json
{
    "error": {
        "code": "RESOURCE_NOT_FOUND",
        "message": "The requested sandwich could not be found.",
        "status": 404
    }
}
```

### 2.3 Authentication

- Authenticated endpoints require a valid Supabase JWT in the `Authorization` header: `Authorization: Bearer <token>`.
- Tokens are obtained client-side via Supabase Auth SDK (email/password or OAuth).
- The API verifies tokens server-side using Supabase's `getUser()` method.
- Endpoints marked `[AUTH]` require authentication. Requests without a valid token receive a 401 response.
- Endpoints marked `[AUTH OPTIONAL]` accept authenticated or unauthenticated requests but return additional data for authenticated users.
- Endpoints marked `[PUBLIC]` require no authentication.

### 2.4 HTTP Methods

| Method | Usage |
|---|---|
| `GET` | Retrieve resources. Never modifies state. |
| `POST` | Create new resources. |
| `PATCH` | Partially update existing resources. |
| `DELETE` | Remove resources. |

`PUT` is not used. All updates are partial via `PATCH`.

### 2.5 Status Codes

| Code | Usage |
|---|---|
| `200` | Success (GET, PATCH) |
| `201` | Created (POST) |
| `204` | No Content (DELETE) |
| `400` | Bad Request (validation failure, malformed input) |
| `401` | Unauthorized (missing or invalid auth token) |
| `403` | Forbidden (valid token but insufficient permissions) |
| `404` | Not Found |
| `409` | Conflict (duplicate resource) |
| `429` | Too Many Requests (rate limited) |
| `500` | Internal Server Error |

---

## 3. Authentication Endpoints

Authentication is primarily handled client-side via the Supabase Auth SDK. The following server-side endpoints support session validation and profile creation.

Note: Supabase Auth handles login, signup, OAuth flows, password reset, and token refresh directly. These are not custom API routes.

### 3.1 Validate Session

Verifies that the current session token is valid. Used by the client on app load to check auth state.

```
GET /api/auth/session
```

**Auth:** [AUTH]

**Response (200):**

```json
{
    "data": {
        "user_id": "uuid",
        "email": "user@example.com",
        "authenticated": true
    }
}
```

**Response (401):**

```json
{
    "error": {
        "code": "INVALID_SESSION",
        "message": "Session is invalid or expired.",
        "status": 401
    }
}
```

---

## 4. Ingredient Endpoints

### 4.1 List All Ingredients

Returns all enabled ingredients grouped by category. This is the primary data payload for the generator.

```
GET /api/ingredients
```

**Auth:** [PUBLIC]

**Query Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `diet` | string | No | Comma-separated dietary filters (e.g., `vegetarian,gluten_free`). Returns only ingredients matching ALL specified tags. |

**Response (200):**

```json
{
    "data": {
        "categories": [
            {
                "id": "uuid",
                "name": "Bread",
                "slug": "bread",
                "display_order": 1,
                "selection_type": "single",
                "min_picks": 1,
                "max_picks": 1,
                "emoji": "🍞",
                "color": "#D4A056",
                "has_double_toggle": false,
                "is_bonus": false,
                "ingredients": [
                    {
                        "id": "uuid",
                        "name": "Sourdough",
                        "slug": "sourdough",
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
                        "is_trigger": false
                    }
                ]
            }
        ]
    },
    "meta": {
        "timestamp": "2026-03-01T12:00:00Z",
        "ingredient_count": 111,
        "cost_data_last_updated": "2026-03-01",
        "filters_applied": []
    }
}
```

**Notes:**

- V1 implementation: This endpoint can initially serve a static JSON file for performance. Migrate to a database query when admin CMS is added.
- Only enabled ingredients are returned (`enabled = true`).
- Trigger ingredients (`is_trigger = true`) are included in the response. The client is responsible for hiding them from display.
- The `cost_data_last_updated` field in meta supports the cost disclaimer requirement (FR-011).

### 4.2 Get Single Ingredient

Returns a single ingredient by ID. Used for resolving ingredient references in shared/saved sandwiches.

```
GET /api/ingredients/:id
```

**Auth:** [PUBLIC]

**Path Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `id` | UUID | Ingredient ID. |

**Response (200):**

```json
{
    "data": {
        "id": "uuid",
        "name": "Sourdough",
        "slug": "sourdough",
        "category": {
            "id": "uuid",
            "name": "Bread",
            "slug": "bread"
        },
        "dietary_tags": ["vegetarian", "vegan"],
        "compat_group": "neutral",
        "estimated_cost": {
            "retail_low": 0.30,
            "retail_high": 1.20,
            "restaurant_low": 0.90,
            "restaurant_high": 3.60
        },
        "nutrition": { ... },
        "image_asset": "/assets/ingredients/bread/sourdough.png",
        "is_trigger": false
    }
}
```

**Response (404):**

```json
{
    "error": {
        "code": "INGREDIENT_NOT_FOUND",
        "message": "Ingredient not found.",
        "status": 404
    }
}
```

---

## 5. Sandwich Sharing Endpoints

### 5.1 Create Shared Sandwich

Stores a sandwich composition and returns a shareable hash.

```
POST /api/sandwiches/share
```

**Auth:** [PUBLIC] (no account required to share)

**Request Body:**

```json
{
    "composition": {
        "bread": ["uuid"],
        "protein": ["uuid"],
        "cheese": ["uuid"],
        "toppings": ["uuid", "uuid", "uuid"],
        "condiments": ["uuid"],
        "chefs_special": ["uuid"]
    },
    "name": "Pastrami & Gruyere on Sourdough",
    "total_estimated_cost": {"retail_low": 4.20, "retail_high": 8.50, "restaurant_low": 12.60, "restaurant_high": 25.50},
    "total_nutrition": {
        "calories": 620,
        "protein_g": 38,
        "fat_g": 28,
        "carbs_g": 52,
        "fiber_g": 4,
        "sodium_mg": 1450,
        "sugar_g": 6
    }
}
```

**Validation Rules:**

- `composition` is required. Must contain at least `bread`, `protein`, `cheese`, `toppings`, and `condiments` keys.
- Each key must be an array of valid ingredient UUIDs.
- `chefs_special` is optional (null or omitted if not triggered).
- `name` is required, max 200 characters, sanitized for XSS.
- `total_estimated_cost` and `total_nutrition` are optional but recommended.
- All ingredient IDs must reference existing, enabled ingredients.

**Response (201):**

```json
{
    "data": {
        "hash": "a3f8k2m9",
        "url": "https://betweenbread.co/sandwich/a3f8k2m9",
        "expires_at": "2026-05-30T12:00:00Z"
    }
}
```

**Response (400):**

```json
{
    "error": {
        "code": "INVALID_COMPOSITION",
        "message": "One or more ingredient IDs are invalid.",
        "status": 400
    }
}
```

### 5.2 Get Shared Sandwich

Retrieves a shared sandwich by its hash. Used to render the shared sandwich page.

```
GET /api/sandwiches/share/:hash
```

**Auth:** [PUBLIC]

**Path Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `hash` | string | The sandwich's unique share hash. |

**Response (200):**

```json
{
    "data": {
        "hash": "a3f8k2m9",
        "name": "Pastrami & Gruyere on Sourdough",
        "composition": {
            "bread": [
                {
                    "id": "uuid",
                    "name": "Sourdough",
                    "image_asset": "/assets/ingredients/bread/sourdough.png"
                }
            ],
            "protein": [ ... ],
            "cheese": [ ... ],
            "toppings": [ ... ],
            "condiments": [ ... ],
            "chefs_special": [ ... ]
        },
        "total_estimated_cost": {"retail_low": 4.20, "retail_high": 8.50, "restaurant_low": 12.60, "restaurant_high": 25.50},
        "total_nutrition": {
            "calories": 620,
            "protein_g": 38,
            "fat_g": 28,
            "carbs_g": 52,
            "fiber_g": 4,
            "sodium_mg": 1450,
            "sugar_g": 6
        },
        "created_at": "2026-03-01T12:00:00Z"
    }
}
```

**Notes:** The response resolves ingredient IDs to full ingredient objects (name, image_asset) so the client can render the visual stack and ingredient list without additional API calls. Cost and nutrition are returned as the snapshot from creation time, not recalculated.

**Response (404):**

```json
{
    "error": {
        "code": "SANDWICH_NOT_FOUND",
        "message": "This sandwich link is invalid or has expired.",
        "status": 404
    }
}
```

---

## 6. User Profile Endpoints

### 6.1 Get Current User Profile

Returns the authenticated user's profile and preferences.

```
GET /api/profile
```

**Auth:** [AUTH]

**Response (200):**

```json
{
    "data": {
        "id": "uuid",
        "email": "user@example.com",
        "display_name": "SandwichFan42",
        "dietary_filters": ["vegetarian"],
        "smart_mode_default": false,
        "double_protein": false,
        "double_cheese": false,
        "cost_context": "retail",
        "created_at": "2026-03-01T12:00:00Z"
    }
}
```

### 6.2 Update Profile

Updates the authenticated user's profile fields. Partial update; only include fields to change.

```
PATCH /api/profile
```

**Auth:** [AUTH]

**Request Body (all fields optional):**

```json
{
    "display_name": "SandwichFan42",
    "dietary_filters": ["vegetarian", "gluten_free"],
    "smart_mode_default": true,
    "double_protein": false,
    "double_cheese": true,
    "cost_context": "restaurant"
}
```

**Validation Rules:**

- `display_name`: max 50 characters, sanitized. No special characters beyond alphanumeric, spaces, hyphens, and underscores.
- `dietary_filters`: must be an array containing only valid values: "vegetarian", "vegan", "gluten_free", "dairy_free".
- `smart_mode_default`, `double_protein`, `double_cheese`: boolean only.
- `cost_context`: must be "retail" or "restaurant".

**Response (200):**

```json
{
    "data": {
        "id": "uuid",
        "display_name": "SandwichFan42",
        "dietary_filters": ["vegetarian", "gluten_free"],
        "smart_mode_default": true,
        "double_protein": false,
        "double_cheese": true,
        "cost_context": "restaurant",
        "updated_at": "2026-03-01T12:30:00Z"
    }
}
```

### 6.3 Delete Account

Permanently deletes the authenticated user's account and all associated data (profile, saved sandwiches, ratings). This action is irreversible.

```
DELETE /api/profile
```

**Auth:** [AUTH]

**Request Body:**

```json
{
    "confirm": true
}
```

**Validation:** The `confirm: true` field is required to prevent accidental deletion.

**Response (204):** No content.

**Side Effects:**

- Deletes the `profiles` row (CASCADE deletes `saved_sandwiches`).
- Calls Supabase Auth admin API to delete the `auth.users` record.
- Shared sandwiches created by this user are NOT deleted (they are anonymous by design).

---

## 7. Saved Sandwich Endpoints

### 7.1 List Saved Sandwiches

Returns the authenticated user's saved sandwich history, sorted by most recent.

```
GET /api/sandwiches/saved
```

**Auth:** [AUTH]

**Query Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `q` | string | No | Free-text search query. Matches against sandwich name and ingredient names within the composition. Case-insensitive. |
| `ingredient` | UUID | No | Filter to sandwiches containing a specific ingredient ID. Can be specified multiple times for AND logic (e.g., `ingredient=uuid1&ingredient=uuid2`). |
| `rating` | integer | No | Filter by exact rating (1-5). Use `rating=0` for unrated sandwiches. |
| `favorites_only` | boolean | No | If `true`, returns only favorited sandwiches. Default: `false`. |
| `sort` | string | No | Sort order. Options: `newest` (default), `oldest`, `rating_high`, `rating_low`, `name_asc`, `name_desc`. |
| `limit` | integer | No | Number of results to return. Default: 20. Max: 50. |
| `offset` | integer | No | Pagination offset. Default: 0. |

**Response (200):**

```json
{
    "data": [
        {
            "id": "uuid",
            "name": "Pastrami & Gruyere on Sourdough",
            "composition": {
                "bread": [{"id": "uuid", "name": "Sourdough", "image_asset": "..."}],
                "protein": [ ... ],
                "cheese": [ ... ],
                "toppings": [ ... ],
                "condiments": [ ... ],
                "chefs_special": null
            },
            "total_estimated_cost": {"retail_low": 4.20, "retail_high": 8.50, "restaurant_low": 12.60, "restaurant_high": 25.50},
            "total_nutrition": { ... },
            "rating": 4,
            "is_favorite": true,
            "created_at": "2026-03-01T12:00:00Z"
        }
    ],
    "meta": {
        "timestamp": "2026-03-01T12:00:00Z",
        "count": 20,
        "total": 34,
        "limit": 20,
        "offset": 0
    }
}
```

### 7.2 Save Sandwich

Saves a new sandwich to the authenticated user's history.

```
POST /api/sandwiches/saved
```

**Auth:** [AUTH]

**Request Body:**

```json
{
    "composition": {
        "bread": ["uuid"],
        "protein": ["uuid"],
        "cheese": ["uuid"],
        "toppings": ["uuid", "uuid"],
        "condiments": ["uuid"],
        "chefs_special": null
    },
    "name": "Pastrami & Gruyere on Sourdough",
    "total_estimated_cost": {"retail_low": 4.20, "retail_high": 8.50, "restaurant_low": 12.60, "restaurant_high": 25.50},
    "total_nutrition": { ... }
}
```

**Validation:** Same rules as shared sandwich composition (Section 5.1).

**Response (201):**

```json
{
    "data": {
        "id": "uuid",
        "name": "Pastrami & Gruyere on Sourdough",
        "rating": null,
        "is_favorite": false,
        "created_at": "2026-03-01T12:00:00Z"
    }
}
```

**Notes:** If the user is at the 50-sandwich limit, the oldest non-favorited sandwich is automatically evicted (database trigger). If all 50 are favorited, the insert succeeds but the client should warn the user about the limit.

### 7.3 Update Saved Sandwich

Updates rating or favorite status on a saved sandwich.

```
PATCH /api/sandwiches/saved/:id
```

**Auth:** [AUTH]

**Path Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `id` | UUID | Saved sandwich ID. |

**Request Body (all fields optional):**

```json
{
    "rating": 4,
    "is_favorite": true
}
```

**Validation:**

- `rating`: integer 1-5, or `null` to clear a rating.
- `is_favorite`: boolean.
- The sandwich must belong to the authenticated user (enforced by RLS).

**Response (200):**

```json
{
    "data": {
        "id": "uuid",
        "rating": 4,
        "is_favorite": true,
        "updated_at": "2026-03-01T12:30:00Z"
    }
}
```

**Response (404):**

```json
{
    "error": {
        "code": "SANDWICH_NOT_FOUND",
        "message": "Saved sandwich not found.",
        "status": 404
    }
}
```

### 7.4 Delete Saved Sandwich

Removes a single sandwich from the user's history.

```
DELETE /api/sandwiches/saved/:id
```

**Auth:** [AUTH]

**Path Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `id` | UUID | Saved sandwich ID. |

**Response (204):** No content.

### 7.5 Clear All History

Deletes all saved sandwiches for the authenticated user.

```
DELETE /api/sandwiches/saved
```

**Auth:** [AUTH]

**Request Body:**

```json
{
    "confirm": true,
    "include_favorites": false
}
```

**Validation:**

- `confirm: true` is required.
- `include_favorites`: if `false` (default), only non-favorited sandwiches are deleted. If `true`, all sandwiches including favorites are deleted.

**Response (200):**

```json
{
    "data": {
        "deleted_count": 28
    }
}
```

---

## 8. Compatibility Matrix Endpoints

### 8.1 Get Compatibility Matrix

Returns the full flavor group affinity matrix for Smart Mode.

```
GET /api/compat-matrix
```

**Auth:** [PUBLIC]

**Response (200):**

```json
{
    "data": {
        "groups": ["italian", "deli_classic", "asian_fusion", "tex_mex", "southern", "mediterranean", "neutral", "american"],
        "matrix": {
            "italian": {
                "italian": 1.0,
                "deli_classic": 0.5,
                "asian_fusion": 0.2,
                "tex_mex": 0.3,
                "southern": 0.3,
                "mediterranean": 0.85,
                "neutral": 0.7,
                "american": 0.5
            },
            "deli_classic": {
                "deli_classic": 1.0,
                "asian_fusion": 0.2,
                "tex_mex": 0.3,
                "southern": 0.5,
                "mediterranean": 0.4,
                "neutral": 0.7,
                "american": 0.8
            }
        }
    },
    "meta": {
        "timestamp": "2026-03-01T12:00:00Z",
        "group_count": 8
    }
}
```

**Notes:**

- The matrix is returned as a nested object for easy client-side lookup: `matrix[groupA][groupB]`.
- The API constructs the full symmetric matrix from the half-matrix stored in the database.
- This endpoint is highly cacheable. The client should cache the response and only refresh on app version changes.
- V1 implementation: Can be served as a static JSON file. Migrate to database-backed when admin editing is needed.

---

## 9. Error Reference

### 9.1 Error Codes

| Code | HTTP Status | Description |
|---|---|---|
| `INVALID_SESSION` | 401 | Auth token is missing, expired, or invalid. |
| `UNAUTHORIZED` | 401 | Authentication required but not provided. |
| `FORBIDDEN` | 403 | Authenticated but lacking permission for this resource. |
| `RESOURCE_NOT_FOUND` | 404 | Generic resource not found. |
| `INGREDIENT_NOT_FOUND` | 404 | Specified ingredient ID does not exist. |
| `SANDWICH_NOT_FOUND` | 404 | Specified sandwich hash or ID does not exist or has expired. |
| `INVALID_COMPOSITION` | 400 | Sandwich composition is malformed or references invalid ingredients. |
| `INVALID_INPUT` | 400 | Request body fails validation (includes field-level detail). |
| `DUPLICATE_RESOURCE` | 409 | Attempted to create a resource that already exists. |
| `RATE_LIMITED` | 429 | Too many requests. Retry after the specified duration. |
| `INTERNAL_ERROR` | 500 | Unexpected server error. Details logged server-side, not exposed to client. |

### 9.2 Validation Error Format

When input validation fails, the error response includes field-level detail:

```json
{
    "error": {
        "code": "INVALID_INPUT",
        "message": "Validation failed.",
        "status": 400,
        "details": [
            {
                "field": "rating",
                "message": "Rating must be an integer between 1 and 5."
            },
            {
                "field": "display_name",
                "message": "Display name must not exceed 50 characters."
            }
        ]
    }
}
```

---

## 10. Rate Limiting

### 10.1 Rate Limit Tiers

| Tier | Applies To | Limit | Window |
|---|---|---|---|
| **Public Read** | `GET` on all public endpoints | 100 requests | Per minute per IP |
| **Public Write** | `POST /api/sandwiches/share` | 10 requests | Per minute per IP |
| **Authenticated Read** | `GET` on auth endpoints | 200 requests | Per minute per user |
| **Authenticated Write** | `POST`, `PATCH`, `DELETE` on auth endpoints | 30 requests | Per minute per user |

### 10.2 Rate Limit Headers

All responses include rate limit headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1709312460
```

### 10.3 Rate Limit Exceeded Response (429)

```json
{
    "error": {
        "code": "RATE_LIMITED",
        "message": "Too many requests. Please try again later.",
        "status": 429,
        "retry_after": 23
    }
}
```

`retry_after` is the number of seconds until the rate limit window resets.

---

## 11. Future Endpoints

The following endpoints are planned for future phases. They are documented here for architectural awareness but are not implemented in V1.

### 11.1 Global Search (Future)

A unified search endpoint that queries across all sandwich sources (database, community, and optionally the user's own history). This is the primary search experience once the database and community features launch.

```
GET /api/search
```

**Auth:** [AUTH OPTIONAL] (authenticated users also get results from their saved history)

**Query Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `q` | string | Yes | Free-text search query. Min 2 characters. Matches sandwich names, ingredient names, descriptions, and origin regions. |
| `source` | string | No | Filter by source: `all` (default), `database`, `community`, `saved`. `saved` requires auth. |
| `diet` | string | No | Comma-separated dietary filters. Returns only sandwiches where all ingredients match the specified tags. |
| `ingredient` | string | No | Comma-separated ingredient slugs. Returns sandwiches containing ALL specified ingredients. |
| `region` | string | No | Filter by origin region (database entries only). |
| `min_rating` | number | No | Minimum aggregate rating (e.g., `min_rating=4` for 4+ star sandwiches). |
| `sort` | string | No | Sort order: `relevance` (default), `rating_high`, `popular`, `newest`. |
| `limit` | integer | No | Results per page. Default: 20. Max: 50. |
| `offset` | integer | No | Pagination offset. Default: 0. |

**Response (200):**

```json
{
    "data": [
        {
            "type": "database",
            "id": "uuid",
            "slug": "cuban-sandwich",
            "name": "Cuban Sandwich",
            "description": "A pressed sandwich of ham, roasted pork...",
            "origin_country": "Cuba",
            "avg_rating": 4.7,
            "rating_count": 342,
            "image_url": "/assets/database/cuban-sandwich.jpg",
            "url": "/sandwiches/cuban-sandwich"
        },
        {
            "type": "community",
            "id": "uuid",
            "slug": "pastrami-gruyere-sourdough-a3f8",
            "name": "Pastrami & Gruyere on Sourdough",
            "avg_rating": 4.2,
            "rating_count": 18,
            "url": "/community/pastrami-gruyere-sourdough-a3f8"
        },
        {
            "type": "saved",
            "id": "uuid",
            "name": "Turkey & Swiss on Rye",
            "rating": 5,
            "is_favorite": true,
            "url": null
        }
    ],
    "meta": {
        "timestamp": "2026-03-01T12:00:00Z",
        "query": "cuban",
        "count": 3,
        "total": 3,
        "sources_searched": ["database", "community", "saved"]
    }
}
```

**Implementation Notes:**

- Full-text search powered by PostgreSQL's `tsvector` and `tsquery` for the database and community tables.
- Saved sandwich search uses JSONB containment queries (less performant but acceptable for per-user datasets of max 50 items).
- Relevance scoring combines text match quality with rating and popularity signals.
- Search suggestions/autocomplete is a potential future enhancement but not included in the initial implementation.

### 11.2 Sandwich Database (Future)

```
GET    /api/database                    List/search all database entries
GET    /api/database/:slug              Get a single database entry
POST   /api/database/:slug/ratings      Submit a rating [AUTH]
GET    /api/database/:slug/comments     List comments
POST   /api/database/:slug/comments     Add a comment [AUTH]
DELETE /api/database/:slug/comments/:id Delete own comment [AUTH]
GET    /api/database/:slug/photos       List approved photos
POST   /api/database/:slug/photos       Upload a photo [AUTH]
```

### 11.3 Community Leaderboard (Future)

```
GET    /api/community                         Leaderboard (top rated, popular, trending)
GET    /api/community/:slug                   Single community sandwich
POST   /api/community/:slug/ratings           Submit a rating [AUTH]
GET    /api/community/:slug/comments          List comments
POST   /api/community/:slug/comments          Add a comment [AUTH]
DELETE /api/community/:slug/comments/:id      Delete own comment [AUTH]
GET    /api/community/:slug/photos            List approved photos
POST   /api/community/:slug/photos            Upload a photo [AUTH]
```

### 11.4 Admin Endpoints (Future)

```
GET    /api/admin/ingredients            List all ingredients (including disabled)
POST   /api/admin/ingredients            Add new ingredient
PATCH  /api/admin/ingredients/:id        Update ingredient
PATCH  /api/admin/compat-matrix          Update affinity scores
GET    /api/admin/moderation/comments    Review flagged comments
PATCH  /api/admin/moderation/comments/:id  Approve/reject comment
GET    /api/admin/moderation/photos      Review pending photos
PATCH  /api/admin/moderation/photos/:id  Approve/reject photo
```

### 11.5 URL Pattern Reservation

The following API path prefixes are reserved and must not be used for other purposes in V1:

- `/api/search`
- `/api/database/*`
- `/api/community/*`
- `/api/admin/*`
- `/api/blog/*`

---

### Revision History

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0 | 2026-03-01 | Draft | Initial API endpoints specification for Between the Bread |
