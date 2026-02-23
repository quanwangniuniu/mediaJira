---
name: add-frontend-page
description: Implement a new frontend page and wire it to the backend API (API client, types, route, components, navigation, tests). Use when adding a new screen or feature that talks to the API.
---

# Add Frontend Page and Wire to API

## When to Use

- User asks to add a new page, screen, or frontend feature.
- User mentions a new route or UI that needs to call the API.
- Task involves creating a new Next.js page and connecting it to the backend.

## Context

- Follow **.cursor/AGENTS.md** (section "Adding a new frontend page and wiring it to the API") and **.cursor/rules.md** for standards and the full walkthrough.
- Use any user-provided context (route path, feature name, Jira key) as scope or target.

## Instructions

1. **API client:** Add typed functions in `frontend/src/lib/api/<domain>Api.ts` that call the backend. Use the shared `api` axios instance from `frontend/src/lib/api.ts`. Return typed data; do not call axios from components.
2. **Types:** Add or extend interfaces in `frontend/src/types/` for request/response shapes.
3. **Route:** Add a page at `frontend/src/app/<path>/page.tsx`. Page should read route params, call API functions or hooks, compose feature components, handle loading/error UI. Keep page logic minimal.
4. **Components:** Add feature-specific UI under `frontend/src/components/<feature>/`. Reuse `common/` and `ui/` for primitives; use `layout/` for shell.
5. **Navigation:** Add links or routes in the app shell (e.g. `frontend/src/components/layout/` or the relevant nav component) so the new page is reachable.
6. **Tests:** Add or extend tests under `frontend/src/__tests__/` (e.g. `__tests__/components/<feature>/<Component>.test.tsx` or integration test). Follow test file conventions in AGENTS.md (Testing section).

For the complete walkthrough and file conventions, see .cursor/AGENTS.md.
