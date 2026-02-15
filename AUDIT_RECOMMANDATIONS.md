# Audit Report: Oeuvres Recommandées (Recommended Works) Feature

**Date:** 2026-02-14  
**Scope:** Research & analysis for allowing editors to customize recommended works on their Fiche Oeuvre pages  
**Status:** Research complete — NO code changes made

---

## 1. Executive Summary

There is **zero existing recommendation/similar works logic** anywhere in the codebase. No field, no API call, no UI section, and no Strapi content type currently handles "oeuvres recommandées" or any concept of related/similar works. This feature must be built entirely from scratch across:

1. **Strapi backend** (new relation field on the `oeuvre` content type)
2. **Proxy API allowlist** (already allows `oeuvres` routes — no change needed)
3. **Editor management UI** (new section in MoOeuvre or a new modal)
4. **Reader-facing display** (new section in FicheOeuvre)

---

## 2. Current Oeuvre Data Model

### 2.1 Fields observed from API calls and component code

| Field | Type | Source |
|-------|------|--------|
| `id` | Integer (auto) | Strapi |
| `documentId` | String (UUID) | Strapi v5 |
| `titre` | String | AddOeuvreForm, MoOeuvre |
| `titrealt` | String | AddOeuvreForm, MoOeuvre |
| `auteur` | String | AddOeuvreForm, MoOeuvre |
| `annee` | Number | AddOeuvreForm, MoOeuvre |
| `type` | String (free text: "Light Novel", "Web Novel", "Manga", etc.) | AddOeuvreForm, MoOeuvre |
| `categorie` | String (free text) | AddOeuvreForm, MoOeuvre |
| `etat` | Enum string ("En cours", "Arreter", "En pause", "Terminer", "Libre") | MoOeuvre |
| `synopsis` | Rich text (Strapi blocks format) | AddOeuvreForm, MoOeuvre |
| `couverture` | Media (image, array format) | Upload via AddOeuvre/MoOeuvre |
| `createdAt` | DateTime | Strapi auto |
| `updatedAt` | DateTime | Strapi auto |
| `publishedAt` | DateTime | Strapi auto |

### 2.2 Relations observed

| Relation | Type | Evidence |
|----------|------|----------|
| `users` | Many-to-Many (oeuvre ↔ user) | `populate=users`, `filters[users][id][$eq]=...` |
| `tags` | Many-to-Many (oeuvre ↔ tag) | TagModal.js, `populate=tags` |
| `genres` | Many-to-Many (oeuvre ↔ genre) | GenreModal.js, `populate=genres` |
| `chapitres` | One-to-Many (oeuvre → chapitre) | `filters[oeuvres][documentId][$eq]=...`, `populate=chapitres` |

### 2.3 Related Strapi content types (inferred from proxy allowlist & API calls)

- `oeuvres` — main work entity (`api::oeuvre.oeuvre`)
- `chapitres` — chapters
- `genres` — genre categories (has `nom` field)
- `tags` — tag labels (has `nom` field)
- `users` — Strapi users (with `redacteur` boolean, `username`)
- `teams` — translation teams
- `team-invitations`, `team-tasks`, `team-annonces` — team features
- `suivis` — tracking/analytics events (vue, like, abonne)

---

## 3. Grep Results: No Existing Recommendation Logic

### 3.1 `recommand` search
- **0 matches in application code** (src/**/*.js)
- All matches were inside `data.json` (novel text content — irrelevant)

### 3.2 `similaire|similar` search
- **0 matches in application code**
- All matches were in `data.json` (novel text content)

### 3.3 `suggestion` search
- **0 matches in application code**
- All matches were in `data.json` (novel text content)

### 3.4 `oeuvresRecommandees|oeuvres_recommandees` search
- **0 matches** anywhere

**Conclusion:** The feature does not exist in any form whatsoever.

---

## 4. FicheOeuvre.js — Current Structure Analysis

**File:** `src/app/componants/FicheOeuvre.js` (874 lines)  
**Purpose:** Full-screen modal displaying a work's detail page to readers.

### 4.1 Component structure (top to bottom)

```
┌─────────────────────────────────────────────┐
│  Background cover image + gradient overlays  │
├─────────────────────────────────────────────┤
│  Header actions (Share, Favorite, Subscribe, Close) │
├─────────────────────────────────────────────┤
│  Cover image + Main info section             │
│  ├── Cover thumbnail (w/ état badge)         │
│  ├── Type & Categorie badges                 │
│  ├── Title + Alt title                       │
│  ├── Author, Translator, Year               │
│  ├── Stats (chapters, tomes, reading time)   │
│  └── Action buttons (Commencer, Dernier ch.) │
├─────────────────────────────────────────────┤
│  Tags & Genres pills                         │
├─────────────────────────────────────────────┤
│  Tab navigation                              │
│  ├── Synopsis (default)                      │
│  ├── Chapitres (with search, filters, sort)  │
│  ├── Informations (InfoCards grid + stats)    │
│  └── Annonces (TeamAnnonces component)       │
├─────────────────────────────────────────────┤
│  [END — NO recommended works section]        │
└─────────────────────────────────────────────┘
```

