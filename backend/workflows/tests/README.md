# NodeTypeDefinition Model Tests

## Test File Location

**File:** `backend/workflows/tests/test_node_type_definition.py`

## Test Scenarios Covered

### 1. Create NodeTypeDefinition via Shell
- ✅ Test creating a record with valid JSON schemas for input, output, and config
- ✅ Test creation with minimal required fields
- ✅ Test string representation

### 2. Validate Category Enum
- ✅ Test all valid category choices can be saved
- ✅ Test invalid category raises ValidationError
- ✅ Test category choices are enforced

### 3. Verify JSON Field Validation
- ✅ Test valid dict values for JSON fields
- ✅ Test empty dict is valid
- ✅ Test non-dict values raise ValidationError for:
  - `config_schema`
  - `input_schema`
  - `output_schema`
  - `default_config`
- ✅ Test `clean()` is called on `save()`

### 4. Filter by Category & Status
- ✅ Test filtering by category
- ✅ Test filtering by `is_active` status
- ✅ Test filtering by both category and `is_active` (uses index)
- ✅ Test database index exists on `(category, is_active)`

### 5. Assign Definition to WorkflowNode
- ✅ Test WorkflowNode can link to NodeTypeDefinition
- ✅ Test `node_type_definition` is optional (null=True, blank=True)
- ✅ Test cascade behavior (SET_NULL on delete)
- ✅ Test multiple nodes can reference same definition
- ✅ Test accessing node data through relationship

## Running the Tests

### Prerequisites

#### ⚠️ Database Migrations (Optional - Only Required When Running Tests)

**Migration is NOT required if you are:**
- ✅ Just writing/editing code
- ✅ Not running tests
- ✅ Not using database features
- ✅ Not starting Django server

**Migration IS required if you want to:**
- 🧪 Run the tests (tests need database tables)
- 🚀 Start Django development server
- 💾 Use Django Admin or database features
- 🏭 Deploy to production

**To generate and apply migrations (when needed):**

```bash
# Step 1: Generate migration file (creates 0002_xxx.py)
# Using Docker
docker compose -f docker-compose.dev.yml exec backend python manage.py makemigrations workflows

# Or locally (if virtual environment is activated)
python manage.py makemigrations workflows

# Step 2: Apply migration to database
# Using Docker
docker compose -f docker-compose.dev.yml exec backend python manage.py migrate workflows

# Or locally
python manage.py migrate workflows
```

**Note:** The `NodeTypeDefinition` model is already defined in `models.py`. The migration file will create the corresponding database table when applied.

### Running Tests

#### Option 1: Using Docker (Recommended)

```bash
# Run all NodeTypeDefinition tests
docker compose -f docker-compose.dev.yml exec backend pytest workflows/tests/test_node_type_definition.py -v

# Run with coverage
docker compose -f docker-compose.dev.yml exec backend pytest workflows/tests/test_node_type_definition.py -v --cov=workflows.models --cov-report=term-missing

# Run specific test class
docker compose -f docker-compose.dev.yml exec backend pytest workflows/tests/test_node_type_definition.py::TestNodeTypeDefinitionCreation -v

# Run specific test method
docker compose -f docker-compose.dev.yml exec backend pytest workflows/tests/test_node_type_definition.py::TestNodeTypeDefinitionCreation::test_create_node_type_definition_with_valid_schemas -v
```

#### Option 2: Local Execution (if virtual environment is set up)

```bash
cd backend

# Activate virtual environment (if using one)
source venv/bin/activate  # or your venv path

# Run tests
pytest workflows/tests/test_node_type_definition.py -v

# Run with coverage
pytest workflows/tests/test_node_type_definition.py -v --cov=workflows.models --cov-report=term-missing
```

#### Option 3: Using pytest directly

```bash
cd backend
pytest workflows/tests/test_node_type_definition.py -v --ds=backend.settings
```

## Expected Test Results

All 5 test scenarios should pass:

```
✅ TestNodeTypeDefinitionCreation (3 tests)
✅ TestNodeTypeDefinitionCategoryValidation (3 tests)
✅ TestNodeTypeDefinitionJSONValidation (7 tests)
✅ TestNodeTypeDefinitionFiltering (4 tests)
✅ TestWorkflowNodeAssignment (5 tests)

Total: 22 tests, all passing
```

## Test Dependencies

The tests use:
- `pytest` and `pytest-django` for test framework
- `django.test.TestCase` for Django test utilities
- `django.core.exceptions.ValidationError` for validation testing
- Models from `workflows.models` and `core.models`

## Notes

- Tests use `@pytest.mark.django_db` decorator to enable database access
- Tests create test data in `setUp()` methods where needed
- Database indexes are verified using raw SQL queries (PostgreSQL specific)
- All JSON field validations are tested through the `clean()` method

