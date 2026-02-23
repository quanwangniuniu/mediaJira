---
name: run-tests-and-fix
description: Run the full test suite (backend pytest and frontend lint/test), then systematically fix any failures. Use when verifying changes or after pulling updates.
---

# Run Tests and Fix Failures

## When to Use

- User asks to run tests, fix test failures, or verify the test suite.
- User mentions CI failures, flaky tests, or getting tests green.
- Task involves validating or repairing backend or frontend tests.

## Context

- Follow **.cursor/AGENTS.md** (Testing section) for commands and test file conventions. Backend tests live in `backend/<app>/tests/`; frontend in `frontend/src/__tests__/`.
- Use any user-provided context (e.g. "backend", "frontend", or a path like `task/tests`) to run only that subset and fix failures there.

## Instructions

1. **Run backend tests:** From repo root with stack up: `docker compose exec backend pytest`. With coverage: `docker compose exec backend pytest --cov`. Capture output and note failures.
2. **Run frontend checks:** From `frontend/`: `npm run lint`, then `npm run test` (or `npm run test:ci` for CI mode). Note any lint or test failures.
3. **Analyze failures:** Categorize by type (flaky, broken, new). Prioritize by impact. Check if failures relate to recent changes.
4. **Fix systematically:** Fix one issue at a time. Prefer the most critical or blocking failures first. Re-run the affected suite after each fix.
5. **Re-run full suite:** After fixes, run both backend pytest and frontend lint + test again to confirm everything passes.

### Commands Reference

- Backend: `docker compose exec backend pytest` (from repo root).
- Frontend lint: `npm run lint` (from `frontend/`).
- Frontend test: `npm run test` or `npm run test:ci` (from `frontend/`).
