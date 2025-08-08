# Budget Approval Test Suite

This directory contains comprehensive tests for the Budget Approval microservice, covering all major functionality including unit tests, integration tests, concurrency tests, and edge case simulations.

## Test Structure

```
budget_approval/tests/
├── __init__.py                      # Test package initialization
├── conftest.py                      # Pytest fixtures and configuration
├── test_unit_fsm.py                 # Unit tests for FSM state transitions
├── test_unit_amount_validation.py   # Unit tests for amount validation and decimal precision
├── test_integration.py              # Integration tests (3-user approval chain, etc.)
├── test_concurrency.py              # Concurrency tests (race conditions)
├── test_escalation.py               # Escalation trigger and task tests
├── test_views.py                    # API endpoint tests
├── test_permissions.py              # Permission and access control tests
└── README.md                        # This file
```

## Test Categories

### 1. Unit Tests

#### FSM Tests (`test_unit_fsm.py`)

- **State Transitions**: Test all FSM transitions (DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED/REJECTED → LOCKED)
- **Transition Validation**: Test valid and invalid state changes
- **Model State Methods**: Test `can_submit()`, `can_approve()`, `can_lock()`, etc.

#### Amount Validation Tests (`test_unit_amount_validation.py`)

- **Decimal Precision**: Test currency amount handling with proper precision
- **Amount Validation**: Test minimum/maximum amount constraints
- **Rounding Logic**: Test decimal rounding behavior
- **Budget Pool Calculations**: Test `available_amount` and budget deduction logic

### 2. Integration Tests (`test_integration.py`)

- **3-User Approval Chain**: Complete multi-step approval workflow
- **Rejection & Resubmission**: Test rejected request revision and resubmission
- **Pool Underflow Detection**: Test budget pool overflow scenarios during submit and lock phases
- **Service Layer Integration**: Test business logic services end-to-end
- **Budget Validation**: Test budget availability checks across the entire workflow

### 3. Concurrency Tests (`test_concurrency.py`)

- **Concurrent Submissions**: Multiple users submitting to same pool simultaneously
- **Concurrent Approvals**: Multiple approvers trying to approve same request
- **Concurrent Lock Operations**: Race conditions during budget request locking
- **Race Condition Handling**: Test data integrity under concurrent operations with `select_for_update()`

### 4. Escalation Tests (`test_escalation.py`)

- **Escalation Triggers**: Test threshold-based escalation logic
- **Escalation Tasks**: Test Celery task execution and mocking
- **Notification System**: Test escalation notification delivery
- **Webhook Integration**: Test internal webhook authentication for escalations

### 5. API Tests (`test_views.py`)

- **Budget Request Endpoints**: CRUD operations for budget requests
- **Approval Endpoints**: Decision making and approval workflows (`BudgetRequestDecisionView`)
- **Budget Pool Endpoints**: Pool management operations
- **Escalation Endpoints**: Escalation trigger API (`BudgetEscalationView`)
- **Status Code Validation**: Test proper HTTP status codes for different scenarios

### 6. Permission Tests (`test_permissions.py`)

- **RBAC Permissions**: Test role-based access control with organization boundaries
- **Super Admin Bypass**: Test that super admins bypass all permission checks
- **Cross-Organization Access**: Test denial of access across different organizations
- **Object-Level Permissions**: Test permissions for specific budget requests and pools
- **Webhook Permissions**: Test internal webhook token validation

## Running Tests

### Prerequisites

```bash
# Install test dependencies
pip install pytest pytest-django pytest-cov freezegun pytest-asyncio pytest-mock

# Run migrations
python manage.py migrate
```

### Quick Start

```bash
# Run all tests
./run_tests.sh

# Or run with pytest directly
pytest budget_approval/tests/ -v
```

### Running Specific Test Categories

```bash
# FSM unit tests
pytest budget_approval/tests/test_unit_fsm.py -v

# Amount validation unit tests
pytest budget_approval/tests/test_unit_amount_validation.py -v

# Integration tests only
pytest budget_approval/tests/test_integration.py -v

# Concurrency tests only
pytest budget_approval/tests/test_concurrency.py -v

# Escalation tests only
pytest budget_approval/tests/test_escalation.py -v

# API tests only
pytest budget_approval/tests/test_views.py -v

# Permission tests only
pytest budget_approval/tests/test_permissions.py -v
```

