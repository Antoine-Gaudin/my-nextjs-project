# Trad-Index — Comprehensive Audit Report

**Project**: Trad-Index (my-nextjs-project)  
**Stack**: Next.js 16.1.6 · React 18.2.0 · Tailwind CSS 3.4.1 · Strapi CMS  
**Date**: June 2025  

---

## Summary

| Severity | Count |
|----------|-------|
| 🔴 Critical | 6 |
| 🟠 Important | 18 |
| 🟡 Minor | 10 |
| **Total** | **34** |

---

## 🔴 CRITICAL

### SECURITY

#### 1. Open Proxy API — No Input Validation or Rate Limiting
- **File**: `src/app/api/proxy/[...path]/route.js` — Lines 1–195  
- **Category**: Security  
- **Description**: The proxy route forwards **any** request path to the Strapi backend with no allowlist, no path validation, and no rate limiting. An attacker can target any Strapi endpoint (e.g. `/users`, `/admin`, `/upload`) through this relay. GET, POST, PUT, and DELETE are all exposed.  
- **Suggested fix**: Implement a strict allowlist of allowed path prefixes (e.g. `/oeuvres`, `/chapitres`, `/teams`). Add rate limiting (e.g. via `next-rate-limit` or a middleware). Validate and sanitize the `path` parameter before forwarding.

---

#### 2. API Token Exposed Client-Side via `NEXT_PUBLIC_INDEX_API_TOKEN`
- **Files**:
  - `src/app/componants/AddOeuvreForm.js` — Line 26
  - `src/app/componants/MoOeuvre.js` — Line 26
  - `src/app/componants/PanelOeuvre.js` — Line 12
  - `src/app/componants/AjouterChapitre.js` — Line 254
  - `src/app/componants/ImportWord.js` — Line 43
- **Category**: Security  
- **Description**: The `NEXT_PUBLIC_` prefix causes this token to be bundled into the client-side JavaScript. Anyone can extract it from the browser's DevTools and use it to read/write data on `novel-index-strapi.onrender.com` with full bearer-token privileges. This is found in **5 components**.  
- **Suggested fix**: Move all calls to `novel-index-strapi.onrender.com` to a server-side API route (e.g. `/api/sync`). Store the token as a non-public environment variable (`INDEX_API_TOKEN` without the `NEXT_PUBLIC_` prefix) and only access it server-side.

---

#### 3. JWT Stored in Non-HttpOnly, Non-Secure Cookie
- **File**: `src/app/connexion/page.js` — Lines 84, 134  
- **Category**: Security  
- **Description**: `Cookies.set("jwt", jwt, { expires: 7 })` creates a cookie that is **not** `httpOnly` and **not** `secure`. Any XSS vulnerability would allow JavaScript to steal the JWT. The cookie is also sent over HTTP in development.  
- **Suggested fix**: Set the JWT as an `httpOnly`, `secure`, `SameSite=Strict` cookie from a server-side API route (e.g. `/api/auth/login`). Do not write the JWT from client-side JavaScript.

---

#### 4. JWT Also Stored in localStorage
- **File**: `src/app/connexion/page.js` — Lines 83, 133  
- **Category**: Security  
- **Description**: `localStorage.setItem("jwt", jwt)` makes the token permanently accessible to any script running on the page. Combined with the non-httpOnly cookie, the JWT is doubly exposed.  
- **Suggested fix**: Remove `localStorage` storage entirely. Use a single httpOnly cookie set by the server.

---

#### 5. User Info Stored in Plain Cookie
- **File**: `src/app/connexion/page.js` — Line 91 (approx.)  
- **Category**: Security  
- **Description**: `Cookies.set("userInfo", JSON.stringify(userInfoResponse.data))` stores full user profile data (potentially including email, role, etc.) in a non-httpOnly, non-encrypted cookie. This data is readable and tamperable by any client-side script.  
- **Suggested fix**: Store only a session identifier in a secure cookie. Fetch user info on demand from a server-side session.

---