### 4.2 API calls made by FicheOeuvre

1. **Metadata fetch** (line 113-124):
   ```
   GET /api/proxy/oeuvres/{documentId}?populate=tags&populate=genres&populate=users
   ```
   
2. **Chapters fetch** (progressive batching, line 128-153):
   ```
   GET /api/proxy/chapitres?filters[oeuvres][documentId][$eq]={id}&fields[0]=titre&fields[1]=order&fields[2]=tome&fields[3]=pdf&fields[4]=publishedAt&fields[5]=documentId&sort=order:asc&pagination[page]={n}&pagination[pageSize]=100
   ```

3. **Tracking** (line 89-101):
   ```
   POST /api/tracking (type: "vue" | "like" | "abonne")
   ```

### 4.3 Key observations for the new feature

- The **Informations tab** or a **new dedicated tab** would be the natural location for displaying recommended works
- Alternatively, a **section below the tabs** could house recommendations (always visible)
- The component already handles `oeuvre.documentId` which would be needed for fetching related works
- The metadata fetch could be extended with `&populate=oeuvresRecommandees.couverture` to fetch recommendations in a single call

---

## 5. MoOeuvre.js — Editor Management (Modification Form)

**File:** `src/app/componants/MoOeuvre.js` (258 lines)  
**Purpose:** Modal form for editors to modify an existing work's metadata.

### 5.1 Currently editable fields

| Field | Input type |
|-------|-----------|
| `titre` | text input |
| `titrealt` | text input |
| `auteur` | text input |
| `annee` | number input |
| `type` | text input |
| `categorie` | text input |
| `synopsis` | RichEditor (TinyMCE) |
| `etat` | select dropdown |
| `couverture` | file input |

### 5.2 What MoOeuvre does NOT handle (but exists via other modals)

- **Tags** → managed via `TagModal.js` (separate toggle modal)
- **Genres** → managed via `GenreModal.js` (separate toggle modal)

### 5.3 Integration point for recommendations

The tag/genre toggle modal pattern (`TagModal.js`, `GenreModal.js`) would be the **ideal pattern to replicate** for recommendations:
- Search/filter available oeuvres
- Toggle (add/remove) from a list
- Save via PUT to `/api/proxy/oeuvres/{documentId}` with the updated relation array

---

## 6. PanelOeuvre.js / PanelView.js — Editor Chapter Management

**File:** `src/app/componants/PanelOeuvre.js` (247 lines) + `PanelView.js` (815 lines)  
**Purpose:** Editor's chapter management panel — listing, reordering, adding, deleting, inline editing chapters.

### 6.1 Relationship to recommendations

- PanelOeuvre is the main editor view when an oeuvre is selected in the Editions page
- It delegates rendering to **PanelView** which shows the chapter list with management controls
- A "Recommandations" management button could be added in **PanelView's header area** alongside existing actions (Ajouter chapitre, Import Word, Modifier l'oeuvre)

---

## 7. Editions.js — Editor Dashboard

**File:** `src/app/componants/Editions.js` (223 lines)  
**Purpose:** Main editor page showing all works owned by the logged-in user (requires `user.redacteur === true`)

### 7.1 Flow

```
Editions page
  ├── Grid of oeuvre cards (with delete button)
  ├── Click card → PanelOeuvre (chapter management)
  ├── "+ Ajouter une oeuvre" → AddOeuvreForm modal
  └── (from PanelView) "Modifier" button → MoOeuvre modal
```

### 7.2 Observation

The recommendation management could be triggered from multiple places:
1. Inside PanelView (alongside the "Modifier" button)
2. Inside MoOeuvre (as a new section)
3. As a new dedicated button/modal (similar to TagModal/GenreModal)

---

## 8. AddOeuvreForm.js — Work Creation

**File:** `src/app/componants/AddOeuvreForm.js` (276 lines)  
**Purpose:** Modal form for creating a new work

### 8.1 Fields sent on creation

```javascript
payload = {
  data: {
    titre, titrealt, auteur, annee, type, categorie, etat,
    synopsis: [{ type: "paragraph", children: [{ type: "text", text: "..." }] }],
    users: [userId],  // assigns current user as owner
  }
}
```

Recommendations would likely be managed **after creation**, not during it (same as tags/genres which are also managed separately after the oeuvre exists).

---

## 9. Page Routing & Display Context

### 9.1 Oeuvre display pages

| Route | File | How FicheOeuvre is displayed |
|-------|------|-----------------------------|
| `/` (home) | `page.js` | FicheOeuvre opens as modal on click |
| `/oeuvres` | `oeuvres/page.js` | FicheOeuvre opens as modal on click |
| `/oeuvre/[slug]` | `oeuvre/[slug]/layout.js` | SEO metadata only; no page.js — uses chapitre subpage |
| `/oeuvre/[slug]/chapitre/[order]` | Chapter reader | Separate reader component |

### 9.2 SEO metadata fetch (layout.js)

```
GET {API_URL}/api/oeuvres?filters[documentId][$eq]={slug}&fields[0]=titre&fields[1]=synopsis&populate[couverture][fields][0]=url
```

