# Add Frontend Page and Wire to API

## Overview

Implement a new frontend page and wire it to the backend: API client, types, route, components, navigation, and tests. Use when adding a new screen or feature that talks to the API.

## Context

- Follow project standards and the step-by-step walkthrough in **.cursor/AGENTS.md** (section "Adding a new frontend page and wiring it to the API") and **.cursor/rules.md**.
- If the user added text after the command (e.g. `/add-frontend-page settings profile` or a route path), use it as the feature name, route path, or scope.

## Steps

1. **API client:** Add typed functions in `frontend/src/lib/api/<domain>Api.ts` that call the backend. Use the shared `api` axios instance from `frontend/src/lib/api.ts`. Return typed data; do not call axios from components.
2. **Types:** Add or extend interfaces in `frontend/src/types/` for request/response shapes.
3. **Route:** Add a page at `frontend/src/app/<path>/page.tsx`. Page should: read route params, call API functions or hooks, compose feature components, handle loading/error UI. Keep page logic minimal.
4. **Components:** Add feature-specific UI under `frontend/src/components/<feature>/`. Reuse `common/` and `ui/` for primitives; use `layout/` for shell.
5. **Navigation:** Add links or routes in the app shell (e.g. `frontend/src/components/layout/` or the relevant nav component) so the new page is reachable.
6. **Tests:** Add or extend tests under `frontend/src/__tests__/` (e.g. `__tests__/components/<feature>/<Component>.test.tsx` or integration test). Follow test file conventions in AGENTS.md (Testing section).
