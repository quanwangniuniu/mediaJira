---
name: code-review-checklist
description: Run a code review against MediaJira standards (thin views/pages, API layer placement, no secrets, error handling, permissions, tests). Use before requesting review or merging.
---

# Code Review Checklist

## When to Use

- User asks for a code review, PR review, or pre-merge check.
- User wants to verify code follows project conventions.
- Task involves reviewing changed files or a branch.

## Context

- Apply the rules in **.cursor/rules.md** and **.cursor/AGENTS.md** (coding conventions, error handling, security).
- Use any user-provided context (file path, branch name, Jira key) to focus the review scope.

## Instructions

Work through the following categories and check each item. Reference rules.md and AGENTS.md for detailed standards.

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