### Running with Markers

```bash
# Run unit tests
pytest -m unit

# Run integration tests
pytest -m integration

# Run concurrency tests
pytest -m concurrency

# Run escalation tests
pytest -m escalation

# Run permission tests
pytest -m permissions

# Run API tests
pytest -m api
```

### Coverage Reports

```bash
# Generate coverage report
pytest budget_approval/tests/ --cov=budget_approval --cov-report=html --cov-report=json

# View coverage in browser
open htmlcov/index.html
```

## Test Fixtures

The `conftest.py` file provides reusable fixtures:

- **Users**: `user1`, `user2`, `user3`, `superuser` - Test users with different roles and permissions
- **Organizations**: `organization`, `different_organization` - For testing cross-organization access
- **Projects**: `project`, `task`, `ad_channel`, `different_project`, `different_task`, `different_ad_channel` - Core entities
- **Budget**: `budget_pool`, `budget_request_draft`, `budget_request_submitted`, `budget_request_under_review`, `different_budget_pool`, `budget_request_different_org`
- **Access Control**: `role`, `user_role1`, `user_role2`, `user_role3` - RBAC setup
- **Teams**: `team` - Team-based access control
- **Escalation**: `escalation_rule` - Escalation configuration
- **API Client**: `api_client` - Authenticated DRF test client
- **Time**: `frozen_time` - Frozen time for consistent testing

## Test Configuration

### Pytest Configuration (`pytest.ini`)

- Django settings configuration
- Coverage settings (80% minimum)
- Test discovery patterns
- Warning filters

### Coverage Requirements

- **Target**: 80% minimum coverage
- **Reports**: HTML, JSON, and terminal output
- **Coverage**: All budget_approval modules

## Test Data

Tests use isolated test data that is:

- Created fresh for each test
- Cleaned up automatically
- Not affecting production data
- Representative of real-world scenarios

## Mocking Strategy

- **Celery Tasks**: `trigger_escalation` task is mocked to prevent Redis connection issues in tests
- **External Services**: Slack notifications and webhooks are mocked
- **Time**: `freezegun` for time-sensitive tests
- **HTTP Headers**: Mock objects for testing webhook authentication
- **Async Operations**: `pytest-asyncio` for async tests
- **Database**: Django test database with transactions and `select_for_update()` for concurrency testing

## Edge Cases Covered

1. **Budget Pool Underflow**: When requests exceed available budget (tested at both submit and lock phases)
2. **Concurrent Operations**: Race conditions in approval workflows with proper database locking
3. **Invalid State Transitions**: Attempting invalid FSM transitions
4. **Permission Violations**: Unauthorized access attempts, cross-organization access denial
5. **Super Admin Bypass**: Testing that super admins can bypass all permission and business logic restrictions
6. **Escalation Edge Cases**: Multiple rules, inactive rules, currency mismatches, webhook authentication
7. **Decimal Precision**: Handling currency amounts with proper precision
8. **Stale Object References**: Ensuring tests use fresh object instances after database operations
9. **Service Layer Validation**: Testing that business logic prevents invalid operations regardless of permissions

## Continuous Integration

The test suite is designed to run in CI environments:

- Fast execution (< 30 seconds for full suite)
- Deterministic results
- Clear error reporting
- Coverage reporting
- JSON output for CI tools

## Troubleshooting

### Common Issues

1. **Database Errors**: Ensure migrations are up to date
2. **Import Errors**: Check that all dependencies are installed
3. **Permission Errors**: Ensure test database has proper permissions
4. **Timeout Errors**: Increase timeout for slow tests

### Debug Mode

```bash
# Run with debug output
pytest budget_approval/tests/ -v -s --tb=long

# Run single test with debug
pytest budget_approval/tests/test_models.py::TestBudgetRequestFSM::test_draft_to_submitted_transition -v -s
```

## Test Reports

After running tests, you'll find:

- **Coverage Report**: `htmlcov/index.html`
- **JSON Report**: `benchmarks/budget_approval.json`
- **Coverage Data**: `coverage.json`

These reports can be submitted to Jira comments and Confluence pages as required by the ticket.

## Contributing

When adding new tests:

1. Follow the existing naming conventions
2. Use appropriate fixtures from `conftest.py`
3. Add proper docstrings and comments
4. Ensure tests are isolated and repeatable
5. Update this README if adding new test categories
