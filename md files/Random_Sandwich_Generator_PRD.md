# Between the Bread — Project Requirements Document

**Project Name:** Between the Bread
**Domain:** betweenbread.co
**Version:** 1.0
**Date:** March 1, 2026
**Status:** Draft

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Product Vision and Goals](#2-product-vision-and-goals)
3. [User Personas](#3-user-personas)
4. [Functional Requirements](#4-functional-requirements)
5. [Ingredient Data Architecture](#5-ingredient-data-architecture)
6. [User Interface Requirements](#6-user-interface-requirements)
7. [Randomization Engine](#7-randomization-engine)
8. [Technical Architecture](#8-technical-architecture)
9. [Non-Functional Requirements](#9-non-functional-requirements)
10. [Phased Delivery Roadmap](#10-phased-delivery-roadmap)
11. [Success Metrics](#11-success-metrics)
12. [Open Questions and Risks](#12-open-questions-and-risks)

---

## 1. Project Overview

### 1.1 Summary

The Random Sandwich Generator is the flagship feature of Between the Bread (betweenbread.co), a standalone web application centered around sandwich culture. The generator (subtitled "The Delicatessen of Destiny") uses a dice-roll mechanic to select ingredients across multiple sandwich component categories, presenting results with engaging animations and a visual sandwich builder. The broader Between the Bread platform will eventually expand to include a sandwich encyclopedia, community features, and more (see Future Considerations).

### 1.2 Project Information

| Field | Detail |
|---|---|
| **Project Name** | Between the Bread |
| **Domain** | betweenbread.co |
| **Platform** | Standalone Web Application (responsive) |
| **Target Launch** | TBD |
| **Version** | 1.0 (MVP) |
| **Status** | Requirements Phase |

---

## 2. Product Vision and Goals

### 2.1 Vision Statement

A delightful, low-friction web experience that solves the universal problem of "what should I eat?" by turning sandwich creation into a game. Users should feel a mix of anticipation during the roll, amusement at unexpected combinations, and genuine inspiration to try something new.

### 2.2 Primary Goals

- **Entertainment:** Deliver a satisfying, replayable dice-roll experience with polished animations and a playful personality.
- **Utility:** Generate genuinely buildable sandwiches that users might actually make or order.
- **Shareability:** Enable users to share their generated sandwiches via unique URLs, driving organic traffic.
- **Retention:** Encourage return visits through user accounts, saved history, and the inherent replayability of the randomizer.

### 2.3 Anti-Goals (Explicitly Out of Scope for V1)

- Native mobile app (responsive web only)
- Recipe or preparation instructions
- Integration with food delivery services
- Ingredient sourcing
- User-submitted custom ingredients (admin-managed only)
- Social features beyond link sharing (no comments, no feeds)

---

## 3. User Personas

### 3.1 The Indecisive Luncher

Someone standing in front of the deli counter or their own fridge, overwhelmed by choice. They want the app to just tell them what to make. They will use it quickly on mobile, likely once, and may never return unless the result is memorable enough to share.

### 3.2 The Adventurous Foodie

Someone who already knows what they like but wants to be pushed outside their comfort zone. They will engage with the lock/re-roll mechanic to keep ingredients they approve of while randomizing the rest. They are the most likely to use dietary filters and the sanity-check toggle.

### 3.3 The Social Sharer

Someone who primarily engages with the app for entertainment value and sharing. They want absurd or hilarious combinations they can text to friends or post on social media. Pure chaos mode is their default. They care about the shareable URL and how it renders in link previews.

### 3.4 The Repeat Visitor

Someone who creates an account, saves favorites, and uses the app as a recurring lunch-decision tool. They value history, the ability to lock preferences, and dietary filters that remember their restrictions across sessions.

---

## 4. Functional Requirements

### 4.1 Core Randomization

#### FR-001: Roll All

| Attribute | Specification |
|---|---|
| **Description** | A single primary action button triggers randomization across all unlocked ingredient categories simultaneously. |
| **Behavior** | Each unlocked category cycles through 6-10 random options at 80ms intervals before settling on a final selection. Categories animate in a staggered cascade (200ms delay between each) for visual drama: bread first, then protein, cheese, toppings, condiments. Locked categories are skipped entirely and retain their current value. The button is disabled during animation to prevent double-rolls. Button text updates contextually: "Roll the Dice" on first visit, "Roll Again" on subsequent rolls. |
| **Priority** | P0 (Must Have) |

#### FR-002: Individual Category Roll

| Attribute | Specification |
|---|---|
| **Description** | Each ingredient category has its own dice button allowing independent re-rolls without affecting other categories. |
| **Behavior** | Clicking a category's dice icon triggers the same cycling animation for that category only. Disabled when the category is locked. Does not affect any other category's current selection. |
| **Priority** | P0 (Must Have) |

#### FR-003: Lock/Unlock Ingredients

| Attribute | Specification |
|---|---|
| **Description** | Each category has a toggle lock that prevents it from being re-rolled during a Roll All action or individual roll. |
| **Behavior** | Lock toggle is a clickable icon (locked/unlocked padlock) on each category row. Locked categories display a distinct visual state (filled lock icon, tinted background). Lock is only available after a category has been rolled at least once (disabled on empty categories). Locking does not persist across page refreshes for anonymous users; persists for authenticated users. |
| **Priority** | P0 (Must Have) |

---

### 4.2 Randomization Modes

#### FR-004: Pure Random Mode (Default)

| Attribute | Specification |
|---|---|
| **Description** | All ingredients are selected with equal probability from their category pool. No compatibility weighting is applied. This is the default mode. |
| **Behavior** | Single-pick categories (bread, protein, cheese): one option selected uniformly at random. Multi-pick categories (toppings): 1-4 options selected. Condiments: 1-2 options selected. No ingredient is excluded or weighted based on other selections. |
| **Priority** | P0 (Must Have) |

#### FR-005: Smart Mode (Compatibility Toggle)

| Attribute | Specification |
|---|---|
| **Description** | When enabled, the randomizer applies compatibility weights to favor ingredient combinations that pair well together. Not enabled by default. |
| **Behavior** | Toggle switch labeled "Smart Mode" in the app settings/controls area. Uses a compatibility matrix (see Section 7: Randomization Engine) to weight selections based on previously rolled ingredients. Roll order matters: bread is selected first (unweighted), then each subsequent category is weighted based on prior selections. Smart Mode reduces but does not eliminate unlikely combinations. Minimum probability floor ensures any ingredient can still appear. Visual indicator (badge or label) shows when Smart Mode is active. |
| **Priority** | P1 (Should Have) |

---

### 4.3 Dietary Filters

#### FR-006: Dietary Restriction Filters

| Attribute | Specification |
|---|---|
| **Description** | Users can enable dietary restriction filters that constrain the available ingredient pool before randomization. |
| **Supported Filters** | **Vegetarian:** Excludes all meat and fish proteins. Includes eggs and dairy. **Vegan:** Excludes all animal products (meat, fish, dairy, eggs, honey-based condiments). **Gluten-Free:** Excludes wheat-based breads. Includes GF-tagged alternatives. **Dairy-Free:** Excludes all cheese options except "No Cheese." Excludes dairy-based condiments. |
| **Behavior** | Multiple filters can be active simultaneously (intersection logic: vegan + gluten-free). If filters reduce a category to zero options, display a warning and suggest loosening filters. For authenticated users, filter preferences persist across sessions. Filters are accessible via a settings panel or toggle row above the category list. Each ingredient in the data model must carry dietary tags (see Section 5). |
| **Priority** | P1 (Should Have) |

---

### 4.4 Shareable Sandwich Links

#### FR-007: Share via URL

| Attribute | Specification |
|---|---|
| **Description** | After generating a complete sandwich, users can share it via a unique URL that, when opened, displays the exact sandwich combination. |
| **Behavior** | A "Share" button appears after all categories have been rolled. Clicking generates a URL encoding the sandwich state (query parameters or a short hash). URL copies to clipboard with visual confirmation (toast notification). Shared URLs render with Open Graph meta tags for rich link previews (sandwich name, description, and optionally a generated image). Shared sandwich pages show the full result with a "Make Your Own" call-to-action button. |
| **URL Format Options** | **Option A (stateless):** Encode ingredient IDs in query params. Pro: no backend needed. Con: long URLs. **Option B (server-side):** Generate a short hash mapped to a stored combination. Pro: clean URLs. Con: requires persistence layer. **Recommended:** Option B for cleaner sharing, with Option A as fallback. |
| **Priority** | P1 (Should Have) |

---

### 4.5 User Accounts and Saved History

#### FR-008: User Accounts

| Attribute | Specification |
|---|---|
| **Description** | Users can create accounts to save generated sandwiches, maintain persistent dietary preferences, and view their generation history. |
| **Authentication** | Support email/password registration and OAuth (Google, Apple) for frictionless sign-up. The app must be fully functional without an account. Account creation is optional and additive. Guest users can still use all core features (roll, lock, filters, share). History is session-only for guests. |
| **History** | Authenticated users can save sandwiches to a persistent history (up to 50 entries). History displays sandwich name, full ingredients, and timestamp. Users can favorite/star sandwiches for quick access. Users can delete individual history entries or clear all. History is searchable and filterable: free-text search matches against sandwich name and ingredient names, filter by rating (1-5 or unrated), filter by favorites only, sortable by newest, oldest, highest rated, lowest rated, or name alphabetically. |
| **Persistent Preferences** | Dietary filters persist across sessions for authenticated users. Smart Mode preference persists. Lock states do not persist (intentional: each session is a fresh start). |
| **Priority** | P1 (Should Have) |

---

### 4.6 Visual Sandwich Builder

#### FR-009: Animated Sandwich Stack

| Attribute | Specification |
|---|---|
| **Description** | A visual representation of the sandwich that builds layer by layer as ingredients are rolled, stacking from bottom bun upward. Each ingredient should be visually distinguishable with a realistic or semi-realistic appearance. |
| **Visual Style** | Each ingredient has its own unique visual asset rather than a generic color-coded layer. The goal is for the user to look at the sandwich stack and visually identify each ingredient. **V1: AI-generated ingredient images** with a consistent art style applied across all assets via style-transfer or uniform prompt engineering. All assets must share cohesive lighting, color temperature, and level of detail so the sandwich looks unified when stacked. **Future:** If the site gains traction, upgrade to hand-illustrated sprites or professional photo cutouts for a premium feel. The asset pipeline should be designed so that swapping in new image sets requires only replacing files and updating asset paths, with no code changes to the rendering logic. |
| **Asset Requirements** | Every ingredient in the database requires an associated image asset (transparent PNG or SVG) representing its appearance as a sandwich layer (side profile, as if the sandwich were sliced in half). Assets must be uniform in width with appropriate height variation per category (bread layers taller, condiment layers thinner). V1 requires approximately 105 ingredient assets across all categories (90 standard + 15 Chef's Special). Trigger toppings do not require visual assets since they are not displayed. |
| **Behavior** | Layers animate in with a drop-in effect as their category is rolled. Completed sandwich gently floats/bobs to indicate it is finished. Top bun (rounded dome shape) appears when bread is rolled. Bottom bun (flat) is the base. Multi-pick categories (toppings, condiments) stack their individual ingredient visuals as separate layers. |
| **Priority** | P0 (Must Have) |

---

### 4.7 Sandwich Summary Card

#### FR-010: Summary Card

| Attribute | Specification |
|---|---|
| **Description** | After all categories are rolled, a summary card displays the complete sandwich as a formatted name and full ingredient list. |
| **Format** | Title line: "[Protein] & [Cheese] on [Bread]" (e.g., "Pastrami & Gruyere on Sourdough"). Subtitle line: "with [Toppings] & [Condiments]". If cheese is "No Cheese," omit from title. Estimated cost displayed below the subtitle (e.g., "Estimated cost: ~$7.40"). Card includes Share button and Save button (if authenticated). |
| **Priority** | P0 (Must Have) |

---

### 4.8 Estimated Cost

#### FR-011: Sandwich Cost Estimate

| Attribute | Specification |
|---|---|
| **Description** | After all categories are rolled, the app displays an estimated total cost range to build the sandwich based on per-ingredient cost data across two contexts: Retail and Restaurant. |
| **Behavior** | Each ingredient carries four estimated cost points: `retail_low` (generic brand per-serving cost), `retail_high` (artisanal brand per-serving cost), `restaurant_low` (casual deli per-serving cost), and `restaurant_high` (premium deli per-serving cost). The summary card displays a toggle between "Retail" and "Restaurant" pricing. Within each context, a range is shown (e.g., "Retail: $4.20 – $8.50"). The total sandwich cost range is the sum of all selected ingredients' low prices and the sum of all high prices for the active context. The default context is Retail. Authenticated users' cost context preference is persisted in their profile and auto-applied on return visits. Cost updates dynamically as individual categories are re-rolled or the cost context is toggled. |
| **Data Source** | V1: Static per-ingredient cost estimates curated manually using U.S. retail (generic and artisanal brands) and restaurant/deli (casual and premium) per-serving pricing. Future: Integration with a grocery pricing API for regional accuracy (post-V1). |
| **Disclaimer** | A persistent disclaimer must be displayed near the cost estimate: "Estimated pricing is approximate. Retail prices reflect per-serving costs at U.S. grocery stores (generic to artisanal). Restaurant prices reflect per-serving costs at U.S. delis and sandwich shops (casual to premium). Actual prices vary by region, retailer, and availability. Pricing is not guaranteed to be accurate. Cost data last updated: [MM/DD/YYYY]." The last updated date reflects the most recent review of the static cost dataset and must be updated whenever cost data is revised. |
| **Priority** | P1 (Should Have) |

---

### 4.9 Nutritional Information

#### FR-012: Nutrition Summary

| Attribute | Specification |
|---|---|
| **Description** | After all categories are rolled, the app displays an approximate nutritional breakdown for the complete sandwich. |
| **Behavior** | Each ingredient carries static nutrition fields (see Section 5). The total sandwich nutrition is the sum of all selected ingredients' values. Displayed as a collapsible/expandable panel below the summary card. Summary view shows: total calories, protein (g), fat (g), and carbohydrates (g). Expanded view adds: fiber (g), sodium (mg), and sugar (g). Values are clearly labeled as estimates (e.g., "Approximate nutrition based on standard serving sizes"). Nutrition updates dynamically as individual categories are re-rolled. |
| **Data Source** | V1: Static per-ingredient nutrition data sourced from USDA FoodData Central (public domain). Each ingredient's values represent a single standard sandwich serving. Future: Integration with a nutrition API like Nutritionix for more precise data (post-V1). |
| **Disclaimer** | A persistent disclaimer must be displayed near the nutrition panel: "Nutritional information is approximate, based on U.S. standard serving sizes (FDA/USDA), and is not guaranteed to be accurate. Actual values may vary by brand, preparation method, and portion size. This information is not a substitute for professional dietary advice." |
| **Priority** | P1 (Should Have) |

---

### 4.10 Double Protein / Double Cheese Toggles

#### FR-013: Double Selection Toggle

| Attribute | Specification |
|---|---|
| **Description** | Protein and Cheese each have a "Double" toggle button that, when enabled, causes the randomizer to select 2 items instead of 1 for that category. |
| **Behavior** | Toggle is a clearly labeled button or switch on the Protein and Cheese category rows (e.g., "Double" or "x2"). Default state is off (single pick). When enabled, the category rolls 2 distinct items (no duplicates). Both items display in the category row, separated by " & " (e.g., "Cheddar & Swiss"). Both items render as separate layers in the visual sandwich stack. Summary card title adjusts accordingly (e.g., "Pastrami & Salami with Cheddar & Swiss on Sourdough"). Cost and nutrition calculations sum both selections. Toggle state persists for the session. For authenticated users, persists across sessions. In Smart Mode, the second pick is weighted against the first pick's compatGroup and all other previously selected ingredients. |
| **Edge Case** | If Cheese is set to double and one selection is "No Cheese," only the other cheese is displayed. If both selections are "No Cheese" (statistically rare), display "No Cheese" once. |
| **Priority** | P1 (Should Have) |

---

### 4.11 Chef's Special (Bonus Category)

#### FR-014: Chef's Special Hidden Category

| Attribute | Specification |
|---|---|
| **Description** | A hidden bonus ingredient category that activates only when a trigger topping is randomly selected. Adds an element of surprise and gamification. |
| **Activation** | Two hidden trigger items exist in the Toppings pool. When one is selected during a toppings roll, it is silently removed from the displayed results (it does not appear on the sandwich) and the Chef's Special category auto-rolls a single item from the Chef's Special ingredient pool. |
| **Deactivation** | If toppings are re-rolled and no trigger item is selected, the Chef's Special result is cleared and the category row disappears from the UI. |
| **UI Behavior** | When triggered, the Chef's Special row animates in below Condiments with a distinct reveal animation (shimmer or glow) to signal a special event. The row has no lock button and no individual dice button. A label or badge (e.g., "Chef's Special!") distinguishes it from standard categories. |
| **Locking** | The Chef's Special cannot be locked. It is entirely dependent on the toppings roll. |
| **Summary Card** | When active, the Chef's Special ingredient appears on the summary card as an additional line (e.g., "with a Chef's Special: Hot Honey"). |
| **Cost and Nutrition** | Chef's Special ingredients carry the same cost and nutrition data fields as all other ingredients and are included in totals when active. |
| **Priority** | P1 (Should Have) |

---

### 4.12 Sandwich Rating System

#### FR-015: Star Rating for Saved Sandwiches

| Attribute | Specification |
|---|---|
| **Description** | Authenticated users can rate their generated sandwiches on a 1-5 star scale. Ratings are attached to saved sandwich history entries and provide data for potential future Smart Mode refinements. |
| **Rating Scale** | 5 stars: Excellent / Masterpiece. 4 stars: Good / Above Average. 3 stars: Average / Satisfactory. 2 stars: Below Average / Poor. 1 star: Very Poor / Terrible. |
| **Behavior** | A 5-star rating widget appears on the summary card and on each sandwich in the history panel. Rating is optional. Users can rate at the time of generation or retroactively from their history. Users can update a rating at any time by selecting a different star value. Star tooltips display the label on hover/long-press (e.g., hovering over 4 stars shows "Good / Above Average"). Unrated sandwiches display empty/outline stars with a "Rate this sandwich" prompt. |
| **Authentication** | Rating is only available to authenticated users. Guest users see the star display but tapping it prompts account creation. |
| **Data Storage** | Ratings are stored as an integer (1-5) on the user's sandwich history record. Ratings are private to the user in V1 (no public aggregate scores). |
| **Future Use** | Aggregate rating data across users could inform Smart Mode compatibility weights in future versions (e.g., highly rated combinations get a slight affinity boost). This is explicitly out of scope for V1 but the data should be collected with this future use in mind. |
| **Priority** | P1 (Should Have) |

---

### 5.1 Category Structure

The ingredient database is organized into six categories. Each category has distinct selection behavior.

| Category | Selection | Pick Count | Options (V1) | Required |
|---|---|---|---|---|
| Bread | Single | Exactly 1 | 17 | Yes |
| Protein | Single (default) / Double (toggle) | 1 or 2 | 20 | Yes |
| Cheese | Single (default) / Double (toggle) | 1 or 2 | 17 | Yes* |
| Toppings | Multi | 1-4 (random) | 22** | Yes |
| Condiments | Multi | 1-2 (random) | 20 | Yes |
| Chef's Special | Single | Exactly 1 | TBD (see 5.4) | Conditional*** |

*Cheese includes "No Cheese" as a valid option, so it always has a selection.

**Toppings includes 20 standard toppings + 2 hidden trigger items that activate the Chef's Special category (see Section 5.4). Trigger items do not appear on the sandwich and are purely a mechanic.

***Chef's Special only appears when a trigger topping is randomly selected. It cannot be locked, and it disappears if toppings are re-rolled without hitting a trigger.

#### Double Protein / Double Cheese Toggle

Protein and Cheese each have a toggle button (labeled "Double") that, when enabled, causes the randomizer to select 2 options instead of 1 for that category. The toggle is user-controlled and persists for the session (or across sessions for authenticated users). When double mode is active: both selections are displayed in the category row and on the summary card, both appear as separate layers in the visual sandwich stack, cost and nutrition calculations include both selections, and in Smart Mode, the second pick is weighted against both the first pick's compatGroup and all previously selected ingredients.

### 5.2 Ingredient Data Model

Each ingredient requires the following properties for proper filtering, display, and compatibility logic.

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique identifier (e.g., "bread_sourdough") |
| `name` | string | Display name (e.g., "Sourdough") |
| `category` | enum | bread, protein, cheese, toppings, condiments |
| `dietaryTags` | string[] | Array of tags: vegetarian, vegan, gluten_free, dairy_free |
| `compatGroup` | string | Flavor profile grouping for Smart Mode (e.g., "italian", "deli_classic", "asian_fusion", "tex_mex") |
| `estimated_cost` | object | Per-serving cost in USD across four estimated cost points: `retail_low` (generic brand grocery), `retail_high` (artisanal brand grocery), `restaurant_low` (casual deli), `restaurant_high` (premium deli). Example: `{"retail_low": 0.30, "retail_high": 1.20, "restaurant_low": 0.90, "restaurant_high": 3.60}`. |
| `imageAsset` | string | Path or URL to the ingredient's visual asset for the sandwich stack (transparent PNG or SVG, side-profile layer view). Required for all ingredients. |
| `nutrition` | object | Per-serving nutrition data: `{ calories: number, proteinG: number, fatG: number, carbsG: number, fiberG: number, sodiumMg: number, sugarG: number }` |
| `enabled` | boolean | Admin toggle to include/exclude without deletion |

### 5.3 Full Ingredient List (V1)

Each category is pre-populated and admin-managed. User-submitted ingredients are out of scope.

**Bread (17):** Sourdough, Ciabatta, Rye, Whole Wheat, Brioche, Pumpernickel, Focaccia, Pita, Baguette, Marble Rye, Everything Bagel, Croissant, Pretzel Roll, Texas Toast, Naan, White Bread, Tortilla.

**Protein (20):** Turkey, Roast Beef, Ham, Salami, Prosciutto, Grilled Chicken, Bacon, Pastrami, Pepperoni, Smoked Salmon, Pulled Pork, Corned Beef, Mortadella, Capicola, Tuna Salad, Egg Salad, Fried Egg, Tofu, Tempeh, Falafel.

**Cheese (17):** Cheddar, Swiss, Provolone, Mozzarella, Pepper Jack, Gouda, Brie, Gruyere, Muenster, Havarti, Blue Cheese, Manchego, Cream Cheese, Burrata, Goat Cheese, Cheese Whip, No Cheese.

**Toppings (22):** Lettuce, Tomato, Red Onion, Pickles, Avocado, Roasted Peppers, Banana Peppers, Jalapenos, Sprouts, Arugula, Sauerkraut, Coleslaw, Olives, Cucumbers, Sun-Dried Tomatoes, Artichoke Hearts, Caramelized Onions, Kimchi, Microgreens, Pickled Red Onion, Chef's Pick A*, Chef's Pick B*.

*Chef's Pick A/B are hidden trigger items (working names, to be finalized). They do not appear on the sandwich. When one is randomly selected during a toppings roll, it is silently removed from the displayed toppings and the Chef's Special category is activated. The user sees one fewer visible topping than the roll count, plus the Chef's Special result.

**Condiments (20):** Mayo, Mustard, Dijon, Hot Sauce, Ranch, Pesto, Aioli, Hummus, Chipotle Mayo, Honey Mustard, BBQ Sauce, Sriracha, Olive Oil & Vinegar, Horseradish, Tzatziki, Buffalo Sauce, Garlic Butter, Balsamic Glaze, Russian Dressing, Green Goddess.

### 5.4 Chef's Special Category

The Chef's Special is a hidden bonus category that adds an element of surprise and gamification to the experience.

**Activation Mechanic:** Two trigger items are included in the Toppings pool (working names: Chef's Pick A, B). These trigger items are weighted equally with all other toppings during randomization. When a trigger item is randomly selected as part of a toppings roll, the trigger item is silently removed from the displayed topping results (it does not appear on the sandwich), and the Chef's Special category automatically rolls a single item from the Chef's Special ingredient pool.

**Deactivation:** If the user re-rolls toppings and no trigger item is selected, the Chef's Special result is cleared and the category disappears from the UI. The Chef's Special cannot be locked.

**UI Behavior:** When triggered, the Chef's Special row animates in below the Condiments row with a distinct "reveal" animation (e.g., a shimmer or glow effect) to signal that something special happened. The row has no lock button and no individual dice button. It can only be activated by re-rolling toppings and hitting a trigger.

**Probability:** With 22 toppings (20 standard + 2 triggers) and 1-4 random picks, the probability of activating the Chef's Special on any given roll is approximately 9% (1 pick) to 33% (4 picks). Average activation rate across all pick counts is roughly 20%.

**Chef's Special Ingredient Pool (V1):** This pool contains unconventional, unexpected, or premium sandwich additions that don't fit neatly into the standard categories. Examples (to be finalized):

- Truffle Oil Drizzle
- Fried Onion Strings
- Everything Bagel Seasoning
- Crushed Potato Chips
- Pickle Relish
- Cranberry Sauce
- Mango Chutney
- Bacon Jam
- Hot Honey
- Herb Butter
- Pimento Cheese Spread
- Calabrian Chili Crisp
- Toasted Sesame Seeds
- Crispy Shallots
- Fig Jam

---

## 6. User Interface Requirements

### 6.1 Layout and Visual Design

**Aesthetic Direction:** Warm, retro-diner inspired design with a modern polish. Think hand-lettered menu boards meets clean web typography. The tone is playful and inviting, not childish.

**Color Palette:** Warm creams and tans as the base, with ingredient-coded accent colors (amber for bread, red for protein, yellow for cheese, green for toppings, orange for condiments). Primary action color: warm red.

**Typography:** Serif display font (e.g., Libre Baskerville) for headings and sandwich names. Clean sans-serif (e.g., DM Sans) for UI labels and controls. No monospace except in developer-facing contexts.

**Layout:** Single-column, mobile-first. Maximum content width of 480px, centered. Visual sandwich builder at the top, Roll All button, then category rows, then summary card.

### 6.2 Component Hierarchy

1. **Header:** App title, subtitle, tagline.
2. **Sandwich Visual:** Layered visual builder showing the sandwich stack.
3. **Roll All Button:** Primary CTA, prominent placement below the visual.
4. **Mode Toggle:** Smart Mode on/off switch.
5. **Dietary Filters:** Collapsible panel or toggle row for dietary restrictions.
6. **Category Rows (x5):** Each row contains lock toggle, category icon/emoji, category label, current selection display, and individual dice button. Protein and Cheese rows additionally include a "Double" toggle.
7. **Chef's Special Row:** Conditional row that appears below Condiments only when triggered. No lock or dice button. Distinct visual treatment (shimmer/glow).
8. **Summary Card:** Sandwich name, full description, estimated cost, share and save buttons.
8. **Nutrition Panel:** Collapsible panel showing calorie and macro breakdown.
9. **History Panel:** Collapsible list of saved/past sandwiches.

### 6.3 Responsive Behavior

| Breakpoint | Behavior |
|---|---|
| **Mobile (<480px)** | Full-width layout. Touch-optimized tap targets (minimum 44px). Sandwich visual scales proportionally. Category rows stack vertically. |
| **Tablet (480-768px)** | Centered single column at max-width. Slightly larger visual sandwich. Same layout as mobile. |
| **Desktop (>768px)** | Centered content column with generous whitespace. Optional: sandwich visual and category list side by side. |

### 6.4 Animation Specifications

| Animation | Specification |
|---|---|
| **Dice cycling** | Text in the selection area rapidly cycles through 6-10 random options at 80ms intervals, with a shimmer/pulse opacity effect. |
| **Layer drop-in** | Each sandwich layer animates in from above with a spring-eased drop (cubic-bezier 0.34, 1.56, 0.64, 1). 0.4s duration, staggered 0.1s per layer. |
| **Completion float** | Completed sandwich gently bobs up and down (6px travel, 3s cycle, ease-in-out). Stops during rolling. |
| **Button pulse** | Roll All button subtly pulses on first load to draw attention (scale 1 to 1.03, 2s cycle). Stops after first roll. |
| **Summary fade-up** | Summary card fades in and slides up 12px over 0.4s on completion. |
| **Dice icon spin** | Individual dice icons rotate 360 degrees continuously during their category's roll (0.5s linear). |
| **Chef's Special reveal** | When triggered, the Chef's Special row slides in from below with a golden shimmer/glow effect (0.6s ease-out). A brief sparkle or star particle effect accompanies the reveal to signal the bonus. |

### 6.5 Accessibility Requirements

- All interactive elements must be keyboard navigable (Tab, Enter, Space).
- Animations must respect `prefers-reduced-motion`. When enabled, disable all animations and show results instantly.
- Color contrast must meet WCAG 2.1 AA minimum (4.5:1 for body text, 3:1 for large text).
- All buttons must have descriptive `aria-label` attributes (e.g., "Roll bread ingredient," "Lock cheese selection").
- Screen reader announcements for roll results using `aria-live` regions.
- Touch targets minimum 44x44px on mobile.

---

## 7. Randomization Engine

### 7.1 Pure Random Logic

In pure random mode, selection is straightforward: each enabled ingredient in a category has equal probability. For multi-pick categories, the pick count itself is randomized uniformly within the defined range (1-4 for toppings, 1-2 for condiments), then that many items are selected without replacement via Fisher-Yates shuffle.

### 7.2 Smart Mode Logic

Smart Mode introduces weighted probabilities based on flavor compatibility groupings. The system works as follows:

1. Each ingredient is assigned a `compatGroup` string representing its flavor profile (e.g., "italian", "deli_classic", "asian_fusion", "tex_mex", "southern", "mediterranean").
2. A compatibility affinity matrix defines pairwise scores between groups (0.0 to 1.0). For example, "italian" and "mediterranean" have high affinity (0.85); "deli_classic" and "asian_fusion" have low affinity (0.2).
3. When rolling categories sequentially (bread first, then protein, cheese, toppings, condiments), each subsequent roll weights ingredient probabilities based on the average affinity with all previously selected ingredients' groups.
4. A minimum probability floor of 10% of the uniform probability ensures every ingredient can still appear. This prevents the system from ever fully excluding an option.
5. The affinity matrix is admin-configurable and stored in the ingredient data layer, not hardcoded.

### 7.3 Dietary Filter Application

Dietary filters are applied as a pre-processing step before randomization. The filter removes ineligible ingredients from the available pool, then randomization (pure or smart) proceeds on the reduced set. If a filter reduces any category to zero options, the UI displays a warning and the category is skipped with a placeholder message.

---

## 8. Technical Architecture

### 8.1 Frontend Stack

| Component | Technology |
|---|---|
| **Framework** | React 18+ (functional components, hooks) |
| **Styling** | CSS Modules or Tailwind CSS (decision pending). Must support CSS custom properties for theming. |
| **Animation** | CSS transitions and keyframes for core animations. Framer Motion for complex interactions if needed. |
| **State Management** | React useState/useReducer for local state. No global state library needed for V1 scope. |
| **Routing** | React Router for shareable sandwich URLs and potential future pages (about, account). |
| **Build Tool** | Vite (fast dev server, optimized builds). |
| **Hosting** | Vercel or Netlify (static hosting with serverless functions for share links and auth). |

### 8.2 Backend Requirements

V1 requires minimal backend functionality. The following serverless functions or lightweight API endpoints are needed:

- **Share Link Generation:** POST endpoint that stores a sandwich combination and returns a short hash/ID. GET endpoint that retrieves a combination by hash.
- **User Authentication:** OAuth flow handlers for Google/Apple. Session management via JWT or server-side sessions.
- **User Data Persistence:** CRUD operations for saved sandwiches, dietary preferences, and favorites.
- **Ingredient Data:** V1 can serve ingredient data as a static JSON file bundled with the frontend. Future versions may move to an API endpoint for admin management.

### 8.3 Data Persistence

| Data Type | Storage |
|---|---|
| **Ingredient catalog** | Static JSON bundled with frontend (V1). Migrate to database if admin CMS is added. |
| **Shared sandwich links** | Key-value store (e.g., Vercel KV, Redis, or DynamoDB). TTL: 90 days for unclaimed links. |
| **User accounts** | PostgreSQL or equivalent relational database via hosted service (e.g., Supabase, PlanetScale). |
| **User preferences** | Stored in user account record. Dietary filters and smart mode toggle. |
| **Sandwich history** | User-linked records. Max 50 per user. FIFO eviction. Each record includes full ingredient list, timestamp, and optional star rating (1-5 integer). |

---

## 9. Non-Functional Requirements

### 9.1 Performance

- Initial page load (Largest Contentful Paint): under 1.5 seconds on 4G connection.
- Time to Interactive: under 2 seconds.
- Animation frame rate: consistent 60fps during dice cycling and layer animations.
- Total bundle size: under 150KB gzipped (excluding fonts).
- No layout shift during or after roll animations (CLS < 0.1).

### 9.2 Reliability

- The core randomizer must function entirely client-side with zero network dependency. Offline-capable for the roll mechanic.
- Share link generation and user auth gracefully degrade with error messaging if the backend is unavailable.
- 99.9% uptime target for the static frontend. Backend SLA depends on hosting provider.

### 9.3 Security

- All traffic served over HTTPS.
- OAuth tokens stored securely (httpOnly cookies or secure storage, never localStorage).
- Share link hashes must be non-sequential and non-guessable (UUIDv4 or equivalent).
- Rate limiting on share link creation (10 per minute per IP) to prevent abuse.
- Input sanitization on any user-facing data (sandwich names in share links, etc.).

### 9.4 SEO and Social Sharing

- Server-side rendering or pre-rendering for shared sandwich URLs to ensure proper Open Graph meta tag delivery.
- Each shared sandwich page has unique `og:title`, `og:description`, and `og:image` tags.
- Canonical URL structure: `betweenbread.co/sandwich/[hash]` for shared sandwiches.
- Main page has standard SEO meta tags, title, and description optimized for "Between the Bread" branding.

---

## 10. Phased Delivery Roadmap

### 10.1 Phase 1: Core MVP

**Goal:** Deliver the core roll mechanic, visual builder, and lock functionality as a fully functional, polished standalone page.

- Roll All and individual category rolls with animation (FR-001, FR-002)
- Lock/unlock per category (FR-003)
- Pure random mode (FR-004)
- Visual sandwich builder with per-ingredient visual assets (FR-009)
- Asset creation: ~105 ingredient layer images in a consistent art style (90 standard + 15 Chef's Special)
- Summary card (FR-010)
- Responsive design (mobile, tablet, desktop)
- Session-only history (no persistence)

### 10.2 Phase 2: Filters, Smart Mode, Sharing

**Goal:** Add the intelligence layer and virality mechanics.

- Dietary filters with ingredient tagging (FR-006)
- Smart Mode toggle with compatibility engine (FR-005)
- Shareable sandwich links with OG meta tags (FR-007)
- Double Protein / Double Cheese toggles (FR-013)
- Chef's Special hidden bonus category with trigger mechanic (FR-014)
- Estimated cost display with per-ingredient cost data and Retail/Restaurant cost context toggle (FR-011)
- Nutritional information panel with USDA-sourced data (FR-012)
- Backend: share link API, KV store

### 10.3 Phase 3: Accounts and Persistence

**Goal:** Enable repeat engagement through user accounts and persistent preferences.

- User authentication via OAuth (FR-008)
- Persistent sandwich history and favorites (FR-008)
- Sandwich star rating system (FR-015)
- Persistent dietary filter preferences (FR-008)
- Backend: user database, auth flow

### 10.4 Future Considerations (Post-V1)

The following are potential future features that are explicitly out of scope for V1 but worth noting for architectural decisions:

- Admin CMS for ingredient management (add, edit, disable, tag ingredients via a dashboard).
- User-submitted ingredient suggestions (moderated queue).
- Daily sandwich challenge (a pre-determined "sandwich of the day" that all users see).
- "Rate this sandwich" system with aggregate scores influencing Smart Mode weights (data collection begins in V1 via FR-015; aggregation and weight adjustment is a future feature).
- Integration with food delivery APIs (Uber Eats, DoorDash) to order a generated sandwich.
- Nutritional information and calorie estimates per sandwich.
- PWA / installable app with push notifications for daily challenges.
- Upgrade ingredient visual assets from AI-generated to hand-illustrated sprites or professional photo cutouts for a premium look and feel.
- Global search across all sandwich sources (database, community, user history) with filtering by source, dietary restrictions, ingredients, region, and minimum rating. Powered by PostgreSQL full-text search with weighted relevance scoring. Accessible via a dedicated `/search` page and a persistent search icon in the site header.

#### Sandwich Database (Future Feature)

A dedicated section of the site that serves as a comprehensive encyclopedia of well-known sandwiches from around the world. This is a significant content and engineering effort that extends the app beyond a randomizer into a reference platform.

**Structure:** A browsable, searchable index page listing all sandwiches in the database. Each sandwich has its own dedicated page accessible via a unique URL (e.g., `/sandwiches/cuban-sandwich`).

**Individual Sandwich Pages include:**

- **History:** Editorial content covering the sandwich's origin story, cultural significance, and evolution over time.
- **Details:** Canonical ingredient list, regional variations, and preparation notes.
- **Origin:** Country/region of origin, with map pin or flag. Sandwiches can be browsed by region.
- **User Ratings:** 1-5 star rating system (consistent with FR-015) allowing authenticated users to rate the sandwich. Aggregate score displayed publicly.
- **User Comments:** Threaded comment section for authenticated users. Moderation tools required (flag, delete, admin review).
- **User Photos:** Authenticated users can upload photos of their own versions of the sandwich. Photos are moderated before public display. Gallery view on each sandwich page.

**Content Strategy:** Initial database will require editorial content creation for each sandwich entry. Consider a phased launch starting with 50-100 of the most iconic sandwiches worldwide, expanding over time. User-submitted sandwich entries (moderated) could supplement editorial content in later phases.

**Technical Implications:** This feature introduces a full CMS requirement, image upload and storage infrastructure, content moderation tooling, and SEO considerations (each sandwich page should be indexable and rank for relevant search terms). These requirements should be factored into architectural decisions even in V1 to avoid costly refactoring later.

#### Social Leaderboard and Community Gallery (Future Feature)

A public-facing section showcasing community-generated sandwiches with full social engagement features. This extends the current private history and rating system into a shared community experience.

**Leaderboard Functionality:**

- **Top Rated:** Ranked list of user-generated sandwich combinations by aggregate star rating (minimum rating threshold to qualify, e.g., 10+ ratings).
- **Most Popular:** Ranked by number of times a specific combination has been generated across all users.
- **Trending:** Time-weighted ranking highlighting combinations gaining ratings/shares in the past 7 days.
- **Filterable:** Users can filter leaderboards by dietary category (e.g., "Top Rated Vegan Sandwiches") or by ingredient (e.g., "Best sandwiches with Sourdough").

**Individual Leaderboard Entry Pages:** Each sandwich combination on the leaderboard has its own dedicated page (consistent with the Sandwich Database page structure) that includes:

- **Full ingredient breakdown** with visual sandwich stack.
- **User Ratings:** 1-5 star system with aggregate public score.
- **User Comments:** Threaded comment section for discussion, tips, and variations.
- **User Photos:** Community-uploaded photos of their attempts at the combination.
- **Share button** for the specific leaderboard entry URL.
- **"Try This Sandwich" button** that pre-loads the combination into the generator with all categories locked.

**Moderation:** All user-generated content (comments, photos) requires moderation tooling. Consider automated content filtering for photos and text, with admin review queue for flagged content.

**Relationship to Sandwich Database:** The Sandwich Database (editorial, well-known sandwiches) and the Social Leaderboard (community-generated combinations) share the same page template and feature set (ratings, comments, photos) but are separate content sources. The database is editorially curated; the leaderboard is community-driven. Both should live under a unified "Sandwiches" section of the site with clear navigation between "Classic Sandwiches" and "Community Creations."

#### Monetization (Future Feature)

V1 launches without monetization. Future revenue streams will include display advertising and affiliate marketing. The V1 layout should reserve logical ad placement zones to avoid disruptive redesigns when monetization is introduced.

**Display Ads:**

- **Ad Placement Zones:** Banner ad slot below the header (above the sandwich visual). Interstitial slot between the category rows and the summary card. Optional sidebar ad on desktop breakpoints (>768px). Ads must not interfere with the core roll mechanic, animations, or summary card readability.
- **Ad Network:** Google AdSense or a food/lifestyle-specific ad network (e.g., Mediavine, AdThrive) depending on traffic thresholds at time of implementation.
- **User Experience:** Ads should be clearly distinguished from app content. No pop-ups or overlays that block the sandwich visual or roll button. Consider an ad-free premium tier as a future option if user base supports it.

**Affiliate Links:**

- **Ingredient Affiliate Links:** Each ingredient on the summary card and sandwich database pages can link to a purchase option (e.g., Amazon Fresh, Instacart, specialty food retailers) via affiliate links. Displayed as a subtle "Buy ingredients" or shopping cart icon, not as the primary interaction.
- **Sandwich Tools and Equipment:** Affiliate links to sandwich-making tools (knives, cutting boards, panini presses, specialty condiment sets, etc.) displayed as a "Gear Up" section below the summary card or on a dedicated "Sandwich Essentials" page.
- **Affiliate Disclosure:** A clear affiliate disclosure statement is required on any page containing affiliate links, in compliance with FTC guidelines (e.g., "This site contains affiliate links. We may earn a commission on purchases made through these links at no extra cost to you.").
- **Affiliate Networks:** Amazon Associates, Instacart affiliate program, and specialty food retailer programs. Exact partners to be determined based on available programs and commission structures at time of implementation.

**Technical Implications:** Ad integration requires ad script loading that does not degrade page performance (lazy loading, async scripts). Affiliate links require a link management system for tracking, updating, and rotating partner URLs. Both features require cookie consent/privacy compliance (GDPR, CCPA) which should be considered in the V1 privacy policy even before monetization launches.

---

## 11. Success Metrics

| Metric | Phase 1 Target | Phase 2-3 Target |
|---|---|---|
| **Rolls per session** | 3+ average | 5+ average |
| **Session duration** | 60+ seconds average | 90+ seconds average |
| **Share rate** | N/A | 10% of completed sandwiches shared |
| **Return visitor rate** | 5% within 7 days | 15% within 7 days |
| **Account creation** | N/A | 8% of visitors |
| **Lighthouse score** | 90+ across all categories | 90+ maintained |
| **Core Web Vitals** | All green (LCP <1.5s, CLS <0.1, INP <200ms) | Maintained |

---

## 12. Open Questions and Risks

### 12.1 Open Questions

1. **Ingredient count per multi-pick category:** Should the number of toppings (1-4) and condiments (1-2) be configurable by the user, or fixed ranges?
2. **Smart Mode fidelity:** How detailed should the compatibility matrix be? A simple grouping system (6-8 flavor profiles) versus a granular pairwise matrix (N x N ingredients) represents significantly different development effort.
3. **Share link persistence:** Should shared sandwich links expire? If so, after how long? Permanent links require ongoing storage costs.
4. **Ingredient visual asset pipeline:** V1 will use AI-generated images. The asset system should be architected for easy swapability so that hand-illustrated sprites or photo cutouts can replace AI assets in the future without code changes. Key open question: what AI image generation tool/service will be used for the initial batch, and what prompt strategy ensures visual consistency across ~90 assets?
5. **Monetization:** V1 is a non-monetized fun project. Future monetization will include display ads and affiliate links (see Future Considerations: Monetization). Ad placement zones and affiliate link integration points should be considered in the V1 layout to avoid disruptive redesigns later, but no monetization features will be implemented in V1.
6. **Domain and branding:** The project name is "Between the Bread." Domain: betweenbread.co. The tagline "The Delicatessen of Destiny" will be retained as a subtitle/tagline for the randomizer feature specifically, not the overall brand. Note: monitor availability of betweenbread.com and betweenthebread.com for future acquisition to mitigate .co TLD traffic loss.
7. **Cost data accuracy:** Static per-ingredient cost estimates will drift over time with inflation and regional variation. How frequently should cost data be reviewed and updated? Is a "last updated" date on cost estimates sufficient, or should the app disclaim more prominently?
8. **Nutrition data granularity:** All per-ingredient nutrition values will be based on U.S. standard serving sizes as defined by the FDA (21 CFR 101.12) and USDA FoodData Central reference amounts. For example: bread is based on one slice or equivalent (e.g., half a pita, one tortilla), protein is based on 2 oz (56g) per serving, cheese is based on 1 oz (28g) per serving, toppings are based on standard condiment/vegetable serving sizes (~1 oz or ~28g for most items), and condiments are based on 1 tablespoon per serving. These serving size assumptions must be documented in the app's nutrition disclaimer and applied consistently across all ingredients.

### 12.2 Risks

| Risk | Severity | Mitigation |
|---|---|---|
| **Smart Mode feels arbitrary** | Medium | Start with broad flavor groups (6-8) and iterate based on user feedback. Do not over-engineer the compatibility matrix before validating that users care about this feature. |
| **Low repeat engagement** | High | The core mechanic is inherently one-and-done for many users. Sharing mechanics and daily challenges (post-V1) are key retention levers. Phase 1 should focus on making the single-session experience so delightful that users share it. |
| **Scope creep in V1** | Medium | The phased roadmap explicitly separates P0 from P1 features. Phase 1 ships without auth, sharing, or smart mode. These are added only after the core is solid. |
| **Dietary filter edge cases** | Low | Vegan + gluten-free together may reduce some categories to very few options. Test all filter combinations against the ingredient set and ensure graceful degradation. |
| **Animation performance on low-end devices** | Medium | Respect prefers-reduced-motion. Test on mid-range Android devices. Use CSS animations over JavaScript where possible for GPU acceleration. |
| **Cost and nutrition data accuracy** | Medium | Static data will drift with inflation and regional pricing differences. Label all figures clearly as estimates. Include a "data last reviewed" date in the app footer. Plan for a quarterly review cycle of cost data. Nutrition data from USDA is stable but serving size assumptions must be documented and consistent. |
| **Ingredient asset creation bottleneck** | Medium | ~105 unique AI-generated visual assets are required before Phase 1 can ship (90 standard + 15 Chef's Special). Using AI generation significantly reduces timeline vs. hand illustration or photography, but consistency across assets requires careful prompt engineering and likely manual quality review. Mitigate by establishing a prompt template and generating a test batch of 10-15 assets early to validate the style. Build the asset pipeline to be swap-friendly so that future upgrades to hand-illustrated or photo assets require only file replacement, no code changes. |

---

### Revision History

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0 | 2026-03-01 | Draft | Initial requirements document for Between the Bread |
