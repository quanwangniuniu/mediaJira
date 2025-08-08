#!/bin/bash

# Budget Approval Test Runner
# This script runs the comprehensive test suite for the budget approval system

set -e

echo "🧪 Starting Budget Approval Test Suite..."
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "manage.py" ]; then
    print_error "Please run this script from the backend directory"
    exit 1
fi

# Check if virtual environment is activated
if [ -z "$VIRTUAL_ENV" ]; then
    print_warning "Virtual environment not detected. Make sure dependencies are installed."
fi

# Install test dependencies if needed
print_status "Checking test dependencies..."
pip install pytest pytest-django pytest-cov freezegun pytest-asyncio pytest-mock

# Run database migrations
print_status "Running database migrations..."
python manage.py migrate

# Create test database
print_status "Setting up test database..."
python manage.py collectstatic --noinput

# Run tests with different configurations
echo ""
print_status "Running Unit Tests..."
pytest budget_approval/tests/test_models.py -v --tb=short --cov=budget_approval.models --cov-report=term-missing

echo ""
print_status "Running Integration Tests..."
pytest budget_approval/tests/test_integration.py -v --tb=short --cov=budget_approval.services --cov-report=term-missing

echo ""
print_status "Running Concurrency Tests..."
pytest budget_approval/tests/test_concurrency.py -v --tb=short --cov=budget_approval.services --cov-report=term-missing

echo ""
print_status "Running Escalation Tests..."
pytest budget_approval/tests/test_escalation.py -v --tb=short --cov=budget_approval.tasks --cov-report=term-missing

echo ""
print_status "Running API Tests..."
pytest budget_approval/tests/test_views.py -v --tb=short --cov=budget_approval.views --cov-report=term-missing

echo ""
print_status "Running Permission Tests..."
pytest budget_approval/tests/test_permissions.py -v --tb=short --cov=budget_approval.permissions --cov-report=term-missing

echo ""
print_status "Running Complete Test Suite with Coverage..."
pytest budget_approval/tests/ -v --tb=short --cov=budget_approval --cov-report=html:htmlcov --cov-report=json:coverage.json --cov-report=term-missing --cov-fail-under=80

# Generate test report
echo ""
print_status "Generating test report..."

# Create benchmarks directory if it doesn't exist
mkdir -p benchmarks

# Generate JSON report for Jira/Confluence
cat > benchmarks/budget_approval.json << EOF
{
  "test_suite": "Budget Approval System",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "test_results": {
    "unit_tests": {
      "models": "Completed",
      "fsm_transitions": "Completed",
      "budget_validation": "Completed"
    },
    "integration_tests": {
      "three_user_approval_chain": "Completed",
      "rejection_resubmission_flow": "Completed",
      "pool_underflow_detection": "Completed"
    },
    "concurrency_tests": {
      "concurrent_submissions": "Completed",
      "concurrent_approvals": "Completed",
      "race_condition_handling": "Completed"
    },
    "escalation_tests": {
      "escalation_trigger": "Completed",
      "escalation_task": "Completed",
      "notification_system": "Completed"
    },
    "api_tests": {
      "budget_request_endpoints": "Completed",
      "budget_pool_endpoints": "Completed",
      "escalation_rule_endpoints": "Completed"
    },
    "permission_tests": {
      "access_control": "Completed",
      "approval_permissions": "Completed",
      "team_based_permissions": "Completed"
    }
  },
  "coverage": {
    "target": 80,
    "actual": "See coverage.json for details"
  },
  "test_framework": {
    "pytest": "Used",
    "pytest_django": "Used",
    "freezegun": "Used",
    "pytest_asyncio": "Used"
  },
  "notes": "Comprehensive test suite covering all major functionality of the budget approval system"
}
EOF

print_success "Test report generated: benchmarks/budget_approval.json"

# Show coverage summary
if [ -f "coverage.json" ]; then
    echo ""
    print_status "Coverage Summary:"
    python -c "
import json
with open('coverage.json', 'r') as f:
    data = json.load(f)
    for file, coverage in data['files'].items():
        if 'budget_approval' in file:
            percent = coverage['summary']['percent_covered']
            print(f'  {file}: {percent:.1f}%')
"
fi

echo ""
print_success "🎉 Budget Approval Test Suite completed successfully!"
echo ""
print_status "Test artifacts:"
echo "  - Coverage report: htmlcov/index.html"
echo "  - JSON report: benchmarks/budget_approval.json"
echo "  - Coverage data: coverage.json"
echo ""
print_status "To view detailed coverage report: open htmlcov/index.html in your browser" 