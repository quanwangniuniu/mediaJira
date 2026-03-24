---
description: Backend standards for Django, DRF, Celery, Channels (views, services, DB, API design, quality).
globs: backend/**/*.py
alwaysApply: false
---

# Backend rules (Django / DRF / Celery / Channels)

## Keep views thin, services focused

- **Views**: parse input, permissions, call service layer, return response.
- **Serializers**: validate and normalize input/output; keep side effects out of serializers.
- **Services**: business logic goes in `services.py` (or a `services/` module if it grows).
  - In this repo, most apps follow the pattern `views.py` + `serializers.py` + `services.py` + `urls.py`—prefer that before inventing new layers.

## Database / ORM performance

- **Avoid N+1**: use `select_related` / `prefetch_related`.
- **Be explicit with transactions**: use `transaction.atomic()` for multi-write operations.
- **Prefer bulk ops when appropriate**: but keep correctness first (imports/large batches may justify bulk operations).

## API design

- **Consistent errors**: raise DRF `ValidationError` with field keys where possible.
- **Permissions first**: enforce auth/authorization early and consistently.

## CSRF and JWT API views

- **Always apply `@csrf_exempt` to JWT-based API views** (e.g. `LoginView`, `RegisterView`).
  - Django's CSRF middleware activates whenever a request carries a `sessionid` cookie — including when a Django Admin session is open in the same browser.
  - JWT frontends never send a CSRF token, so any POST endpoint that lacks `@csrf_exempt` will return **403 Forbidden** when an Admin session is active.
  - Pattern to use on class-based views:
    ```python
    from django.views.decorators.csrf import csrf_exempt
    from django.utils.decorators import method_decorator

    @method_decorator(csrf_exempt, name='dispatch')
    class MyJWTView(APIView):
        ...
    ```
  - Reference: BGF-33 / SMP-511.

## Quality checks (backend)

- Run tests with `pytest` (coverage gate exists; don't lower it casually).
- Add tests for new endpoints/services and for bug fixes.
