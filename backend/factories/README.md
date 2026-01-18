# Factory System Documentation

This package provides a hybrid factory system combining **Factory Boy** with **model_bakery** for database seeding and test data generation.

## Features

- **Factory Boy**: Explicit control for complex models with business logic
- **model_bakery**: Automatic field generation for simple models (auto-updates when models change)
- **Hybrid approach**: Falls back to model_bakery if Factory Boy fails
- **Validation**: Check if factories are in sync with models
- **Auto-registration**: All factories are automatically registered

## Usage

### Basic Usage

#### Option 1: Use Factory Boy (Explicit, Preferred for Complex Models)

```python
from factories.campaign_factories import CampaignTaskFactory

# Create instance
campaign = CampaignTaskFactory.create()

# Build instance (unsaved)
campaign = CampaignTaskFactory.build()

# Override fields
campaign = CampaignTaskFactory.create(title="Custom Title")
```

#### Option 2: Use model_bakery (Quick, Auto-Updates)

```python
from model_bakery import baker
from campaign.models import CampaignTask

# Create instance (auto-generates all fields)
campaign = baker.make(CampaignTask)

# Override specific fields
campaign = baker.make(CampaignTask, title="Custom Title")
```

#### Option 3: Use Hybrid Utility (Best of Both Worlds)

```python
from factories.utils import make_instance
from factories.campaign_factories import CampaignTaskFactory
from campaign.models import CampaignTask

# Tries Factory Boy first, falls back to model_bakery if factory fails
campaign = make_instance(CampaignTask, CampaignTaskFactory)

# Or use model_bakery directly
campaign = make_instance(CampaignTask)
```

### In Tests

```python
from django.test import TestCase
from factories.core_factories import CustomUserFactory
from model_bakery import baker
from campaign.models import CampaignTask

class MyTest(TestCase):
    def test_something(self):
        # Use factory for complex models
        user = CustomUserFactory.create()
        
        # Use model_bakery for quick data
        campaign = baker.make(CampaignTask, created_by=user)
        
        # Or use hybrid
        from factories.utils import make_instance
        campaign = make_instance(CampaignTask, CampaignTaskFactory, created_by=user)
```

## Management Commands

### Validate Factories

Check if all factories are in sync with their models:

```bash
python manage.py validate_factories
```

Output:
```
✓ OrganizationFactory (Organization): OK
⚠ CampaignTaskFactory (CampaignTask):
  ⚠ Missing required fields: new_field
  ⚠ New model fields not in factory: updated_at
```

### Generate Factory Stubs

Generate factory code stubs for new model fields:

```bash
# View stub in console (required fields only, optional fields commented)
python manage.py generate_factory_stubs campaign.CampaignTask

# Generate COMPLETE factory class with ALL fields (required + optional with mock data)
python manage.py generate_factory_stubs campaign.CampaignTask --complete

# Generate stubs only for missing fields (based on validation)
python manage.py generate_factory_stubs campaign.CampaignTask --based-on-validation

# Append to factory file
python manage.py generate_factory_stubs campaign.CampaignTask --output

# Generate complete factory for all factories
python manage.py generate_factory_stubs campaign.CampaignTask --complete --output

# Generate stubs for ALL factories with missing fields
python manage.py generate_factory_stubs --all

# Specify output file
python manage.py generate_factory_stubs campaign.CampaignTask --file factories/campaign_factories.py
```

**Key Differences:**

1. **Default mode** (`generate_factory_stubs model.Model`): 
   - Generates required fields with mock data
   - Optional fields are commented out (you uncomment manually)
   
2. **Complete mode** (`--complete`):
   - Generates **COMPLETE factory class** with **ALL fields** (required + optional)
   - All fields have mock data generation (using Faker)
   - Ready to use immediately!

3. **Validation-based** (`--based-on-validation`):
   - Only generates **missing fields** (for existing factories)
   - More targeted - only adds what's missing

### Seed Database (Hybrid Approach)

The seed command now uses model_bakery as fallback:

```bash
python manage.py seed_database --clear
```

If a factory fails (e.g., missing new field), it automatically falls back to model_bakery and shows a warning.

## When to Use What

### Use Factory Boy When:
- Model has complex business logic (JSON fields, choice validations)
- You need realistic, structured test data
- Model has complex relationships
- You want explicit control over data generation

**Example**: `CampaignTaskFactory` - generates realistic campaign configs with proper JSON structures

### Use model_bakery When:
- Model is simple (few fields, no complex logic)
- You just need "any valid data"
- Model changes frequently and you want auto-updates
- Quick prototyping or testing

**Example**: `PermissionFactory` - simple model, could use model_bakery

## Validation Workflow

After model migrations:

1. **Validate factories**:
   ```bash
   python manage.py validate_factories
   ```

2. **If issues found, generate stubs automatically**:
   ```bash
   # Option A: Auto-generate during validation
   python manage.py validate_factories --auto-generate-stubs
   
   # Option B: Generate stubs only for missing fields (recommended)
   python manage.py generate_factory_stubs campaign.CampaignTask --based-on-validation
   
   # Option C: Generate stubs for all factories with missing fields
   python manage.py generate_factory_stubs --all
   ```

3. **Update factory** with generated stubs (review and customize)

4. **Re-validate**:
   ```bash
   python manage.py validate_factories
   ```

## Automatic Factory Updates

Factory classes can be automatically validated and updated when models change. Choose the method that works best for your workflow:

### Method 1: Combined Command (Recommended)

Use the combined command that runs `makemigrations` and validates factories:

```bash
# Run makemigrations and validate factories
python manage.py makemigrations_and_validate

# Auto-generate stubs if factories are out of sync
python manage.py makemigrations_and_validate --auto-generate-stubs
```

**Benefits:**
- ✅ Single command for both operations
- ✅ Catches factory issues immediately after creating migrations
- ✅ Optional auto-generation of stubs

### Method 2: Post-Migration Signal (Automatic)

Enable automatic validation after every migration using Django signals:

1. **Enable in environment or settings:**
   ```bash
   export FACTORY_AUTO_VALIDATE_AFTER_MIGRATE=true
   # Optional: also auto-generate stubs
   export FACTORY_AUTO_GENERATE_STUBS=true
   ```

2. **The signal is already registered** in `core/apps.py` (enabled via env var)

**Benefits:**
- ✅ Fully automatic - no manual steps needed
- ✅ Runs after every migration
- ✅ Non-blocking (won't break migrations if validation fails)

**Note:** Only runs if `FACTORY_AUTO_VALIDATE_AFTER_MIGRATE=true` is set.

### Method 3: Git Pre-Commit Hook

Validate factories before committing to catch issues early:

```bash
# Install pre-commit hook
cp .githooks/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

Or set hooks directory globally:
```bash
git config core.hooksPath .githooks
```

**Benefits:**
- ✅ Prevents committing code with out-of-sync factories
- ✅ Catches issues before they reach the repository
- ✅ Can be bypassed with `--no-verify` if needed

### Method 4: CI/CD Integration

Add factory validation to your CI pipeline:

```yaml
# .github/workflows/ci.yml or similar
- name: Validate factories
  run: |
    python manage.py migrate
    python manage.py validate_factories
```

**Benefits:**
- ✅ Validates factories in CI/CD pipeline
- ✅ Catches issues before merging to main
- ✅ Can fail the build if factories are invalid

## Factory Registry

All factories are automatically registered. Access the registry:

```python
from factories.registry import (
    get_factory,
    get_all_registered_models,
    FACTORY_REGISTRY
)

# Get factory for a model
from campaign.models import CampaignTask
factory = get_factory(CampaignTask)

# Get all registered models
models = get_all_registered_models()
```

## Utilities

### make_instance()

Hybrid factory function that tries Factory Boy first, falls back to model_bakery:

```python
from factories.utils import make_instance
from factories.core_factories import CustomUserFactory
from core.models import CustomUser

user = make_instance(CustomUser, CustomUserFactory, email='test@example.com')
```

### prepare_instance()

Same as `make_instance()` but returns unsaved instance:

```python
from factories.utils import prepare_instance

user = prepare_instance(CustomUser, CustomUserFactory)
user.email = 'custom@example.com'
user.save()
```

### validate_factory()

Validate a single factory:

```python
from factories.validators import validate_factory
from factories.campaign_factories import CampaignTaskFactory
from campaign.models import CampaignTask

is_valid, warnings, field_info = validate_factory(CampaignTaskFactory, CampaignTask)
if not is_valid:
    for warning in warnings:
        print(warning)
    
    # Get missing fields
    missing_required = field_info.get('missing_required', [])
    missing_optional = field_info.get('missing_optional', [])
    print(f"Missing required: {[f['name'] for f in missing_required]}")
```

### validate_all_factories()

Validate all factories:

```python
from factories.validators import validate_all_factories

results = validate_all_factories()
for factory_name, result in results.items():
    if not result['valid']:
        print(f"{factory_name}: {result['warnings']}")
```

## Benefits

1. **Auto-updates**: model_bakery handles new fields automatically
2. **Control**: Factory Boy for complex models with business logic
3. **Validation**: Catch factory issues before they break tests
4. **Fallback**: If factory fails, model_bakery takes over
5. **Best of both**: Use the right tool for each case

## Migration Strategy

1. ✅ Keep existing factories (they work)
2. ✅ Add model_bakery for simple cases
3. ✅ Add validation to catch issues
4. 🔄 Gradually migrate simple models to model_bakery
5. ✅ Keep Factory Boy for complex models (campaign, asset, etc.)

## Examples

### Example 1: Complex Model (Use Factory Boy)

```python
# campaign/models.py
class CampaignTask(models.Model):
    title = models.CharField(max_length=200)
    audience_config = models.JSONField()  # Complex structure
    external_ids_json = models.JSONField()  # Complex structure
    
# factories/campaign_factories.py
class CampaignTaskFactory(DjangoModelFactory):
    audience_config = factory.LazyAttribute(
        lambda obj: {
            'type': 'interest',
            'age_min': 18,
            'locations': ['US', 'CA']
        }
    )
```

### Example 2: Simple Model (Could Use model_bakery)

```python
# core/models.py
class Permission(models.Model):
    module = models.CharField(max_length=50)
    action = models.CharField(max_length=50)

# Can use model_bakery directly:
from model_bakery import baker
permission = baker.make(Permission)
```

## Troubleshooting

### Factory fails with "missing field" error

**Solution**: The seed command will automatically fall back to model_bakery. To fix the factory:

1. Run validation: `python manage.py validate_factories`
2. Generate stub: `python manage.py generate_factory_stubs app.Model`
3. Update factory with new field

### Factory generates invalid data

**Solution**: Review factory field definitions. Use `validate_factory()` to check for issues.

### model_bakery generates unrealistic data

**Solution**: Use Factory Boy for that model, or customize model_bakery recipes.

## See Also

- [Factory Boy Documentation](https://factoryboy.readthedocs.io/)
- [model_bakery Documentation](https://model-bakery.readthedocs.io/)
- Django management commands: `validate_factories`, `generate_factory_stubs`, `seed_database`
