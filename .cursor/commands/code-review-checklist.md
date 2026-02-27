# Code Review Checklist

## Overview

Run a code review against MediaJira standards: thin views/pages, API layer placement, no secrets, error handling, permissions, and tests. Use before requesting review or merging.

## Context

- Apply the rules in **.cursor/rules.md** and **.cursor/AGENTS.md** (coding conventions, error handling, security).
- If the user added text after the command (e.g. a file path, branch name, or Jira key), focus the review on that scope.

## Review Categories

### Functionality

- [ ] Code does what it is supposed to do.
- [ ] Edge cases are handled.
- [ ] Error handling is appropriate (backend: DRF ValidationError/PermissionDenied; frontend: toasts, error state per AGENTS.md).

### Code Quality

- [ ] Code is readable and well-structured; small, focused functions.
- [ ] No code duplication; follows existing patterns in the repo.
- [ ] Backend: views thin, logic in services; serializers for validation/serialization only.
- [ ] Frontend: pages compose only; all HTTP in `frontend/src/lib/api/*`; no axios from components; `@/` imports; components under ~200–300 lines or split.

### Project Conventions

- [ ] Backend: `views.py` + `serializers.py` + `services.py` + `urls.py` pattern; `select_related`/`prefetch_related` where needed; `transaction.atomic()` for multi-write.
- [ ] Frontend: typed API responses; shared types in `src/types`; Zustand stores domain-scoped; Tailwind + Radix only.
- [ ] Tests added or updated for changed behavior (backend: `backend/<app>/tests/test_*.py`; frontend: `frontend/src/__tests__/` per AGENTS.md).

### Security

- [ ] No secrets in git, logs, or code.
- [ ] Input validated on the backend; treat client data as untrusted.
- [ ] Permissions enforced; least privilege.
