# MED-335: Authorization Policy Matrix

Validation status: code and tests are written; the Level-2 org-admin changes (section 4) are not yet covered by an executed test run. Nothing here claims a passing run for them.

## 1. Scope

- Describe all nine `Permission` modules (`ASSET`, `CAMPAIGN`, `BUDGET_REQUEST`, `BUDGET_POOL`, `BUDGET_ESCALATION`, `QUEUE`, `SUPPORT_TEAM`, `TICKET`, `INVITATION`) in one declarative registry (`access_control/services.py`), with one action model: read/list `VIEW`; create, update and workflow steps (claim, close, start-review, resend, ...) `EDIT`; approval decisions (budget decision, invitation approve/reject) `APPROVE`; deletion (including soft-delete and revoke) `DELETE`. The action follows what the endpoint does, not just the HTTP method; PATCH is not assumed to be `APPROVE`.
- Phased enforcement: policy resolution is separate from enforcement. Only ASSET and `/api/campaigns/**` stay enforced. All other modules are resolved and documented but **planned** (not enforced).
- Fix the Teams authorization gap with the existing `team_permission_required` decorator and give Level-2 Organization Admins organization-wide Team management (section 4).
- Not changed: Django `has_perm()` usage, app-specific DRF permission classes (`budget_approval.permissions`, CSM classes), `ModuleApprover`, zero-role grace, the superuser `request.is_org_admin` behavior, and the Teams gaps listed in section 4. No migrations, seed data, feature flags, role-permission assignments or logging changes. The only frontend change is the Teams page for organization admins (section 4).

## 2. Enforcement status

`resolve_policy(path, method)` is a pure function (no database, no request object) returning `(module, action, rule, enforcement)`. The middleware creates a permission gate only when `decision.enforced` is true, i.e. the decision is resolved and its state is `active`. A **planned** route behaves exactly like an unmapped route: no middleware 403 and no override-audit row. The `user_has_*` helpers are the only part that queries the database (current tenant schema).

| Module | Routes | State |
|---|---|---|
| ASSET | `/api/assets/**` (legacy resolver) | **Active**, unchanged |
| CAMPAIGN | `/api/campaigns/**` (legacy resolver) | **Active**, unchanged |
| CAMPAIGN | `campaign-templates`, `campaign-*-links` | Planned (never enforced before; not activated by association) |
| BUDGET_REQUEST, BUDGET_POOL, BUDGET_ESCALATION | `/api/budgets/**` and `/budgets/**` | Planned |
| QUEUE, SUPPORT_TEAM, TICKET | `/api/csm/**` | Planned |
| INVITATION | `/api/core/**` invitation management | Planned |
| Teams (`team_permission_required`, not a `Permission` module) | `/api/teams/**` | **Active** |

States are two code constants, `LEGACY_ENFORCEMENT` and `RULE_TABLE_ENFORCEMENT`. There is no third state. Enabling a module later means assigning the required `RolePermission` rows to existing roles (separate change), then flipping that module's entry.

Active gate flow (unchanged): anonymous requests are skipped; superusers and valid level-2 org-admin roles bypass and, only when a gate applies, write an `AdminOverrideAudit` row; a user with no role at all is allowed (zero-role grace); a failing permission query fails open; otherwise a missing permission returns 403 `{"detail": "Permission denied"}`.

## 3. Route, module and action matrix

Paths are relative to the mount: Budget `api/budgets/` and `budgets/` (both mounts have every rule), CSM `api/csm/`, invitations `api/core/`, campaign siblings `api/`. All rows are planned unless marked.