#### 6. `dangerouslySetInnerHTML` With User-Supplied Content
- **File**: `src/app/migration/page.js` — Line 566  
- **Category**: Security  
- **Description**: Uses `dangerouslySetInnerHTML` to render content that originates from Strapi chapter data. If the Strapi data is ever compromised or contains injected scripts, this creates an XSS vector.  
- **Suggested fix**: Sanitize the HTML with a library like `DOMPurify` before rendering, or use a safe rich-text renderer that strips script tags.

---

## 🟠 IMPORTANT

### PERFORMANCE

#### 7. Zero Usage of `next/image` — All Images Are `<img>` Tags
- **Files** (11+ instances):
  - `src/app/page.js` — Lines 299, 399
  - `src/app/oeuvres/page.js`
  - `src/app/teams/page.js`
  - `src/app/componants/Editions.js`
  - `src/app/componants/TeamGraphiques.js`
  - `src/app/componants/FicheOeuvre.js`
  - `src/app/componants/TeamCard.js`
  - And others
- **Category**: Performance  
- **Description**: There are **zero** imports of `next/image` in the entire codebase. All images use raw `<img>` tags, missing out on automatic lazy loading, responsive sizes, WebP/AVIF conversion, and blur placeholders provided by the Next.js Image component.  
- **Suggested fix**: Replace `<img>` with `next/image` `<Image>` component. Configure `images.remotePatterns` in `next.config.mjs` for external Strapi image domains.

---

#### 8. Homepage Is Fully Client-Rendered — Kills SSR/SEO
- **File**: `src/app/page.js` — Line 1  
- **Category**: Performance / SEO  
- **Description**: `"use client"` at the top of the homepage means the entire page (hero, categories, popular oeuvres) is rendered only in the browser. Search engine crawlers see an empty shell. The popular oeuvres are fetched client-side in a `useEffect`, producing a loading flash.  
- **Suggested fix**: Convert to a Server Component. Fetch popular oeuvres with `async` at the page level and pass them as props. Extract interactive parts (search overlay) into small client components.

---

#### 9. N+1 Fetch Pattern — Chapter Counts Fetched One-by-One
- **File**: `src/app/componants/Profil.js` — Lines 19–27  
- **Category**: Performance  
- **Description**: For each oeuvre owned by the user, a separate `fetch` call is made to count chapters. With 50 oeuvres, this fires 50+ sequential HTTP requests.  
- **Suggested fix**: Use a single aggregated Strapi query to count chapters (e.g. populate the chapter count in the initial oeuvres query, or use a custom Strapi endpoint that returns counts in bulk).

---

#### 10. Five Oversized Components (800+ Lines Each)
- **Files**:
  - `src/app/componants/TeamGraphiques.js` — 1251 lines
  - `src/app/componants/TeamKanban.js` — 1213 lines
  - `src/app/componants/ChapitreReader.js` — 1063 lines
  - `src/app/componants/FicheOeuvre.js` — 867 lines
  - `src/app/componants/PanelView.js` — 811 lines
- **Category**: Code Structure  
- **Description**: These components are monolithic and difficult to maintain, test, or optimize. They combine data fetching, state management, and rendering in a single file, making tree-shaking and code-splitting ineffective.  
- **Suggested fix**: Extract logical sub-sections into smaller child components. Separate data-fetching hooks (custom hooks) from UI. For `TeamKanban`, extract the board, column, and card into separate components.

---

#### 11. NavBar Uses `<a>` Tags Instead of `next/link`
- **File**: `src/app/componants/NavBar.js` — Lines 42–62  
- **Category**: Performance  
- **Description**: All navigation links (Accueil, Catalogue, Migration, etc.) use raw `<a href="...">` tags, causing full page reloads on every navigation. Only 4 files in the entire project import `next/link`.  
- **Suggested fix**: Replace `<a>` with `<Link>` from `next/link` for all internal routes to enable client-side navigation with prefetching.

---

#### 12. Oeuvres Page Fetches All Records Without Pagination
- **File**: `src/app/oeuvres/page.js` — `useEffect` fetch  
- **Category**: Performance  
- **Description**: The oeuvres listing page fetches the complete dataset in a single request (`pagination[pageSize]=1000` or similar). As the catalogue grows, this will cause increasingly slow initial loads and high memory usage.  
- **Suggested fix**: Implement server-side pagination or infinite scroll. Fetch only the current page of results and load more on demand.

---

