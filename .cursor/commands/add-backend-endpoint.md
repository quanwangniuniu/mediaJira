# Add Backend API Endpoint

## Overview

Implement a new backend API endpoint using the full chain: model, serializer, service, view, URL registration, and tests. Use when adding a new resource or action to an existing or new Django app.

## Context

- Follow project standards and the step-by-step walkthrough in **.cursor/AGENTS.md** (section "Adding a new backend API endpoint (full chain)") and **.cursor/rules.md**.
- If the user added text after the command (e.g. `/add-backend-endpoint alerting threshold` or a Jira key), use it as the app name, resource name, or ticket context.

## Steps

1. **Model:** Add or extend the model in `backend/<app>/models.py`. Run `python manage.py makemigrations <app>` and migrate.
2. **Serializer:** Add or extend a serializer in `backend/<app>/serializers.py`. Use for request validation and response serialization only; no business logic.
3. **Service:** Add business logic in `backend/<app>/services.py` (or create the file). Views call service functions. Use `transaction.atomic()` for multi-write flows.
4. **View:** Add a view in `backend/<app>/views.py`. Parse input, check permissions, call the service (or serializer for simple CRUD), return DRF `Response`. Keep the view thin.
5. **URL:** Register the view in `backend/<app>/urls.py`. If the app is new, add it to `backend/backend/settings.py` (`INSTALLED_APPS`) and `backend/backend/urls.py` with the desired `api/...` prefix.
6. **Tests:** Add or extend tests in `backend/<app>/tests/test_views.py` (and `test_services.py` if needed). Follow test file conventions in AGENTS.md (Testing section).
