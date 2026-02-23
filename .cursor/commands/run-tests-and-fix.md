# Run Tests and Fix Failures

## Overview

Run the full test suite (backend and frontend), then systematically fix any failures. Use when verifying changes or after pulling updates.

## Context

- Follow **.cursor/AGENTS.md** (Testing section) for commands and test file conventions. Backend tests live in `backend/<app>/tests/`; frontend in `frontend/src/__tests__/`.
- If the user added text after the command (e.g. `backend`, `frontend`, or a path like `task/tests`), run only that subset and fix failures there.

## Steps

1. **Run backend tests:** From repo root with stack up: `docker compose exec backend pytest`. With coverage: `docker compose exec backend pytest --cov`. Capture output and note failures.
2. **Run frontend checks:** From `frontend/`: `npm run lint`, then `npm run test` (or `npm run test:ci` for CI mode). Note any lint or test failures.
3. **Analyze failures:** Categorize by type (flaky, broken, new). Prioritize by impact. Check if failures relate to recent changes.
4. **Fix systematically:** Fix one issue at a time. Prefer the most critical or blocking failures first. Re-run the affected suite after each fix.
5. **Re-run full suite:** After fixes, run both backend pytest and frontend lint + test again to confirm everything passes.

## Commands Reference

- Backend: `docker compose exec backend pytest` (from repo root).
- Frontend lint: `npm run lint` (from `frontend/`).
- Frontend test: `npm run test` or `npm run test:ci` (from `frontend/`).