| Module | Method | Route | Action |
|---|---|---|---|
| ASSET (active) | GET / POST, PUT / PATCH / DELETE | `/api/assets/**` | VIEW / EDIT / APPROVE / DELETE (legacy map; 4th segment `approve`/`export` overrides) |
| CAMPAIGN (active) | same | `/api/campaigns/**` | same legacy map |
| CAMPAIGN | GET | `campaign-templates/`, `campaign-templates/<id>/`, `campaign-{task,decision,calendar}-links/` | VIEW |
| CAMPAIGN | POST; PUT, PATCH | the collections; `campaign-templates/<id>/` and `.../create-campaign/` | EDIT |
| CAMPAIGN | DELETE | `campaign-templates/<id>/`, `campaign-task-links/<id>/` | DELETE |
| BUDGET_REQUEST | GET | `requests/`, `requests/<pk>/` | VIEW |
| BUDGET_REQUEST | POST, PATCH; POST | `requests/`, `requests/<pk>/`; `requests/<pk>/start-review/` | EDIT |
| BUDGET_REQUEST | PUT, PATCH | `requests/<pk>/decision/` | APPROVE |
| BUDGET_REQUEST | DELETE | `requests/<pk>/` | DELETE |
| BUDGET_POOL | GET / POST, PATCH / DELETE | `pools/`, `pools/<pk>/` | VIEW / EDIT / DELETE |
| BUDGET_ESCALATION | POST | `escalate/` | EDIT (anonymous webhook, see below) |
| QUEUE | GET | `queues/`, `queues/<pk>/`, `queues/<pk>/tickets/`, `queues/<pk>/ticket_counts/`, `projects/<id>/queues/` | VIEW |
| QUEUE | POST; PUT, PATCH; DELETE | `queues/`, `projects/<id>/queues/`; `queues/<pk>/`; `queues/<pk>/` | EDIT; EDIT; DELETE |
| SUPPORT_TEAM | GET / POST / DELETE | `queues/<id>/teams/`, `queues/<id>/agents/` (DELETE on `.../<pk>/`) | VIEW / EDIT / DELETE |
| TICKET | GET | `tickets/`, `tickets/<pk>/`, `ticket-forms/**`, `ticket-statuses/**`, `ticket-status-machine/` (reads) | VIEW |
| TICKET | POST, PATCH, PUT | tickets, `claim/`, `close/`, ticket-forms (incl. `set-default/`, `fields/`, `assignments/`), ticket-statuses, status-machine (incl. `auto-resolve/`) | EDIT |
| TICKET | DELETE | `ticket-forms/<pk>/`, `ticket-statuses/<pk>/` | DELETE |
| INVITATION | GET | `organizations/<id>/invitations/list/`, `projects/<id>/invitations/`, `.../pending-approval/` | VIEW |
| INVITATION | POST | `organizations/<id>/invitations/`, `invitations/<id>/resend/` | EDIT |
| INVITATION | DELETE | `organizations/<id>/invitations/<id>/` (revoke) | DELETE |
| INVITATION | POST, DELETE | `projects/<id>/invitations/<id>/approve/`, `.../reject/` | APPROVE (two outcomes of one decision) |

Routing decisions: queue teams/agents belong to `SUPPORT_TEAM` (who staffs a queue, not the queue itself); ticket forms, statuses and the status machine belong to `TICKET`; campaign templates and link resources belong to `CAMPAIGN`. Budget deletion also needs `EDIT` in the view's own permission class.

**Escalation webhook:** `POST escalate/` is anonymous and authenticated by the view (`X-Internal-Token` vs `INTERNAL_WEBHOOK_TOKEN`). The middleware never gates anonymous requests and never reads that header, so it is unaffected. The rule applies only to an authenticated caller (none exist in the repository).

**`EXEMPT_ROUTES`** classify routes that no `Permission` module covers: invitation self-service (`invitations/accept/`, `accept-organization/`, `pending/`, `projects/<id>/roles/`), `ad-channels`, and CSM admin or per-user resources (customer-users, notifications, conversations, templates, template-tags, support-projects, work-types, guidance, support-channels, sla-policy, business-hours-calendars, quality, the router root). This is a future-policy classification, not a runtime bypass: the middleware consults only `resolve_policy()`, planned routes are not enforced today, and unmapped routes are never gated. The route-completeness test requires every existing in-scope route to be mapped or classified; a route added later and listed in neither is simply not gated at runtime.

## 4. Teams fix and organization-wide Team management

`team_permission_required` previously switched to `public` before reading `TeamMember`, where those tenant-scoped rows do not exist, so a real Team Leader would have been rejected. It now queries under the request's current tenant schema and never searches other organizations.

**Organization admin (decision for this ticket):** a user with a valid, non-deleted Level-2 role whose `role.organization` is the user's current organization and which is not scoped to a Team (`UserRole.team IS NULL`, inside `valid_from`/`valid_to`). Implemented as `access_control.services.user_is_current_org_admin`. A generic `OrganizationMembership` "admin" label is not sufficient, and a Team-scoped, expired or other-organization role does not count. The Asset/Campaign middleware predicate `user_has_org_admin_bypass_role` is unchanged.

