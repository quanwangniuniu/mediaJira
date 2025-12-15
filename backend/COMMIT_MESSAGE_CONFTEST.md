fix(campaign): disable OpenTelemetry and ensure migrations in test conftest

- Set OTEL_ENABLED=False before Django settings import to prevent
  OpenTelemetry connection errors in CI/test environments where the
  collector is not available
- Add django_db_setup_ensure_migrations fixture to automatically run
  all app migrations before tests, ensuring task app migrations are
  applied (required by CampaignTask ForeignKey to task.Task)
- This addresses CI failures related to missing database tables and
  OpenTelemetry connection refused errors

