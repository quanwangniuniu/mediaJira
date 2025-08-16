# Retrospective Engine

A comprehensive retrospective analysis system for campaign performance evaluation with KPI storage, rule-based insight generation, and automated reporting.

## Features

### Core Functionality
- **Retrospective Task Management**: Automated creation and tracking of retrospective tasks for completed campaigns
- **Multi-Source KPI Storage**: Support for KPI data from Google Ads, Facebook, TikTok, and internal sources
- **Rule-Based Insight Generation**: Configurable rules for automatic insight generation based on KPI thresholds
- **Report Generation**: Automated PDF report generation with comprehensive analysis
- **Approval Workflow**: Role-based approval system for retrospective reports

### Technical Features
- **Celery Integration**: Background task processing for retrospective generation and analysis
- **REST API**: Comprehensive API endpoints for all retrospective operations
- **Admin Interface**: Rich Django admin interface with data visualization
- **Permission System**: Integration with existing access_control system
- **Mock Data Generation**: Management commands for testing and demonstration

## Architecture

### Models
- **RetrospectiveTask**: Main retrospective entity with status tracking and approval workflow
- **CampaignKPI**: Multi-source KPI data storage with performance calculations
- **Insight**: Rule-generated and manual insights with severity levels and action suggestions

### Services
- **RetrospectiveService**: Business logic for retrospective operations
- **InsightRules**: Pure rule logic for insight generation (separated from business logic)
- **RetrospectiveUtils**: Generic utility functions for data transformation and file handling

### API Endpoints
- `/retrospective/api/retrospectives/` - Retrospective task CRUD operations
- `/retrospective/api/kpis/` - KPI data management
- `/retrospective/api/insights/` - Insight generation and management
- `/retrospective/api/rules/` - Rule engine operations

## Installation

### Dependencies
```bash
# Core dependencies
celery==5.3.4
redis==5.0.1
pytz==2023.3
python-dateutil==2.8.2

# Report generation (PDF only initially)
reportlab==4.0.7

# WebSocket (Phase 2 - Optional)
channels==4.0.0
channels-redis==4.1.0
daphne==4.0.0
websockets==12.0
```

### Setup
1. Add 'retrospective' to INSTALLED_APPS in settings.py
2. Run migrations: `python manage.py makemigrations retrospective`
3. Apply migrations: `python manage.py migrate`
4. Configure Celery (see Celery Configuration section)

## Usage

### Creating a Retrospective
```python
from retrospective.services import RetrospectiveService
from retrospective.models import RetrospectiveTask

# Create retrospective for completed campaign
retrospective = RetrospectiveService.create_retrospective_for_campaign(
    campaign_id='campaign-uuid',
    created_by=user
)
```

### Generating Insights
```python
from retrospective.services import RetrospectiveService

# Generate insights using rule engine
insights = RetrospectiveService.generate_insights_batch(
    retrospective_id='retrospective-uuid',
    user=user
)
```

### Using the Rule Engine
```python
from retrospective.rules import InsightRules

# Check ROI threshold
result = InsightRules.check_roi_threshold(0.65)
# Returns: {'triggered': True, 'severity': 'high', 'insight_type': 'Poor ROI', ...}
```

### API Usage
```bash
# Create retrospective
POST /retrospective/api/retrospectives/
{
    "campaign": "campaign-uuid"
}

# Generate insights
POST /retrospective/api/insights/generate_insights/
{
    "retrospective_id": "retrospective-uuid",
    "regenerate": false
}

# Get retrospective summary
GET /retrospective/api/retrospectives/{id}/summary/
```

## Rule Engine

### Available Rules
- **ROI Thresholds**: Poor ROI (< 0.7), Critical ROI (< 0.5)
- **CTR Threshold**: Low Click-Through Rate (< 0.5%)
- **CPC Threshold**: High Cost Per Click (> $2.00)
- **Budget Utilization**: Overspend (> 110%)
- **Conversion Rate**: Low conversion rate (< 2%)
- **Impression Share**: Low impression share (< 50%)

### Adding Custom Rules
```python
# In rules.py
class InsightRules:
    RULE_DEFINITIONS = {
        'custom_rule': {
            'name': 'Custom Rule',
            'description': 'Custom rule description',
            'severity': 'medium',
            'threshold': 0.5,
            'metric': 'CUSTOM_METRIC',
            'condition': 'less_than',
            'suggested_actions': ['Action 1', 'Action 2']
        }
    }
    
    @staticmethod
    def check_custom_rule(kpi_value: float, threshold: float = 0.5) -> Dict[str, Any]:
        # Custom rule logic
        pass
```

## Celery Tasks

### Available Tasks
- `generate_retrospective`: Main task for retrospective generation
- `generate_mock_kpi_data`: Generate mock KPI data for testing
- `generate_insights_for_retrospective`: Generate insights using rule engine
- `generate_report_for_retrospective`: Generate PDF reports
- `cleanup_old_retrospectives`: Clean up old retrospective data
- `update_kpi_data_from_external_sources`: Update KPI data from external APIs

