# OSINTBuddy Frontend

Vite + Preact + TypeScript app styled with Tailwind CSS v4. This README onboards new contributors to running, developing, and extending the frontend.

## Overview
- Build tool: Vite, TypeScript, `@preact/preset-vite`
- UI runtime: Preact with `preact/compat` (React-compatible APIs)
- Router: `react-router-dom@7` with code-splitting via `lazy()`
- State: `zustand` stores (persisted auth and feature-specific stores)
- Styling: Tailwind CSS v4 via `@tailwindcss/vite` and CSS theme tokens
- Docs: Markdown rendered with Markdoc + `vite-plugin-markdown`
- Graph/visuals: `@xyflow/react`, visx, graphology, sigma

## Prerequisites
- Node.js 22 and Yarn (recommended, repo includes `yarn.lock`)
- Backend running and reachable (see repository install docs)
- Environment variable `VITE_BASE_URL` pointing to backend origin

## Quick Start
```bash
# 1) Install deps
yarn

# 2) Configure environment
cp .env.example .env
# then edit .env
# VITE_BASE_URL="http://localhost:48997"

# 3) Run the dev server
yarn dev
# Opens on http://localhost:55173 (hosted on your LAN as well)

# 4) Production build + local preview
yarn build
yarn preview
```

Notes
- The frontend talks to `${VITE_BASE_URL}/api` at runtime; ensure the backend is up and healthy before logging in.
- Default credentials and stack launcher commands are in the docs (see: Docs ➜ Installation).

## Environment
- `VITE_BASE_URL` (required)
  - Example: `http://localhost:48997`
  - Derived in `src/app/baseApi.ts` as:
    - `BASE_URL = ${VITE_BASE_URL}/api`
    - `WS_URL` is computed from the domain for websocket usage
- Vite exposes only `VITE_*` variables to the client.

## Scripts
- `yarn dev` — Start Vite dev server on `--host` port `55173`
- `yarn build` — Production build to `dist/`
- `yarn preview` — Serve the built app locally

## Project Structure
```
frontend/
├─ public/                # static assets (favicon, manifest)
├─ src/
│  ├─ app/                # API client, stores, utilities
│  ├─ assets/             # Tailwind v4/css, fonts, and images
│  ├─ components/         # Reusable UI components and layouts
│  ├─ routes/             # Route-level pages (public, dashboard, graph, docs)
│  │  └─ docs/            # Docs pages in Markdown and renderer
│  ├─ AppRoutes.tsx       # Router configuration
│  └─ main.tsx            # App bootstrap
├─ index.html             # App entry HTML
├─ vite.config.ts         # Vite plugins & server config
└─ package.json
```

## Routing
- Defined in `src/AppRoutes.tsx` with `createBrowserRouter`.
- Public routes: landing, login/register, terms, docs (`/docs/*`).
- Authenticated app: dashboard (`/dashboard`), settings, workspaces.
- Graph view: `/flow/:hid` (dedicated layout).
- Docs navigation and rendering live in `src/routes/docs/Documentation.tsx`.

## State Management
- `zustand` stores in `src/app/store.ts` for:
  - Auth (`useAuthStore`) with persisted tokens
  - Entities and Graphs CRUD, favorites, pagination
  - Graph UI state (nodes/edges), panels and viewers (PDF, audio, attachments)
- Patterns: async actions read tokens from `useAuthStore` and call typed APIs in `src/app/api.ts`.

## API Client & Auth
- `src/app/api.ts` centralizes typed endpoints and the `request<T>()` helper:
  - Adds `Authorization: Bearer <token>` header
  - Handles 401/token issues with refresh flow via `authApi.refresh`
  - Surfaces errors with `react-toastify`
- `src/app/baseApi.ts` constructs `BASE_URL` from `VITE_BASE_URL`.

## Styling
- Tailwind v4 via `@tailwindcss/vite` with theme tokens in `src/assets/styles/index.css`.
- Typography utilities enabled via `@plugin "@tailwindcss/typography"` in CSS for Docs.
- Global styles imported from `src/main.tsx`.

## Markdown Docs
- Markdown pages live under `src/routes/docs/**/*.md` with frontmatter.
- Loaded dynamically in `Documentation.tsx` using `vite-plugin-markdown` and rendered with Markdoc.
- Custom nodes/tags: `src/app/nodes.ts`, `src/app/tags.ts`.

## Common Workflows
- Add a page/route
  1. Create the component under `src/routes/...`
  2. Wire it in `src/AppRoutes.tsx` under the correct layout
- Add an API call
  1. Add a typed method in `src/app/api.ts`
  2. Consume it in a `zustand` store or component
- Add a docs page
  1. Create `src/routes/docs/<path>.md`
  2. Add a navigation entry in `Documentation.tsx` if you want it linked in the sidebar
- Style changes
  - Extend theme tokens in `src/assets/styles/index.css`
  - Use utility classes and `prose` for docs content

## Conventions
- Imports use alias `@/` for `src` (see `vite.config.ts` and `tsconfig.app.json`).
- Preact compatibility: TS paths map `react*` to `preact/compat` so most React libraries work out of the box.
- Formatting: Prettier (Tailwind plugin enabled), no semicolons, single quotes. See `package.json` `prettier` config.

## Troubleshooting
- Blank screen / auth failures
  - Ensure backend is running and `VITE_BASE_URL` is correct
  - Check browser console for CORS/network errors
- Session issues during development
  - Logout and sign in again

## Build & Deploy
- `yarn build` outputs static assets to `dist/`.
- Serve behind your static host or reverse proxy; ensure `VITE_BASE_URL` was set appropriately at build time.
- Static assets in `public/` are copied as-is to the root of the built app.

## Useful Links
- In-app docs: visit `/docs` while the dev server is running
- Installation guide and defaults: `src/routes/docs/installation.md`
- Contribution and architecture notes: `src/routes/docs/contrib/*`

---

If anything is unclear or you need help with a specific contribution, open an issue or ask in the community Discord.

