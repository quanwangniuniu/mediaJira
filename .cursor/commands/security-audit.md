# Security Audit

## Overview

Perform a security pass aligned with MediaJira standards: no secrets in repo or logs, authentication and CORS, input validation, least privilege, and frontend credential handling. Use for pre-release checks or when touching auth/sensitive code.

## Context

- Follow **.cursor/AGENTS.md** (Security section and Error handling conventions) and **.cursor/rules.md** (security and privacy).
- If the user added text after the command (e.g. a module or path), focus the audit on that scope.

## Steps

1. **Secrets and logging:** Confirm no `.env`, tokens, keys, or credentials are committed or logged. Search for accidental exposure of auth headers or sensitive data in logs.
2. **Dependencies:** Check for known vulnerabilities in backend and frontend dependencies. Update outdated or vulnerable packages.
3. **Backend:** Validate that all client input is validated and sanitized; treat client data as untrusted. Ensure permissions are enforced (auth and authorization early); default to deny. Use DRF ValidationError/PermissionDenied; do not expose stack traces or internals. Review CORS: allowed origins allowlisted in `backend/backend/settings.py`; no wildcards for production.
4. **Frontend:** Confirm credentials: only token (and minimal user/org context) stored; no passwords. Token sent only via the axios interceptor (`Authorization: Bearer`); components do not read or send tokens directly. API layer does not swallow errors; 401 handled by interceptor (clear storage, redirect to login).
5. **Infrastructure:** Review environment variables and access controls. Ensure production uses HTTPS for all traffic.

## Security Checklist

- [ ] No secrets in git or logs.
- [ ] Input validation on backend; least privilege for permissions.
- [ ] Auth: token-based; Bearer header; 401 triggers logout/redirect.
- [ ] CORS: allowlisted origins only; credentials configured correctly.
- [ ] Frontend: token storage and transmission per AGENTS.md; no password storage.
- [ ] Dependencies audited; no known high/critical vulnerabilities.
