## MediaJira Engineering Rules (Coding Standards)

These rules are the default “how we build things” for this repo. Optimize for **KISS**: simplest thing that works, easy to review, easy to maintain.

### Core principles (non‑negotiable)

- **Keep it small**: prefer many small files over one massive file.
- **Single responsibility**: one component/module should have one reason to change.
- **Thin edges, fat core**: pages/views/controllers stay thin; business logic lives in dedicated modules.
- **Consistency beats cleverness**: follow existing patterns in this repo even if you know another “better” way.
- **No secrets in git**: never commit `.env`, tokens, private keys, credentials.

### Repo architecture (what goes where)

```text
backend/                     Django (DRF + Channels + Celery)
  <app>/                     One Django app per domain (task/, decision/, spreadsheet/, ...)
  backend/                   Django project (settings/urls/asgi/wsgi)

frontend/                    Next.js 14 (App Router)
  src/app/                   Route pages/layouts (compose, don’t implement features here)
  src/components/            React components (feature folders live here)
    common/                  Shared, app-agnostic primitives (Button-like, Modal-like, ConfirmDialog, ...)
    ui/                      Reusable UI building blocks (Radix/shadcn-style wrappers)
    layout/                  App shell (Sidebar, Layout, navigation)
  src/lib/api/               All HTTP client code (Axios wrappers per domain)
  src/lib/*Store.ts          Zustand stores
  src/types/                 Shared TS types
```

### Frontend rules (Next.js / React / TypeScript)

#### Components: keep them small and composable

- **Avoid big components**: if a component is growing past ~200–300 lines, **split it**:
  - Extract presentational pieces into `frontend/src/components/<feature>/...`
  - Extract data/state into `frontend/src/hooks/...` or feature-level helpers
- **Pages are composition only**: `frontend/src/app/**/page.tsx` should mostly:
  - Read params
  - Call APIs/hooks/stores
  - Compose feature components
  - Handle route-level loading/error UI
- **Common components first**:
  - If you copy/paste UI twice, extract it into `frontend/src/components/common` or `frontend/src/components/ui`.
  - Feature-specific UI stays in `frontend/src/components/<feature>/...`.

#### Data access: never scatter API calls

- **All HTTP calls live in** `frontend/src/lib/api/*`.
- **Do not call `axios` directly from components/pages** (except inside the API layer).
- **Types are required**: API functions should return typed results; prefer shared types in `frontend/src/types`.

#### Imports

- **Prefer absolute imports** using the `@/` alias (configured in `frontend/tsconfig.json`).
- **Avoid deep relative paths** like `../../../../...` unless you are staying inside a tiny feature folder.

#### State management

- **Local first**: prefer React local state for local UI.
- **Global only when shared**: use Zustand stores in `frontend/src/lib/*Store.ts` when multiple routes/features need the state.
- **No “mega stores”**: keep stores domain-scoped (auth, chat, spreadsheet, …).

#### Styling / UI

- **Tailwind only**: follow existing Tailwind + Radix patterns in this repo.
- **Reuse layout primitives**: prefer `frontend/src/components/layout/*` instead of re-creating headers/sidebars/footers in pages.

#### Quality checks (frontend)

- Run `npm run lint` before requesting review.
- Add/adjust tests when behavior changes (`npm run test`, Storybook stories when useful).

### Backend rules (Django / DRF / Celery / Channels)

#### Keep views thin, services focused

- **Views**: parse input, permissions, call service layer, return response.
- **Serializers**: validate and normalize input/output; keep side effects out of serializers.
- **Services**: business logic goes in `services.py` (or a `services/` module if it grows).
  - In this repo, most apps follow the pattern `views.py` + `serializers.py` + `services.py` + `urls.py`—prefer that before inventing new layers.

#### Database / ORM performance

- **Avoid N+1**: use `select_related` / `prefetch_related`.
- **Be explicit with transactions**: use `transaction.atomic()` for multi-write operations.
- **Prefer bulk ops when appropriate**: but keep correctness first (imports/large batches may justify bulk operations).

#### API design

- **Consistent errors**: raise DRF `ValidationError` with field keys where possible.
- **Permissions first**: enforce auth/authorization early and consistently.

#### Quality checks (backend)

- Run tests with `pytest` (coverage gate exists; don’t lower it casually).
- Add tests for new endpoints/services and for bug fixes.

### Git + PR rules (keep review easy)

- **Commit messages**: prefer Conventional Commits (`feat(scope): ...`, `fix(scope): ...`) and include the Jira key when applicable.

### Security & privacy (always)

- **Never log secrets** (tokens, passwords, full headers).
- **Validate untrusted input** on the backend (treat everything from the client as hostile).
- **Least privilege**: permissions/roles should default to “deny” unless explicitly allowed.