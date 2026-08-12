# BillSplitterApp — frontend

React 19 + Vite single-page app, talking to the [backend](../backend/README.md) REST API.

For the app's page/component/API-client structure, see [`../docs/architecture.md#frontend-structure`](../docs/architecture.md#frontend-structure). For everything the API returns, see [`../docs/api.md`](../docs/api.md).

## Setup

```
npm install
npm run dev
```

Expects the backend running at `http://localhost:5000` (hardcoded in `src/api/client.js` as `API_BASE_URL`). The logged-in user's JWT is kept in `localStorage` (`billsplit_token`) and attached to every request by `client.js`'s axios interceptor; a `401` response clears it and redirects to `/login`.

## Commands

- `npm run dev` — Vite dev server.
- `npm run build` — production build.
- `npm run lint` — ESLint (flat config, `eslint.config.js`).
- `npm run preview` — preview a production build.

## Layout

- `pages/` — one component per route (landing, login/signup, dashboard, group, add-bill, bill-detail, profile).
- `components/` — shared UI, including a `landing/` subfolder used only by the landing page.
- `api/` — one module per backend resource, all built on the shared `api/client.js` axios instance.
- `context/AuthContext.jsx` — logged-in user/token state, backs `ProtectedRoute`.
- `hooks/`, `utils/` — shared small logic (e.g. avatar helpers, group theme constants, contributor colors).
