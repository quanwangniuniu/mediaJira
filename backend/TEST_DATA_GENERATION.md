# Test Data Generation Guide

This guide explains how to add test data generation support for new models in the database seeding system.

## Overview

The `seed_database` management command generates realistic test data for development and testing. It uses a **manual, phase-based approach** where each model is explicitly listed in the seeding process.

**Important**: The command does **NOT** automatically discover new models. You need to manually add new models to the seeding process.

## Quick Start

Run the seed command:

```bash
docker compose -f docker-compose.dev.yml exec backend python manage.py seed_database
```

Options:
- `--clear`: Clear existing data before seeding
- `--count N`: Number of records per model (default: 50, range: 10-100)
- `--seed N`: Random seed for reproducibility (default: 42)

## Adding Support for New Models

When you create a new model, you have two options depending on the model's complexity:

### Option 1: Simple Models (Recommended for Quick Setup)

For simple models with basic fields and no complex business logic, use `model_bakery` directly:

1. **Edit** `core/management/commands/seed_database.py`
2. **Import** your model:
   ```python
   from model_bakery import baker
   from your_app.models import YourNewModel
   ```
3. **Add** a new phase in `_seed_data()` method:
   ```python
   # Phase X: Your New Models
   self.stdout.write('\nPhase X: Your New Models...')
   new_models = []
   for i in range(count):
       new_model = baker.make(YourNewModel)
       new_models.append(new_model)
   self.stdout.write(f'  ✓ Generated {len(new_models)} Your New Models')
   ```
4. **Consider dependencies**: Place the phase in the correct order (models with foreign keys should come after their dependencies)

### Option 2: Complex Models (For Realistic Data)

For models with complex business logic, JSON fields, or special validations, create a Factory:

1. **Generate Factory stub**:
   ```bash
   python manage.py generate_factory_stubs your_app.YourNewModel --complete --output
   ```

2. **Review and customize** the generated factory in `factories/your_app_factories.py`

3. **Edit** `core/management/commands/seed_database.py`:
   - Import the factory:
     ```python
     from factories.your_app_factories import YourNewModelFactory
     ```
   - Add to `_seed_data()`:
     ```python
     new_models = self._generate(YourNewModelFactory, count, 'Your New Models')
     ```

## Helper Tools

### Validate Factories

Check if factories are in sync with models:

```bash
python manage.py validate_factories
```

### Generate Factory Stubs

Automatically generate factory code for new models:

```bash
# Generate complete factory with all fields
python manage.py generate_factory_stubs your_app.YourNewModel --complete

# Generate only missing fields (for existing factories)
python manage.py generate_factory_stubs your_app.YourNewModel --based-on-validation

# Generate for all models with missing factories
python manage.py generate_factory_stubs --all
```

### Auto-Validation After Migrations

Enable automatic factory validation after migrations:

```bash
export FACTORY_AUTO_VALIDATE_AFTER_MIGRATE=true
export FACTORY_AUTO_GENERATE_STUBS=true
```

This will automatically check and update factories when you run migrations.

## Current Seeding Phases

The `seed_database` command generates data in the following order:

1. Core entities (Organizations, Permissions)
2. Users and Roles
3. Projects and Teams
4. Memberships
5. Ad Channels
6. Budget Pools
7. Tasks
8. Budget Requests
9. Assets
10. Asset Versions
11. Campaign Tasks (currently disabled - models don't exist)
12. Execution Logs (currently disabled)
13. Channel Configs (currently disabled)
14. ROI Alert Triggers (currently disabled)
15. Retrospectives
16. Insights
17. Campaign Metrics
18. Reports
19. Report Sections
20. Optimization Experiments
21. Scaling Actions
22. Optimizations
23. Comments and Relationships

## Best Practices

1. **Place models in the correct phase**: Consider foreign key dependencies
2. **Use Factory Boy for complex models**: Better control over data generation
3. **Use model_bakery for simple models**: Faster setup, auto-updates with model changes
4. **Validate after changes**: Run `validate_factories` after adding new models
5. **Test the seeding**: Run `seed_database` after adding new models to ensure it works

## Troubleshooting

### Factory fails with "missing field" error

The seed command will automatically fall back to `model_bakery`. To fix the factory:

1. Run validation: `python manage.py validate_factories`
2. Generate stub: `python manage.py generate_factory_stubs app.Model`
3. Update factory with new field

### Model not generating data

- Check if the model is added to `_seed_data()` method
- Verify the model is imported correctly
- Check for dependency issues (foreign keys to non-existent data)

## See Also

- [Factory System Documentation](factories/README.md) - Detailed guide on Factory Boy and model_bakery
- [Django Management Commands](https://docs.djangoproject.com/en/stable/ref/django-admin/) - Django command reference

