# Create Pull Request

## Overview

Prepare a well-structured pull request with Conventional Commits, clear description, and pre-merge checks. Use when changes are ready for review.

## Context

- Follow **.cursor/AGENTS.md** (Git / PR section) and **.cursor/rules.md**. See README and CICD_README.md for CI/CD and testing details.
- If the user added text after the command (e.g. `/create-pr DX-523`), use it as the Jira key or PR scope and include it in the title/description where appropriate.

## Steps

1. **Prepare branch:** Ensure all changes are committed. Use Conventional Commits: `feat(scope): ...`, `fix(scope): ...`. Include the Jira key when applicable. Push branch to remote; verify it is up to date with main/develop.
2. **Run checks:** Run `npm run lint` and `npm run test` in `frontend/`. Run `docker compose exec backend pytest` from repo root (with stack up). Fix any failures before opening the PR.
3. **Write PR description:** Summarize changes clearly. Include context and motivation. List any breaking changes. Add screenshots if UI changed.
4. **Create PR:** Use a descriptive title. Add appropriate labels. Assign reviewers. Link related issues or Jira ticket if provided.

## PR Checklist

- [ ] Commits follow Conventional Commits; Jira key included if applicable.
- [ ] Frontend lint and tests pass.
- [ ] Backend pytest passes (with coverage if required).
- [ ] PR description complete; breaking changes called out.
- [ ] Related issue or Jira ticket linked.
