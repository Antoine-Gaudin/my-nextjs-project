# Exhaustive Audit Report — Trad-Index Next.js Project

**Date**: February 15, 2026  
**Auditor**: GitHub Copilot  
**Scope**: Full codebase — `src/app/`, `src/app/api/`, `src/app/componants/`, root configs

---

## 1. SECURITY

### S-01 — JWT stored in non-httpOnly cookie (client-accessible)
- **File**: [src/app/connexion/page.js](src/app/connexion/page.js#L83-L88)
- **Issue**: `Cookies.set("jwt", jwt, { expires: 7, sameSite: "strict", secure: ... })` — The JWT is set from client-side JavaScript without the `httpOnly` flag. Any XSS vulnerability allows stealing the token via `document.cookie`.
- **Impact**: Full account takeover if an XSS is exploited anywhere on the site.
- **Suggested fix**: Set the JWT as an `httpOnly` cookie from a server-side API route (e.g., `/api/auth/login`). The client should never handle the raw JWT.
- **Priority**: **CRITICAL**

### S-02 — Full user profile stored in non-httpOnly cookie
- **File**: [src/app/connexion/page.js](src/app/connexion/page.js#L88), [src/app/componants/NavBar.js](src/app/componants/NavBar.js#L39)
- **Issue**: `Cookies.set("userInfo", JSON.stringify(user), { expires: 7, sameSite: "strict" })` stores the complete user object (email, role, id) in a tamperable, readable cookie. In NavBar.js, the `secure` flag is even missing.
- **Impact**: User data leakage, potential privilege escalation if the client reads role from this cookie to make authorization decisions.
- **Suggested fix**: Remove the `userInfo` cookie. Fetch user info from a server-side session or API call on demand. If caching is needed, use a server-set httpOnly cookie.
- **Priority**: **HIGH**

### S-03 — Fallback to `NEXT_PUBLIC_INDEX_API_TOKEN` exposes API token client-side
- **File**: [src/app/api/novel-index/route.js](src/app/api/novel-index/route.js#L4)
- **Issue**: `const INDEX_API_TOKEN = process.env.INDEX_API_TOKEN || process.env.NEXT_PUBLIC_INDEX_API_TOKEN;` — The fallback to `NEXT_PUBLIC_` means if the non-public variable is not set, the token is bundled into the client-side JS bundle.
- **Impact**: Full read/write access to the novel-index Strapi instance for anyone who inspects the bundle.
- **Suggested fix**: Remove the `NEXT_PUBLIC_INDEX_API_TOKEN` fallback entirely. Only use `process.env.INDEX_API_TOKEN` (server-side only).
- **Priority**: **CRITICAL**

### S-04 — No Next.js middleware for route protection
- **File**: No `middleware.js` or `middleware.ts` exists at root or `src/`
- **Issue**: Protected routes (`/profil`, `/chapitreadmin/`, `/mochapitre/`) rely solely on client-side JWT checks (`Cookies.get("jwt")`). A user can view the page source/initial render before the redirect fires.
- **Impact**: Brief exposure of protected page structures; race condition between render and redirect.
- **Suggested fix**: Create a `middleware.js` at the root that checks for the JWT cookie and redirects to `/connexion` for protected paths.
- **Priority**: **HIGH**

### S-05 — Proxy route `auth/change-password` not in allowlist
- **File**: [src/app/api/proxy/[...path]/route.js](src/app/api/proxy/%5B...path%5D/route.js#L6-L21), [src/app/componants/Parametres.js](src/app/componants/Parametres.js#L114)
- **Issue**: `Parametres.js` calls `/api/proxy/auth/change-password`, but the proxy allowlist only includes `auth/local` and `auth/local/register`. The `isRouteAllowed` function will match `auth/local` as a prefix of `auth/local/register` but `auth/change-password` starts with `auth/` — which is not in the list. This request will be blocked with a 403.
- **Impact**: Password change functionality is broken.
- **Suggested fix**: Add `"auth/change-password"` to the `ALLOWED_ROUTES` array.
- **Priority**: **CRITICAL**

### S-06 — In-memory rate limiting resets on every serverless cold start
- **File**: [src/app/api/proxy/[...path]/route.js](src/app/api/proxy/%5B...path%5D/route.js#L35-L58), [src/app/api/tracking/route.js](src/app/api/tracking/route.js#L8-L22), [src/app/api/novel-index/route.js](src/app/api/novel-index/route.js#L8-L21)
- **Issue**: All three API routes use `new Map()` for rate limiting. In serverless environments (Vercel), each invocation may spin up a new instance, making the rate limit ineffective.
- **Impact**: Rate limiting provides zero protection in production; attackers can bypass it easily.
- **Suggested fix**: Use a distributed rate limiter (e.g., Upstash Redis with `@upstash/ratelimit`, or Vercel KV).
- **Priority**: **HIGH**

### S-07 — `setInterval` in API routes (serverless incompatibility)
- **File**: [src/app/api/proxy/[...path]/route.js](src/app/api/proxy/%5B...path%5D/route.js#L54-L58), [src/app/api/tracking/route.js](src/app/api/tracking/route.js#L25-L29)
- **Issue**: `setInterval` is used for periodic cleanup of rate limit maps. In serverless, there's no persistent process — this code runs once on cold start and the timer may never fire again.
- **Impact**: Memory leak potential in long-running environments; waste of resources in serverless.
- **Suggested fix**: Remove `setInterval`. Clean up stale entries inline during each request check instead.
- **Priority**: **MEDIUM**

### S-08 — Proxy forwards arbitrary Strapi filter queries without validation
- **File**: [src/app/api/proxy/[...path]/route.js](src/app/api/proxy/%5B...path%5D/route.js#L88-L90)
- **Issue**: Query strings from the client are forwarded to Strapi verbatim: `const queryString = searchParams.toString(); const url = ${API_URL}/api/${pathStr}?${queryString}`. Attackers can craft filter queries to extract data from related models (e.g., `filters[users][email][$eq]=...`).
- **Impact**: Information disclosure through Strapi's powerful filtering API.
- **Suggested fix**: Whitelist allowed query parameter keys/patterns per route. Strip unknown parameters before forwarding.
- **Priority**: **HIGH**

### S-09 — User can update any user's profile (`users/:id` PUT without ownership check)
- **File**: [src/app/componants/Parametres.js](src/app/componants/Parametres.js#L40-L48)
- **Issue**: The proxy allows `PUT /api/proxy/users/{id}`. There is no server-side check that the authenticated user owns the target user ID. If Strapi doesn't enforce this, any authenticated user could modify another user's profile.
- **Impact**: Privilege escalation — a normal user could set `redacteur: true` on any account.
- **Suggested fix**: Add ownership validation in the proxy or a dedicated server-side endpoint. Verify `req.user.id === params.id` before forwarding PUT requests to `/users/`.
- **Priority**: **CRITICAL**

### S-10 — `dangerouslySetInnerHTML` used in layout (JSON-LD)
- **File**: [src/app/layout.js](src/app/layout.js#L76-L92)
- **Issue**: `dangerouslySetInnerHTML={{ __html: JSON.stringify({...}) }}` is used for structured data. While this specific usage with hardcoded data is safe, it establishes a pattern that can be dangerous if dynamic user data is ever injected.
- **Impact**: Low risk currently (static data), but a maintenance hazard.
- **Suggested fix**: Use Next.js `<Script type="application/ld+json">` component or the built-in metadata API's `jsonLd` property.
- **Priority**: **LOW**

---

## 2. SEO

### SEO-01 — Homepage is `"use client"` — no server-side rendered metadata per page
- **File**: [src/app/page.js](src/app/page.js#L1)
- **Issue**: The homepage is a client component. While `layout.js` provides default metadata, the page itself cannot export `metadata` or `generateMetadata`. This means no page-specific metadata customization.
- **Impact**: The homepage always uses the layout's default metadata. No per-page title override for the home route.
- **Suggested fix**: Extract the data-fetching to a server component wrapper that exports metadata, and render the client interactive parts as a child.
- **Priority**: **MEDIUM**

### SEO-02 — `/oeuvres` page has no metadata export
- **File**: [src/app/oeuvres/page.js](src/app/oeuvres/page.js#L1)
- **Issue**: `"use client"` at the top — no `generateMetadata` or `metadata` export. The page title remains the default "Trad-Index — Plateforme d'indexation de traductions".
- **Impact**: Poor SEO for the catalogue listing page, which is likely one of the highest-traffic pages.
- **Suggested fix**: Add a layout.js in `/oeuvres/` that exports static metadata with title "Catalogue" and relevant description.
- **Priority**: **HIGH**

### SEO-03 — `/connexion` page has no metadata
- **File**: [src/app/connexion/page.js](src/app/connexion/page.js#L1)
- **Issue**: Client component, no metadata export. Title defaults to layout template.
- **Impact**: Minor — auth pages aren't prioritized for SEO, but a proper title improves UX.
- **Suggested fix**: Add `metadata` export in [src/app/connexion/layout.js](src/app/connexion/layout.js).
- **Priority**: **LOW**

### SEO-04 — `/traducteur/[username]` page has no dynamic metadata or layout
- **File**: [src/app/traducteur/[username]/page.js](src/app/traducteur/%5Busername%5D/page.js#L1)
- **Issue**: No `generateMetadata` for translator profile pages. Missing Open Graph tags specific to individual translators.
- **Impact**: When translator profiles are shared on social media, they show generic site metadata instead of the translator's name.
- **Suggested fix**: Create a `layout.js` with `generateMetadata` fetching the username from params.
- **Priority**: **MEDIUM**

### SEO-05 — Heading hierarchy violation — multiple `<h2>` without consistent `<h1>` on subpages
- **File**: [src/app/oeuvres/page.js](src/app/oeuvres/page.js) (implicit), [src/app/componants/FicheOeuvre.js](src/app/componants/FicheOeuvre.js)
- **Issue**: Subpages/components use `<h2>` and `<h3>` but many pages don't have a clear single `<h1>`. The homepage correctly uses `<h1>` for "Trad-Index" but inner pages often skip it.
- **Impact**: Search engines have difficulty determining the primary topic of the page.
- **Suggested fix**: Ensure each page/route has exactly one `<h1>` reflecting the page's primary content.
- **Priority**: **MEDIUM**

### SEO-06 — Sitemap fetches up to all oeuvres with no pagination limit guard
- **File**: [src/app/sitemap.js](src/app/sitemap.js#L50-L62)
- **Issue**: The while loop `while (hasMore)` fetches all pages. If the dataset grows very large, sitemap generation could time out on serverless (Vercel's 10-second API limit).
- **Impact**: Sitemap generation could fail silently, breaking SEO indexing.
- **Suggested fix**: Add a maximum iteration guard, or split into multiple sitemaps using sitemap index.
- **Priority**: **MEDIUM**

---

## 3. PERFORMANCE

### P-01 — Homepage fetches stats with 3 separate API calls on every load
- **File**: [src/app/page.js](src/app/page.js#L48-L62)
- **Issue**: `Promise.all` with 3 fetch calls to count oeuvres, chapitres, and traducteurs — each just to get `pagination.total`. This runs on every visit, no caching.
- **Impact**: Unnecessary load on Strapi; delays homepage rendering.
- **Suggested fix**: Create a dedicated `/api/stats` endpoint that caches aggregated counts with ISR or stale-while-revalidate.
- **Priority**: **MEDIUM**

### P-02 — `Profil.js` makes N+1 fetch calls to count chapters
- **File**: [src/app/componants/Profil.js](src/app/componants/Profil.js#L19-L27)
- **Issue**: For each oeuvre, a separate fetch is made to count chapters: `oeuvresList.map((oeuvre) => fetch(...))`. If a user has 50 oeuvres, this makes 50 parallel HTTP requests.
- **Impact**: Massive request amplification; slow profile loading for prolific translators.
- **Suggested fix**: Use `populate[chapitres][count]=true` in the initial oeuvres query, or aggregate on the server side.
- **Priority**: **HIGH**

### P-03 — `PanelOeuvre.js` sequential PUT calls for reordering chapters
- **File**: [src/app/componants/PanelOeuvre.js](src/app/componants/PanelOeuvre.js#L83-L105)
- **Issue**: `updateOrderInDB` loops through all chapters sequentially with individual PUT requests. For a 100-chapter oeuvre, this fires 100 sequential HTTP calls.
- **Impact**: Extremely slow reordering; risk of partial failure mid-operation.
- **Suggested fix**: Create a batch update endpoint (`PUT /api/proxy/chapitres/batch-order`) that accepts all order changes in one request.
- **Priority**: **HIGH**

### P-04 — `oeuvres` page loads all oeuvres at once (`pageSize=100`, no pagination)
- **File**: [src/app/oeuvres/page.js](src/app/oeuvres/page.js#L54)
- **Issue**: `pagination[pageSize]=100` loads all oeuvres in a single request. As the catalog grows beyond 100, data is truncated. No infinite scroll or pagination to backend.
- **Impact**: Missing data beyond page 1; large initial payload.
- **Suggested fix**: Implement cursor-based or page-based pagination with infinite scroll.
- **Priority**: **HIGH**

### P-05 — `TeamGraphiques.js` (1181 lines) and `TeamKanban.js` (1136 lines) are not code-split
- **File**: [src/app/componants/TeamGraphiques.js](src/app/componants/TeamGraphiques.js), [src/app/componants/TeamKanban.js](src/app/componants/TeamKanban.js)
- **Issue**: These massive components are imported directly in `TeamView.js` without `dynamic()`. They contain complex chart/kanban logic.
- **Impact**: All 2300+ lines of JavaScript are in the profil page bundle even if the user never visits these tabs.
- **Suggested fix**: Use `dynamic(() => import('./TeamGraphiques'), { ssr: false })` for lazy loading on tab activation.
- **Priority**: **MEDIUM**

### P-06 — TinyMCE is bundled locally (~1MB+ of static assets)
- **File**: [public/tinymce/](public/tinymce/), [src/app/componants/RichEditor.js](src/app/componants/RichEditor.js#L27)
- **Issue**: The entire TinyMCE distribution (js, plugins, skins, themes) is served from `/public/tinymce/`. The minified JS alone (`tinymce.min.js`) is several hundred KB plus all plugins.
- **Impact**: Huge static asset weight. Every deploy uploads all these files.
- **Suggested fix**: Consider using TinyMCE from CDN with the `tinymce-react` cloud mode, or ensure the self-hosted version is loaded only when needed (already dynamically imported via `RichEditor`).
- **Priority**: **LOW**

### P-07 — `dompurify` listed as dependency but never imported
- **File**: [package.json](package.json#L20)
- **Issue**: `"dompurify": "^3.3.1"` is in dependencies but a codebase search shows no `import DOMPurify` or `require('dompurify')` anywhere in the source code.
- **Impact**: Unnecessary bundle size increase; misleading dependency list.
- **Suggested fix**: Either remove from `package.json` or actually use it to sanitize HTML content (see S-10).
- **Priority**: **LOW**

### P-08 — `nextjs-google-analytics` unused or not configured
- **File**: [package.json](package.json#L22)
- **Issue**: `"nextjs-google-analytics": "^2.3.7"` is listed but no Google Analytics ID or component usage was found in the codebase.
- **Impact**: Dead dependency adding to bundle size.
- **Suggested fix**: Remove if unused, or configure with `GA_MEASUREMENT_ID` env var and add the provider.
- **Priority**: **LOW**

---

## 4. ACCESSIBILITY (a11y)

### A-01 — No focus trap or `aria-modal` on most modal overlays
- **Files**: [src/app/componants/AddOeuvreForm.js](src/app/componants/AddOeuvreForm.js#L176), [src/app/componants/MoOeuvre.js](src/app/componants/MoOeuvre.js#L160), [src/app/componants/FicheOeuvre.js](src/app/componants/FicheOeuvre.js), [src/app/componants/TeamInvite.js](src/app/componants/TeamInvite.js), [src/app/componants/ImportWord.js](src/app/componants/ImportWord.js), [src/app/page.js](src/app/page.js#L397) (search overlay)
- **Issue**: Modals are rendered as plain `<div>` with `fixed inset-0` but without `role="dialog"`, `aria-modal="true"`, or focus trapping. Keyboard users can tab behind the modal. `ConfirmDialog.js` is the only component that implements these correctly.
- **Impact**: Screen reader users cannot identify the dialog; keyboard users can interact with hidden content.
- **Suggested fix**: Add `role="dialog"`, `aria-modal="true"`, and implement focus trapping (follow the pattern from `ConfirmDialog.js`).
- **Priority**: **HIGH**

### A-02 — Form labels missing `htmlFor` attribute (30+ instances)
- **Files**: [src/app/componants/AddOeuvreForm.js](src/app/componants/AddOeuvreForm.js#L197-L250), [src/app/componants/MoOeuvre.js](src/app/componants/MoOeuvre.js#L178-L225), [src/app/componants/TéléchargerChapitre.js](src/app/componants/TéléchargerChapitre.js#L120-L152), [src/app/componants/AjouterChapitre.js](src/app/componants/AjouterChapitre.js#L410-L422), [src/app/componants/PanelView.js](src/app/componants/PanelView.js#L251-L283), [src/app/componants/TeamKanban.js](src/app/componants/TeamKanban.js#L1049-L1122)
- **Issue**: `<label>` elements have no `htmlFor` (or wrapping `<label>`) connecting them to their input. Only `connexion/page.js` uses `htmlFor` correctly.
- **Impact**: Screen readers don't associate labels with inputs; clicking a label doesn't focus the corresponding input.
- **Suggested fix**: Add `id` to each `<input>` and matching `htmlFor` to each `<label>`.
- **Priority**: **HIGH**

### A-03 — Logo/brand uses `onClick` on `<div>` — not keyboard-accessible
- **File**: [src/app/componants/NavBar.js](src/app/componants/NavBar.js#L80-L85)
- **Issue**: The brand logo uses `<div onClick={() => router.push("/")} className="cursor-pointer">` — not focusable via keyboard, no `role="link"`, no `tabIndex`.
- **Impact**: Keyboard-only users cannot navigate to the homepage via the logo.
- **Suggested fix**: Replace with `<Link href="/">` (already imported but unused here).
- **Priority**: **MEDIUM**

### A-04 — Search overlay escape key only fires `handleKeyPress` — search input also needs `onKeyDown`
- **File**: [src/app/page.js](src/app/page.js#L103-L109)
- **Issue**: `handleKeyPress` only listens for Escape in the search input's `onKeyDown`. But the overlay itself has no global keydown listener, so pressing Escape while focus is outside the input doesn't close the overlay.
- **Impact**: Keyboard users can get trapped in the search overlay.
- **Suggested fix**: Add a `useEffect` with `document.addEventListener("keydown")` for Escape when `isSearchOpen` is true.
- **Priority**: **MEDIUM**

### A-05 — Color contrast issues — gray-400 text on gray-900/950 backgrounds
- **Files**: Throughout — [src/app/layout.js](src/app/layout.js#L117) (`text-gray-400`), [src/app/page.js](src/app/page.js#L153) (`text-gray-400 mb-10`), [src/app/componants/NavBar.js](src/app/componants/NavBar.js#L95), etc.
- **Issue**: `text-gray-400` (#9ca3af) on `bg-gray-900` (#111827) yields a contrast ratio of ~4.2:1 — just below WCAG AA requirement of 4.5:1 for normal text.
- **Impact**: Users with low vision may struggle to read secondary text.
- **Suggested fix**: Use `text-gray-300` (#d1d5db) instead, which provides ~7:1 contrast on gray-900.
- **Priority**: **MEDIUM**

---

## 5. UX / UI IMPROVEMENTS

### UX-01 — `alert()` used for all feedback in `TéléchargerChapitre.js` (8 instances)
- **File**: [src/app/componants/TéléchargerChapitre.js](src/app/componants/TéléchargerChapitre.js#L20-L108)
- **Issue**: Every error and success case uses `alert()` — native browser dialogs that are ugly, non-dismissable, and break the user flow.
- **Impact**: Poor UX; inconsistent with the Toast system already available in the project.
- **Suggested fix**: Replace all `alert()` calls with `useToast()` from the existing Toast component.
- **Priority**: **HIGH**

### UX-02 — `window.confirm()` used for destructive actions (10+ instances)
- **Files**: [src/app/componants/TeamView.js](src/app/componants/TeamView.js#L94), [src/app/componants/TeamOeuvres.js](src/app/componants/TeamOeuvres.js#L93), [src/app/componants/PanelOeuvre.js](src/app/componants/PanelOeuvre.js#L141), [src/app/componants/Editions.js](src/app/componants/Editions.js#L110), [src/app/componants/TeamKanban.js](src/app/componants/TeamKanban.js#L292), [src/app/componants/TeamAnnonces.js](src/app/componants/TeamAnnonces.js#L142), [src/app/chapitreadmin/[documentid]/page.js](src/app/chapitreadmin/%5Bdocumentid%5D/page.js#L131)
- **Issue**: `window.confirm()` is used for every delete/remove action. A `ConfirmDialog` component already exists but is not used in these locations.
- **Impact**: Unstyled, jarring UX; some browsers/extensions block `confirm()`.
- **Suggested fix**: Replace all `window.confirm()` calls with the existing `<ConfirmDialog>` component.
- **Priority**: **MEDIUM**

### UX-03 — No empty state for oeuvres catalog
- **File**: [src/app/oeuvres/page.js](src/app/oeuvres/page.js)
- **Issue**: When `filteredOeuvres` is empty (no search results or no data), no empty state message is shown.
- **Impact**: Users see a blank grid with no feedback.
- **Suggested fix**: Add an empty state illustration/message when `filteredOeuvres.length === 0`.
- **Priority**: **LOW**

### UX-04 — Error handling redirects to `/connexion` instead of showing an error
- **File**: [src/app/componants/Editions.js](src/app/componants/Editions.js#L41), [src/app/chapitreadmin/[documentid]/page.js](src/app/chapitreadmin/%5Bdocumentid%5D/page.js#L60)
- **Issue**: When a fetch error occurs, the user is redirected to the login page (`router.push("/connexion")`), even if the error isn't auth-related (e.g., network failure).
- **Impact**: Confusing UX — users lose their context and think they need to log in again.
- **Suggested fix**: Only redirect on 401/403 responses. Show an error message for other errors.
- **Priority**: **MEDIUM**

### UX-05 — `chapitreadmin` page has unused `apiUrl` variable
- **File**: [src/app/chapitreadmin/[documentid]/page.js](src/app/chapitreadmin/%5Bdocumentid%5D/page.js#L21)
- **Issue**: `const apiUrl = process.env.NEXT_PUBLIC_API_URL;` is defined but only used in `handleRedirectToChapter` as a fallback for non-http PDF URLs. In a `"use client"` component, `process.env.NEXT_PUBLIC_API_URL` may be undefined if not set at build time.
- **Impact**: PDF links could be broken if the env var isn't set at build time.
- **Suggested fix**: Remove the fallback or ensure all PDF URLs are absolute (they come from Cloudinary which provides absolute URLs).
- **Priority**: **LOW**

---

## 6. CODE QUALITY

### CQ-01 — 80+ `console.error` statements left in production code
- **Files**: Across 25+ files (see grep results)
- **Issue**: `console.error()` is used pervasively for error handling. These log to the browser console in production.
- **Impact**: Leaks internal error details to end users; clutters browser console; potential sensitive information exposure.
- **Suggested fix**: Use a proper logging service (e.g., Sentry, LogRocket) for production. Strip `console.*` in production builds via ESLint rule `no-console`.
- **Priority**: **MEDIUM**

### CQ-02 — Mixed French/English in code
- **Files**: Across all components
- **Issue**: Variable names, comments, and function names mix French and English inconsistently. Examples: `oeuvres` (French), `fetchData` (English), `handleRedirectToChapter` (English), `Erreur recuperation utilisateur` (French error message), `submitting` (English), `setMessage` with French strings.
- **Impact**: Reduces code readability for international contributors. Makes codebase harder to maintain.
- **Suggested fix**: Standardize on English for all code identifiers and comments. Keep French only for user-facing strings (which should be externalized to i18n).
- **Priority**: **LOW**

### CQ-03 — Typo in folder name: `componants` instead of `components`
- **File**: [src/app/componants/](src/app/componants/)
- **Issue**: The components folder is misspelled in French/English. The correct English spelling is `components`; correct French is `composants`.
- **Impact**: Confusing for new developers; breaks convention expectations.
- **Suggested fix**: Rename to `components` (standard Next.js convention).
- **Priority**: **LOW**

### CQ-04 — Duplicated `classifyLine` function across 3 files
- **Files**: [src/app/componants/ChapitreReader.js](src/app/componants/ChapitreReader.js#L9-L51), [src/app/componants/AjouterChapitre.js](src/app/componants/AjouterChapitre.js#L14-L42)
- **Issue**: The `classifyLine()` function is copy-pasted into at least 2 component files with identical logic.
- **Impact**: Maintenance burden — a bug fix must be applied in multiple places.
- **Suggested fix**: Extract to a shared utility file (e.g., `utils/classifyLine.js`) and import where needed.
- **Priority**: **LOW**

### CQ-05 — `Toast.js` misuses `useCallback` to wrap a plain object
- **File**: [src/app/componants/Toast.js](src/app/componants/Toast.js#L28-L35)
- **Issue**: `const toast = useCallback({ success: ..., error: ..., info: ..., warning: ... }, [addToast])` — `useCallback` expects a function, not an object. This is a React misuse. The comment on line 35 even notes the bug: "Fix: useCallback can't wrap an object". The workaround on line 41 duplicates the object inline.
- **Impact**: The `toast` variable is recreated every render; the `useCallback` wrapping does nothing.
- **Suggested fix**: Use `useMemo` instead of `useCallback` to memoize the object, or remove the erroneous `useCallback` call.
- **Priority**: **MEDIUM**

### CQ-06 — No `.env.example` file
- **File**: Project root — no `.env.example` exists
- **Issue**: Required environment variables (`NEXT_PUBLIC_API_URL`, `INDEX_API_TOKEN`) are only discoverable by reading the source code. No documentation of expected env vars.
- **Impact**: Difficult onboarding for new developers; risk of missing configuration in deployment.
- **Suggested fix**: Create a `.env.example` listing all required/optional env vars with placeholder values.
- **Priority**: **MEDIUM**

### CQ-07 — Hardcoded Strapi API URL as fallback in 7+ files
- **Files**: [src/app/api/proxy/[...path]/route.js](src/app/api/proxy/%5B...path%5D/route.js#L3), [src/app/api/tracking/route.js](src/app/api/tracking/route.js#L4), [src/app/sitemap.js](src/app/sitemap.js#L1-L2), [src/app/oeuvre/[slug]/layout.js](src/app/oeuvre/%5Bslug%5D/layout.js#L1-L3), [src/app/oeuvre/[slug]/chapitre/[order]/layout.js](src/app/oeuvre/%5Bslug%5D/chapitre/%5Border%5D/layout.js#L1-L3), [src/app/chapitre/[documentid]/page.js](src/app/chapitre/%5Bdocumentid%5D/page.js#L3-L5), [src/app/team/[slug]/layout.js](src/app/team/%5Bslug%5D/layout.js#L1-L3)
- **Issue**: `"https://my-strapi-project-yysn.onrender.com"` is hardcoded as a fallback in 7+ files.
- **Impact**: If the backend URL changes, all files must be updated. Risk of leaking internal infrastructure URLs.
- **Suggested fix**: Extract to a single shared constant file (e.g., `src/app/utils/config.js`). Only fall back in one place.
- **Priority**: **MEDIUM**

### CQ-08 — `URL.createObjectURL` called without cleanup
- **Files**: [src/app/componants/AddOeuvreForm.js](src/app/componants/AddOeuvreForm.js#L61), [src/app/componants/MoOeuvre.js](src/app/componants/MoOeuvre.js#L68)
- **Issue**: `setCouverturePreview(URL.createObjectURL(file))` creates an object URL but `URL.revokeObjectURL()` is never called on cleanup.
- **Impact**: Minor memory leak — object URLs accumulate each time a file is selected.
- **Suggested fix**: Revoke the previous object URL before creating a new one, and in a cleanup `useEffect`.
- **Priority**: **LOW**

---

## 7. ARCHITECTURE

### AR-01 — 12 components exceed 300 lines; 5 exceed 700 lines
- **Files**: 
  - `TeamGraphiques.js`: 1181 lines
  - `TeamKanban.js`: 1136 lines  
  - `ChapitreReader.js`: 1019 lines
  - `FicheOeuvre.js`: 827 lines
  - `PanelView.js`: 780 lines
  - `ImportWord.js`: 738 lines
  - `AdminComparatif.js`: 665 lines
  - `TeamView.js`: 577 lines
  - `Parametres.js`: 549 lines
  - `AjouterChapitre.js`: 496 lines
  - `DashboardTraducteur.js`: 436 lines
  - `strapiBlocksUtils.js`: 421 lines
- **Issue**: These monolithic components contain mixed concerns (data fetching, business logic, UI rendering, sub-components defined inline).
- **Impact**: Hard to test, hard to maintain, causes unnecessary re-renders, makes code review difficult.
- **Suggested fix**: Split each into smaller, focused components. Extract custom hooks for data fetching (e.g., `useTeamData`, `useChapitres`). Move sub-components into separate files.
- **Priority**: **HIGH**

### AR-02 — No TypeScript — entire project is JavaScript
- **File**: [jsconfig.json](jsconfig.json), all `.js` files
- **Issue**: No type safety anywhere. All components, API routes, utilities are plain JavaScript.
- **Impact**: Runtime errors from type mismatches; harder refactoring; no IDE autocompletion for props.
- **Suggested fix**: Incrementally migrate to TypeScript. Start with API routes and utility functions, then components.
- **Priority**: **MEDIUM**

### AR-03 — `PanelView.js` receives 18 props (excessive prop drilling)
- **File**: [src/app/componants/PanelView.js](src/app/componants/PanelView.js#L12-L36)
- **Issue**: The component signature takes 18 named props including multiple state setters (`setIsReordering`, `setOpenMenuId`, `setOrderedChapitres`, `setDraggedIndex`), callback functions, and refs.
- **Impact**: Extremely difficult to understand, test, or refactor. Classic prop drilling anti-pattern.
- **Suggested fix**: Use React context, or merge related state into a custom hook (`useChapitreEditor`). Or use a composition pattern.
- **Priority**: **HIGH**

### AR-04 — No centralized API client / data fetching layer
- **Files**: Every component has inline `fetch()` or `axios` calls
- **Issue**: API calls are duplicated across 25+ components with inconsistent error handling. Some use `fetch`, some use `axios`. No shared interceptors, no centralized error handling.
- **Impact**: Inconsistent behavior; no single place to add auth headers, logging, or retry logic.
- **Suggested fix**: Create a shared API client (e.g., `src/app/utils/api.js`) with methods for each endpoint. Use `axios` or `fetch` consistently in one place.
- **Priority**: **HIGH**

### AR-05 — Test coverage is minimal (5 test files for 30+ components)
- **File**: [__tests__/](../__tests__/)
- **Issue**: Only 5 test files exist: `DashboardTraducteur.test.js`, `NavBar.test.js`, `NavProfil.test.js`, `TeamAnnonces.test.js`, `TeamHistorique.test.js`. No tests for API routes, no integration tests, no tests for critical flows (auth, chapter CRUD).
- **Impact**: No regression protection for critical business logic.
- **Suggested fix**: Prioritize tests for API routes (proxy, tracking, novel-index), auth flow, and chapter creation/deletion.
- **Priority**: **HIGH**

### AR-06 — `NavBar` used outside `<Providers>` in layout
- **File**: [src/app/layout.js](src/app/layout.js#L95-L101)
- **Issue**: `<NavBar />` is rendered before `<Providers>` which wraps `<ToastProvider>`. If `NavBar` ever needs to use `useToast()`, it will crash because it's outside the provider.
- **Impact**: Currently works, but limits the ability to show toasts from the navbar (e.g., "Logged out successfully").
- **Suggested fix**: Move `<NavBar />` inside the `<Providers>` wrapper.
- **Priority**: **LOW**

---

## 8. API / DATA

### API-01 — No error handling for non-OK fetch responses in many components
- **Files**: [src/app/componants/Teams.js](src/app/componants/Teams.js#L28-L40) (`ownerRes.json()` called without `res.ok` check), [src/app/componants/TeamView.js](src/app/componants/TeamView.js#L38-L55), [src/app/componants/TeamAnnonces.js](src/app/componants/TeamAnnonces.js#L40-L74), [src/app/componants/DashboardTraducteur.js](src/app/componants/DashboardTraducteur.js#L22-L37), [src/app/page.js](src/app/page.js#L37-L43)
- **Issue**: `const data = await res.json()` is called without first checking `res.ok`. If the API returns 4xx/5xx, `.json()` may throw or return unexpected error payloads.
- **Impact**: Unhandled runtime errors; broken state leading to blank pages or crashes.
- **Suggested fix**: Always check `if (!res.ok)` before parsing the response. Throw or handle gracefully.
- **Priority**: **HIGH**

### API-02 — Race condition in `TeamAnnonces.js` — `currentUser` dependency
- **File**: [src/app/componants/TeamAnnonces.js](src/app/componants/TeamAnnonces.js#L34-L83)
- **Issue**: `fetchData` depends on `currentUser` but `currentUser` is set asynchronously in a separate `useEffect`. The `useCallback` for `fetchData` lists `currentUser` in deps, and the `useEffect` that calls `fetchData` fires when `fetchData` changes — but on first render, `currentUser` is null, so ownership checks fail silently.
- **Impact**: The "post announcement" button may not appear on first load; requires a re-render after user data arrives.
- **Suggested fix**: Combine user fetching and data fetching into a single effect, or gate `fetchData` on `currentUser` being non-null.
- **Priority**: **MEDIUM**

### API-03 — Tracking API fetches up to 10,000 records per request
- **File**: [src/app/api/tracking/route.js](src/app/api/tracking/route.js#L153)
- **Issue**: `pagination[pageSize]=10000` in the GET endpoint fetches all tracking events at once.
- **Impact**: As the dataset grows, response times degrade; risk of timeouts and memory issues.
- **Suggested fix**: Aggregate on the server-side (Strapi custom route or a GROUP BY query) instead of fetching raw events.
- **Priority**: **MEDIUM**

### API-04 — No abort controller for in-flight requests on unmount
- **Files**: [src/app/page.js](src/app/page.js#L35-L67) (`fetchPopularOeuvres`/`fetchStats`), [src/app/componants/FicheOeuvre.js](src/app/componants/FicheOeuvre.js), [src/app/componants/TeamView.js](src/app/componants/TeamView.js), and 15+ other components
- **Issue**: `useEffect` blocks fetch data but don't use `AbortController` to cancel in-flight requests when the component unmounts.
- **Impact**: State updates on unmounted components; "Can't perform a React state update on an unmounted component" warnings; wasted network requests.
- **Suggested fix**: Create and pass an `AbortController.signal` to all fetch calls. Abort in the cleanup function.
- **Priority**: **MEDIUM**

### API-05 — `traducteur/[username]` page actually shows teams, not translator data
- **File**: [src/app/traducteur/[username]/page.js](src/app/traducteur/%5Busername%5D/page.js#L7-L21)
- **Issue**: The component is named `TeamsPage` and fetches all public teams — it doesn't use the `[username]` param at all. It ignores the translator-specific context entirely.
- **Impact**: Every translator URL shows the same list of all public teams. The sitemap generates unique URLs per translator that all show identical content (SEO duplicate content issue).
- **Suggested fix**: Fetch and display data specific to the translator identified by `[username]`. Filter teams by translator membership, show their oeuvres, etc.
- **Priority**: **HIGH**

### API-06 — Missing `revalidate` or `cache` strategy on several server-side fetches
- **Files**: [src/app/chapitre/[documentid]/page.js](src/app/chapitre/%5Bdocumentid%5D/page.js#L14) (`cache: "no-store"`), [src/app/mochapitre/[documentid]/page.js](src/app/mochapitre/%5Bdocumentid%5D/page.js#L13) (`cache: "no-store"`)
- **Issue**: Redirect and preview pages use `cache: "no-store"` for every request, even though the chapter-to-oeuvre mapping is rarely changed.
- **Impact**: Every request to these routes hits Strapi directly, adding latency and load.
- **Suggested fix**: Use `{ next: { revalidate: 3600 } }` since the mapping between chapters and oeuvres doesn't change frequently.
- **Priority**: **LOW**

---

## Summary

| Category       | CRITICAL | HIGH | MEDIUM | LOW |
|----------------|----------|------|--------|-----|
| Security       | 4        | 3    | 1      | 1   |
| SEO            | 0        | 1    | 3      | 1   |
| Performance    | 0        | 3    | 2      | 3   |
| Accessibility  | 0        | 2    | 3      | 0   |
| UX/UI          | 0        | 1    | 2      | 2   |
| Code Quality   | 0        | 0    | 4      | 4   |
| Architecture   | 0        | 4    | 1      | 1   |
| API/Data       | 0        | 2    | 3      | 1   |
| **Total**      | **4**    | **16**| **19**| **13**|

**Total findings: 52**

### Top 5 Priorities
1. **S-05** — `auth/change-password` not in proxy allowlist (password change is broken)
2. **S-01/S-02** — JWT & user data in non-httpOnly client cookies (full account takeover risk)
3. **S-03** — API token potentially exposed client-side via `NEXT_PUBLIC_` fallback
4. **S-09** — No ownership check on `PUT /users/:id` (privilege escalation)
5. **API-05** — `/traducteur/[username]` page ignores username param entirely (SEO/UX broken)