#### 13. Kanban Data Stored Only in localStorage
- **File**: `src/app/componants/TeamKanban.js` — Lines 54, 75  
- **Category**: Performance / Data Integrity  
- **Description**: The entire Kanban board state is read from and written to `localStorage`. Data is never persisted to the server, meaning it is lost when clearing browser data, switching devices, or for other team members.  
- **Suggested fix**: Sync Kanban state to a Strapi collection type. Use localStorage as a cache/fallback only.

---

### SEO

#### 14. No Per-Page Metadata on Client Pages
- **Files**: `src/app/oeuvres/page.js`, `src/app/teams/page.js`, `src/app/profil/page.js`  
- **Category**: SEO  
- **Description**: Client components (`"use client"`) cannot export the `metadata` object. These pages have no `<title>` or `<meta>` tags beyond the root layout defaults. The oeuvres catalogue page, which should be highly discoverable, has no unique title or description.  
- **Suggested fix**: Use `generateMetadata` in a server-component wrapper, or use the `<Head>` component / `next/head` pattern to set page-specific metadata.

---

### ACCESSIBILITY

#### 15. Modals Lack Focus Traps, `role="dialog"`, and `aria-modal`
- **Files**:
  - `src/app/componants/FicheOeuvre.js` — modal overlay
  - `src/app/page.js` — search overlay
  - `src/app/componants/GenreModal.js`, `TagModal.js`
- **Category**: Accessibility  
- **Description**: Modal overlays are rendered as plain `<div>` elements without `role="dialog"`, `aria-modal="true"`, or focus trapping. Keyboard users can tab behind the modal, and screen readers do not announce it as a dialog.  
- **Suggested fix**: Add `role="dialog"`, `aria-modal="true"`, and `aria-labelledby` to modal containers. Implement focus trapping (e.g. `focus-trap-react` or a custom hook). Restore focus to the trigger element on close.

---

#### 16. `window.confirm` Used for All Destructive Actions (10 Instances)
- **Files**:
  - `src/app/componants/Editions.js` — Line 109
  - `src/app/componants/PanelOeuvre.js`
  - `src/app/componants/TeamView.js` — 3 instances
  - `src/app/componants/TeamOeuvres.js`
  - `src/app/componants/TeamKanban.js` — 2 instances
  - `src/app/componants/TeamAnnonces.js`
  - `src/app/chapitreadmin/[documentid]/page.js`
- **Category**: Accessibility / UX  
- **Description**: Native `window.confirm()` dialogs are unstyled, cannot be customized, are not keyboard-accessible in all contexts, and are blocked by some browsers/extensions. They provide no visual consistency with the rest of the UI.  
- **Suggested fix**: Create a reusable `<ConfirmDialog>` component with proper `role="alertdialog"`, focus management, and themed styling. Replace all 10 `window.confirm` calls.

---

#### 17. Icon-Only Buttons Without Accessible Labels
- **Files**: Multiple components (filter buttons, sort buttons, close buttons, action buttons across `page.js`, `oeuvres/page.js`, `FicheOeuvre.js`, `PanelView.js`, `TeamKanban.js`)  
- **Category**: Accessibility  
- **Description**: Many buttons contain only SVG icons with no visible text and no `aria-label`. Screen readers announce these as "button" with no indication of purpose.  
- **Suggested fix**: Add `aria-label` to all icon-only buttons (e.g. `aria-label="Fermer"`, `aria-label="Trier par date"`).

---

### CODE STRUCTURE

#### 18. Duplicate Form Components — `AddOeuvreForm.js` / `MoOeuvre.js`
- **Files**:
  - `src/app/componants/AddOeuvreForm.js` — 270 lines
  - `src/app/componants/MoOeuvre.js` — 271 lines
- **Category**: Code Structure  
- **Description**: Both files contain nearly identical form logic and UI for creating vs. editing an oeuvre (same fields, same layout, same genre/tag selectors). This duplication makes maintenance error-prone.  
- **Suggested fix**: Merge into a single `OeuvreForm.js` component that accepts a `mode` prop ("create" | "edit") and an optional `initialData` prop.

---