### Task Usage
```python
from retrospective.tasks import generate_retrospective

# Start retrospective generation
task = generate_retrospective.delay(
    campaign_id='campaign-uuid',
    created_by_id='user-uuid'
)

# Check task status
result = task.get(timeout=60)
```

## Management Commands

### Generate Mock Data
```bash
# Generate 5 retrospectives with mock data
python manage.py generate_mock_retrospectives --count 5

# Generate for specific user
python manage.py generate_mock_retrospectives --user admin --count 10

# Clear existing data and generate new
python manage.py generate_mock_retrospectives --clear --count 3
```

## Testing

### Running Tests
```bash
# Run all retrospective tests
python manage.py test retrospective

# Run specific test file
python manage.py test retrospective.tests.test_models

# Run with coverage
coverage run --source='retrospective' manage.py test retrospective
coverage report
```

### Test Structure
- `test_models.py`: Model validation and business logic tests
- `test_views.py`: API endpoint tests
- `test_tasks.py`: Celery task tests
- `test_rules.py`: Rule engine tests
- `test_services.py`: Service layer tests

## Admin Interface

### Features
- **RetrospectiveTask**: Status tracking, duration calculation, KPI/insight counts
- **CampaignKPI**: Color-coded performance indicators, source tracking
- **Insight**: Severity-based color coding, generation method icons

### Access
Navigate to `/admin/retrospective/` to access the admin interface.

## API Documentation

### Authentication
All API endpoints require authentication. Use JWT tokens or session authentication.

### Permissions
- **Data Analyst**: Can edit insights and view KPI data
- **TL/Org Admin**: Can approve retrospective reports
- **Regular Users**: Can view their own retrospectives

### Rate Limiting
API endpoints are rate-limited to prevent abuse. Contact administrators for increased limits.

## Configuration

### Environment Variables
```bash
# Celery Configuration
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/0

# Redis Configuration
REDIS_URL=redis://redis:6379/0

# WebSocket Configuration (Phase 2)
CHANNEL_LAYERS_BACKEND=channels_redis.core.RedisChannelLayer
```

### Settings Configuration
```python
# settings.py

# Retrospective-specific settings
RETROSPECTIVE_SETTINGS = {
    'DEFAULT_RETROSPECTIVE_DURATION_DAYS': 30,
    'MAX_KPI_DATA_POINTS': 1000,
    'INSIGHT_GENERATION_TIMEOUT': 300,  # seconds
    'REPORT_GENERATION_TIMEOUT': 600,   # seconds
}

# Celery Configuration
CELERY_BROKER_URL = config('CELERY_BROKER_URL', default='redis://localhost:6379/0')
CELERY_RESULT_BACKEND = config('CELERY_RESULT_BACKEND', default='redis://localhost:6379/0')
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TIMEZONE = 'UTC'
CELERY_ENABLE_UTC = True
```

## Deployment

### Docker Configuration
```yaml
# docker-compose.yml
services:
  celery:
    build: ./backend
    command: celery -A backend worker -l info
    environment:
      - CELERY_BROKER_URL=redis://redis:6379/0
    depends_on:
      - redis
      - db

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

### Production Considerations
- **Database Indexing**: Ensure proper indexes on frequently queried fields
- **Caching**: Implement Redis caching for KPI aggregation
- **Monitoring**: Set up monitoring for Celery tasks and API performance
- **Backup**: Regular backups of retrospective data
- **Security**: Implement proper authentication and authorization

## Troubleshooting

### Common Issues

1. **Celery Tasks Not Running**
   - Check Redis connection
   - Verify Celery worker is running
   - Check task queue status

2. **KPI Data Not Loading**
   - Verify external API credentials
   - Check network connectivity
   - Review API rate limits

3. **Insight Generation Failing**
   - Check rule definitions
   - Verify KPI data format
   - Review rule thresholds

4. **Report Generation Issues**
   - Check file permissions
   - Verify storage configuration
   - Review PDF generation dependencies

### Debug Commands
```bash
# Check Celery status
celery -A backend status

# Monitor Celery tasks
celery -A backend monitor

# Check Redis connection
redis-cli ping

# Test retrospective generation
python manage.py shell
>>> from retrospective.tasks import generate_mock_kpi_data
>>> result = generate_mock_kpi_data('test-retrospective-id')
```

## Contributing

### Development Setup
1. Clone the repository
2. Install dependencies: `pip install -r requirements.txt`
3. Run migrations: `python manage.py migrate`
4. Start development server: `python manage.py runserver`
5. Start Celery worker: `celery -A backend worker -l info`

### Code Style
- Follow PEP 8 guidelines
- Use type hints for function parameters
- Write comprehensive docstrings
- Include unit tests for new features

### Testing Guidelines
- Write tests for all new functionality
- Maintain test coverage above 80%
- Use meaningful test names
- Mock external dependencies

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the troubleshooting section above 