If recommendations are added, the SEO metadata could optionally include structured data about related works.

---

## 10. Proxy API Architecture

**File:** `src/app/api/proxy/[...path]/route.js` (290 lines)

- Acts as a transparent proxy to the Strapi backend at `https://my-strapi-project-yysn.onrender.com`
- **Allowlisted routes:** oeuvres, chapitres, genres, tags, users, auth, upload, teams, team-*, suivis
- Supports GET, POST, PUT, DELETE methods
- Rate limiting: 120 req/min per IP
- No route changes needed for recommendations (uses existing `oeuvres` route)

---

## 11. Technical Implementation Plan (Recommendations)

### 11.1 Strapi Backend Changes Required

Add a **self-referencing Many-to-Many relation** on the `oeuvre` content type:

```
Field name: oeuvresRecommandees
Type: Relation (Many-to-Many)
Target: api::oeuvre.oeuvre
```

This allows an oeuvre to reference multiple other oeuvres as recommendations, and the relationship is directional (oeuvre A recommends B, but B doesn't automatically recommend A).

### 11.2 Frontend Changes Required

#### A. Editor side — New "RecommandationModal.js" component
- Pattern: Clone TagModal.js / GenreModal.js structure
- Search all oeuvres via `/api/proxy/oeuvres?populate=couverture`
- Toggle oeuvres on/off (with cover thumbnails for visual identification)
- Save via `PUT /api/proxy/oeuvres/{documentId}` with `{ data: { oeuvresRecommandees: [docId1, docId2, ...] } }`
- Trigger from PanelView.js (add a "Recommandations" button)

#### B. Reader side — New section in FicheOeuvre.js
- Extend metadata fetch: `populate=tags&populate=genres&populate=users&populate=oeuvresRecommandees.couverture`
- Add new state: `const [recommandations, setRecommandations] = useState([])`
- Display options:
  - **Option 1:** New tab "Recommandés" alongside Synopsis/Chapitres/Infos/Annonces
  - **Option 2:** Dedicated section below the tab content (always visible)
  - **Option 3:** Inside the "Informations" tab

#### C. No proxy changes needed
- The `oeuvres` route is already allowlisted, and Strapi's populate mechanism handles relations natively

### 11.3 Estimated scope

| Task | Complexity | Files touched |
|------|-----------|---------------|
| Strapi: add relation field | Low | Strapi admin only |
| RecommandationModal.js | Medium | New file (~150 lines) |
| PanelView.js: add trigger button | Low | 1 file, ~5 lines |
| FicheOeuvre.js: fetch + display | Medium | 1 file, ~60-80 lines |

---

## 12. Existing Patterns to Follow

### 12.1 TagModal.js / GenreModal.js pattern (relation toggle)

Both modals follow this exact flow:
1. Fetch the oeuvre with populated relation (`?populate=tags` / `?populate=genres`)
2. Fetch all available items (`GET /api/proxy/tags` / `GET /api/proxy/genres`)
3. Search/filter available items
4. Toggle (add/remove) items
5. Save via PUT with documentId array

For recommendations, the flow would be:
1. Fetch the oeuvre with `?populate=oeuvresRecommandees.couverture`
2. Fetch all oeuvres with `?populate=couverture` (exclude current oeuvre)
3. Search/filter by title
4. Toggle oeuvres on/off
5. Save via `PUT /api/proxy/oeuvres/{documentId}` with `{ data: { oeuvresRecommandees: [...docIds] } }`

### 12.2 FicheOeuvre display pattern

The "Tags et genres" section at line 437-449 shows how related entities are displayed as pills. Recommendations would use a similar pattern but with cover image cards instead of text pills.

---

## 13. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Fetching ALL oeuvres for the picker could be slow at scale | Medium | Add pagination + search filter to the modal; consider server-side filtering |
| N+1 queries if recommendations are deeply populated | Low | Strapi handles populate efficiently; limit to `couverture` only |
| Editors recommending deleted/unpublished works | Low | Strapi populate returns only published entries by default |
| Circular recommendations (A→B→A) | None | This is acceptable behavior (mutual recommendations are fine) |
| No limit on number of recommendations | Low | Enforce max (e.g., 6-10) in the frontend modal |

---

## 14. Files Inventory

### Files that will require modification:

| File | Change type |
|------|------------|
| `src/app/componants/FicheOeuvre.js` | Add recommendation display section |
| `src/app/componants/PanelView.js` | Add "Recommandations" management button |

### Files that will need to be created:

| File | Purpose |
|------|---------|
| `src/app/componants/RecommandationModal.js` | Editor modal for managing recommended works |

### Files that need NO changes:

| File | Reason |
|------|--------|
| `src/app/api/proxy/[...path]/route.js` | `oeuvres` route already allowed |
| `src/app/componants/MoOeuvre.js` | Not the right place (too crowded already) |
| `src/app/componants/AddOeuvreForm.js` | Recommendations set after creation |
| `src/app/componants/Editions.js` | No direct impact |
| `src/app/oeuvres/page.js` | No impact (FicheOeuvre handles display) |
| `src/app/page.js` | No impact |

---

*End of audit report*