| Endpoint | Method | Required |
|---|---|---|
| `/api/teams/` | GET (`?search=`) | org admin or superuser (403 otherwise) |
| `/api/teams/` | POST | org admin or superuser |
| `/api/teams/<team_id>/` | DELETE | org admin or superuser (soft delete) |
| `/api/teams/<team_id>/` | GET | member of that team, org admin or superuser |
| `/api/teams/<team_id>/members/` | GET | member of that team, org admin or superuser |
| `/api/teams/<team_id>/members/` | POST | Team Leader, org admin or superuser |
| `/api/teams/<team_id>/members/<user_id>/` | PATCH, DELETE | Team Leader, org admin or superuser |

Outcomes: anonymous 401; non-member 403; ordinary member on a leader-only endpoint 403; leader of another team 403; non-admin on list/create/delete 403; superuser and org admin allowed without being a member; non-admin probing a nonexistent team 403, org admin or superuser 404.

**Frontend signal:** `/auth/me/` returns `can_manage_all_teams` (`access_control.services.user_can_manage_all_teams`): true for a superuser or a strict org admin as defined above, and only when the user has an organization. The Teams page shows list/search/create/delete and member controls from this flag (not from the broader `is_org_admin`), so the UI offers these actions only where the API accepts the caller.

**Tenant isolation:** the schema comes from the authenticated user's current organization, never from client input. Team lookups also filter by the caller's organization, and `POST /api/teams/` takes the organization from the caller, ignoring any `organization_id` in the body. An admin of another organization sees none of this organization's Teams.

**Deletion:** Teams use soft deletion (`is_deleted`, no migration). Deleting a Team hides it from lists, detail and member endpoints and from `/auth/me/teams/`. Memberships, user roles, assets and queue links are not removed. Child Teams are kept and their `parent` is set to null. The `(organization, name)` unique constraint still applies, so a deleted Team's name cannot be reused: creating a duplicate returns 409 `TEAM_NAME_TAKEN`.

**Adding members:** the target user must belong to the Team's organization (current organization, or an active `OrganizationMembership`), for Team Leaders and org admins alike; otherwise 400 `USER_NOT_IN_ORGANIZATION`.

**Behavior change, active in this PR:** these endpoints previously had no team-level check. A Bearer token proves authentication only, not that the caller is a member or Leader of the requested team. Valid members and Leaders keep the access in the table above (Team Member and Team Leader behavior is otherwise unchanged), and `teams/tests/test_views_authorization.py` covers that along with the rejected cases (pending execution of the new org-admin tests).

Left as is: no last-leader protection; Teams views remain plain Django views; member removal is a hard delete. Legacy observations, documented only and not changed here: `GET /api/access_control/teams/` lists Teams without a Team-level authorization check, and the user-role endpoints behind the Edit dialog's optional "User Roles" section (`/api/access_control/users/<id>/roles/`) use the default `AllowAny` DRF permission. The Team Role change itself goes through `PATCH /api/teams/<id>/members/<user_id>/`, which is covered by the org-admin check.

## 5. Rollout risk

Enabling a planned module can return **403 for existing users who hold at least one role but have no `RolePermission` row for the new module/action** (e.g. `QUEUE`, `SUPPORT_TEAM`, `TICKET`, `INVITATION`, Budget actions). Zero-role grace does not help them, and nothing in the repository seeds those permissions. That is why those modules are planned in this PR. Assigning permissions to existing roles must happen before any module is activated, in a separate change.

Questions for the teacher: (1) Should existing roles be granted the new permissions (separate seed or migration) before each module is activated, and who owns that list? (2) In what order should modules be activated? (3) Is a 403 for users with unrelated roles acceptable on activation, or must current access be preserved?

## 6. Future hardening (documented, not implemented)

Current behavior is kept and pinned by tests; closing these later is a deliberate change.

- **`.json` format suffix:** a router-served URL such as `/api/campaigns.json` or `/api/csm/queues.json` does not match the path patterns, so it is not gated (this includes the active legacy campaigns list). On detail routes the wildcard segment can absorb a suffix such as `9.json`; that is incidental, not policy.
- **`HEAD` as `GET`:** `HEAD` resolves to no action (legacy resolver and rule table alike), so it is not gated.