#### 19. No Error Boundaries Anywhere
- **Category**: Code Structure / UX  
- **Description**: A search across the codebase found zero `ErrorBoundary` components or `error.js` files. Any uncaught rendering error crashes the entire page with a white screen.  
- **Suggested fix**: Add `error.js` files in key route segments (`app/error.js`, `app/profil/error.js`, `app/oeuvres/error.js`) to catch rendering errors and show a recovery UI.

---

#### 20. Mix of `axios` and `fetch` Throughout Codebase
- **Category**: Code Structure  
- **Description**: Some components use `axios` (e.g. `AddOeuvreForm.js`, `MoOeuvre.js`, `connexion/page.js`) while others use native `fetch` (most other components). This inconsistency increases bundle size and complicates error handling patterns.  
- **Suggested fix**: Standardize on `fetch` (built into Next.js with caching support) and remove the `axios` dependency, or create a single API client wrapper.

---

#### 21. Folder Named `componants` (Misspelling)
- **File**: `src/app/componants/`  
- **Category**: Code Structure  
- **Description**: The components folder is spelled "componants" (French hybrid misspelling). This will confuse any collaborator and is inconsistent with standard conventions.  
- **Suggested fix**: Rename to `components` and update all imports.

---

#### 22. Undefined Variable `apiUrl` in `MoOeuvre.js`
- **File**: `src/app/componants/MoOeuvre.js` — Line 53  
- **Category**: Code Structure (Bug)  
- **Description**: `setExistingCouverture(\`${apiUrl}${oeuvre.couverture.url}\`)` references `apiUrl`, but this variable is never declared in the component. This will throw a `ReferenceError` at runtime when a cover image uses a relative URL.  
- **Suggested fix**: Define `const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://my-strapi-project-yysn.onrender.com';` at the top of the component, or remove the prefix if Strapi already returns absolute URLs.

---

### UX

#### 23. Dead Footer Links (`href="#"`)
- **File**: `src/app/layout.js` — Lines 206–212  
- **Category**: UX  
- **Description**: Footer links for "Mentions légales", "Confidentialité", and "Contact" all point to `#`, providing no content and frustrating users who click them.  
- **Suggested fix**: Create the corresponding pages (`/mentions-legales`, `/confidentialite`, `/contact`) or remove the links until the pages exist.

---

#### 24. Hardcoded Statistics on Homepage
- **File**: `src/app/page.js` — Lines 163–175  
- **Category**: UX / Data Integrity  
- **Description**: The hero section shows static numbers ("1000+", "50K+", "100+") that never update. These will become inaccurate over time and mislead users.  
- **Suggested fix**: Fetch real counts from the API (total oeuvres, total chapters, active users) or remove the stats section.

---

## 🟡 MINOR

### PERFORMANCE

#### 25. `categories` Array Recreated Every Render
- **File**: `src/app/page.js` — Lines 17–27  
- **Category**: Performance  
- **Description**: The `categories` constant is defined inside the component body, causing a new array to be allocated on every render. While the performance impact is small, it triggers unnecessary re-renders if passed as a prop.  
- **Suggested fix**: Move the `categories` array outside the component function or wrap it in `useMemo` with an empty dependency array.

---

#### 26. No `loading.js` or Suspense Boundaries (Except Oeuvres Page)
- **Files**: All route segments except `src/app/oeuvres/page.js`  
- **Category**: Performance / UX  
- **Description**: Only the oeuvres page uses a `<Suspense>` wrapper. No `loading.js` files exist in any route segment, so route transitions show no loading indicator.  
- **Suggested fix**: Add `loading.js` files to key routes (`app/loading.js`, `app/profil/loading.js`, etc.) to provide instant loading feedback during navigation.

---

#### 27. No Image Optimization Config in `next.config.mjs`
- **File**: `next.config.mjs`  
- **Category**: Performance  
- **Description**: The `images` configuration (for `remotePatterns` or `domains`) is missing. Even if `next/image` were adopted, remote images from Strapi would fail to load without proper domain configuration.  
- **Suggested fix**: Add `images: { remotePatterns: [{ protocol: 'https', hostname: 'my-strapi-project-yysn.onrender.com' }] }` to `next.config.mjs`.

---

### SEO

