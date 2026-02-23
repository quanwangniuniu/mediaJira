---
name: add-backend-endpoint
description: Implement a new backend API endpoint using the full chain (model, serializer, service, view, url, tests). Use when adding a new resource or action to an existing or new Django app.
---

# Add Backend API Endpoint

## When to Use

- User asks to add a new backend API, endpoint, or resource.
- User mentions a new Django app endpoint or REST action.
- Task involves creating or extending a backend API in MediaJira.

## Context

- Follow **.cursor/AGENTS.md** (section "Adding a new backend API endpoint (full chain)") and **.cursor/rules.md** for standards and the full walkthrough.
- Use any user-provided context (app name, resource name, Jira key) as scope or target.

## Instructions

1. **Model:** Add or extend the model in `backend/<app>/models.py`. Run `python manage.py makemigrations <app>` and migrate.
2. **Serializer:** Add or extend a serializer in `backend/<app>/serializers.py`. Validation and serialization only; no business logic.
3. **Service:** Add business logic in `backend/<app>/services.py` (or create it). Use `transaction.atomic()` for multi-write flows.
4. **View:** Add a view in `backend/<app>/views.py`. Parse input, check permissions, call the service (or serializer for simple CRUD), return DRF `Response`. Keep the view thin.
5. **URL:** Register the view in `backend/<app>/urls.py`. If the app is new, add it to `backend/backend/settings.py` (`INSTALLED_APPS`) and `backend/backend/urls.py` with the desired `api/...` prefix.
6. **Tests:** Add or extend tests in `backend/<app>/tests/test_views.py` (and `test_services.py` if needed). Follow test file conventions in AGENTS.md (Testing section).

For the complete walkthrough and file conventions, see .cursor/AGENTS.md.