#### 28. `<html lang="fr">` But No Alternate Language Tags
- **File**: `src/app/layout.js` — Line (html tag)  
- **Category**: SEO  
- **Description**: The page is marked as French via `lang="fr"`, which is correct. However, given the domain handles translated works (potentially from multiple source languages), there are no `hreflang` alternate tags for international SEO if multilingual support is ever planned.  
- **Suggested fix**: Low priority — add `hreflang` only if multi-language support is planned.

---

### ACCESSIBILITY

#### 29. Logo/Brand Uses `onClick` on `<div>` Without `role="link"`
- **File**: `src/app/componants/NavBar.js` — Lines 29–38  
- **Category**: Accessibility  
- **Description**: The logo area uses `<div onClick={() => router.push("/")} className="cursor-pointer">` instead of a `<Link>` or `<a>` tag. It is not keyboard-focusable without a `tabIndex` and has no semantic meaning.  
- **Suggested fix**: Replace with `<Link href="/">` wrapping the logo content.

---

#### 30. No Skip-to-Content Link
- **File**: `src/app/layout.js`  
- **Category**: Accessibility  
- **Description**: There is no "Skip to main content" link. Keyboard users must tab through the entire navigation on every page load.  
- **Suggested fix**: Add a visually-hidden skip link as the first child of `<body>`: `<a href="#main" className="sr-only focus:not-sr-only">Aller au contenu principal</a>` and add `id="main"` to the main content area.

---

### CODE STRUCTURE

#### 31. No `React.memo` Usage on Static/Pure Components
- **Files**: `TeamCard.js`, `NavProfil.js`, and other leaf components  
- **Category**: Code Structure / Performance  
- **Description**: Components like `TeamCard` are rendered in lists and receive stable props, but are not wrapped in `React.memo`. This can cause unnecessary re-renders in large lists.  
- **Suggested fix**: Wrap pure presentational components (cards, list items) in `React.memo`.

---

#### 32. `useRouter().push()` Used for Simple Navigation
- **Files**: `src/app/page.js`, `src/app/componants/NavBar.js`, `src/app/componants/Editions.js`, and others  
- **Category**: Code Structure  
- **Description**: `router.push("/some-path")` is used inside `onClick` handlers for what should be standard `<Link>` elements. This prevents users from middle-clicking to open in a new tab, and prevents Next.js from prefetching the route.  
- **Suggested fix**: Replace `<button/div onClick={() => router.push(…)}>` with `<Link href={…}>` wherever the navigation target is known at render time.

---

#### 33. No Centralized API Client or Error Handling
- **Category**: Code Structure  
- **Description**: API calls are scattered across 20+ components with inline `fetch`/`axios` calls. Error handling is inconsistent — some use `try/catch` with `console.error`, some ignore errors entirely, and none show user-facing error messages beyond basic state.  
- **Suggested fix**: Create a shared `lib/api.js` module with wrapper functions (e.g. `apiGet`, `apiPost`) that handle auth headers, base URL, error parsing, and toast notifications in one place.

---

#### 34. Inconsistent Logout — Only Clears Cookie, Not localStorage
- **File**: `src/app/componants/NavBar.js` — Lines 17–21  
- **Category**: Code Structure (Bug)  
- **Description**: `handleLogout` calls `Cookies.remove("jwt")` but does not clear `localStorage.removeItem("jwt")`. After logout, the JWT remains in localStorage, potentially causing stale auth state if any component reads from localStorage.  
- **Suggested fix**: Add `localStorage.removeItem("jwt")` and `Cookies.remove("userInfo")` to the logout handler.

---

## Architecture Recommendations (Non-Finding)

These are not bugs but architectural suggestions for the project's growth:

1. **Adopt App Router conventions fully**: Use `loading.js`, `error.js`, `not-found.js` in route segments.
2. **Server Components by default**: Move data fetching to Server Components and use `"use client"` only for interactive pieces.
3. **Authentication middleware**: Use Next.js middleware (`middleware.js`) to protect routes instead of checking JWT in each client component.
4. **Testing coverage**: Only 5 test files exist for 20+ components. Expand coverage, especially for auth flows and the proxy API.
5. **TypeScript migration**: The project uses `jsconfig.json` — consider migrating to TypeScript for type safety across the growing codebase.

---

*End of audit report — 34 findings across 6 categories.*
