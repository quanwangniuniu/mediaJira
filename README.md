# MediaJira

> **The best media buyer Jira platform in the world**  
> MediaJira is a campaign management platform tailored for media buying teams. It streamlines the process of creating, tracking, and optimizing advertising campaigns, while providing collaboration tools, performance analytics, budget control, and professional API access.

---

## ✨ Features

- **Campaign Management**  
  Create, track, and optimize advertising campaigns with detailed performance metrics and lifecycle state management.

- **Task Management**  
  Comprehensive task tracking with assignments, status updates, and workflow automation.

- **Team Collaboration**  
  Assign roles and permissions for seamless teamwork with real-time chat and notifications.

- **Real-time Chat**  
  WebSocket-based messaging system for team communication and collaboration.

- **Calendar Integration**  
  Google Calendar-style event management with recurring events, reminders, and sharing capabilities.

- **Decision Tracking**  
  Track and document important decisions with approval workflows.

- **Workflow Automation**  
  Visual workflow builder with automation canvas for process optimization.

- **Performance Tracking**  
  Monitor impressions, clicks, conversions, and costs in real time with analytics and reporting.

- **Budget Tracking & Alerts**  
  Track budget usage and receive alerts when limits are exceeded with approval workflows.

- **Multi-Platform Integration**  
  Integrate with Facebook Meta, Google Ads, TikTok, Klaviyo, Mailchimp, and other advertising platforms.

- **Asset Management**  
  Upload, organize, and manage creative assets with virus scanning and version control.

- **Spreadsheet Functionality**  
  Advanced spreadsheet features with formula engine and data manipulation.

- **Professional API Access**  
  Integrate with third-party systems via a fully documented REST API with OpenAPI specifications.

---

## 🛠 Tech Stack

**Frontend**  
- Next.js 14  
- React 18  
- TypeScript  
- Tailwind CSS  
- Radix UI (component library)  
- Zustand (state management)  
- Axios (API requests)  
- Pino (structured logging)  
- OpenTelemetry (distributed tracing)  
- KafkaJS (event streaming)  
- Storybook (component development)  

**Backend**  
- Django 4.2  
- Django REST Framework  
- Django Channels (WebSocket support)  
- Celery (background tasks)  
- PostgreSQL  
- Redis (caching & message broker)  
- OpenTelemetry (distributed tracing)  
- Kafka Python (event streaming)  
- Pino (structured logging)  

**Infrastructure**  
- Docker & Docker Compose  
- Nginx (reverse proxy)  
- Redis (caching / async tasks)  
- ClamAV (file scanning)  
- Kafka (event streaming)  
- Celery Workers (background processing)  
- Prometheus (metrics collection)  
- Grafana (metrics visualization)  
- Jaeger (distributed tracing)  
- ELK Stack (Elasticsearch, Filebeat, Kibana for logging)  
- InfluxDB (time-series database for metrics)  
- SonarQube (code quality analysis)  
- GitHub Actions (CI/CD)  

**Testing**  
- Jest (frontend unit testing)  
- pytest (backend testing)  
- Storybook (component testing)  
- K6 (load testing)  
- Testing Library (React component testing)  

---

## 📂 Repository Structure

```
.
├── backend/                  # Django backend source code
│   ├── campaigns/            # Campaign management app
│   ├── task/                 # Task management app
│   ├── chat/                 # Real-time chat app
│   ├── calendars/            # Calendar management app
│   ├── decision/             # Decision tracking app
│   ├── automationWorkflow/  # Workflow automation app
│   └── ...                   # Other Django apps
├── frontend/                 # Next.js frontend source code
│   ├── src/
│   │   ├── app/              # Next.js app router pages
│   │   ├── components/        # React components
│   │   ├── lib/               # Utilities and API clients
│   │   └── ...                # Other frontend code
│   └── ...                   # Frontend configuration
├── nginx/                    # Nginx configuration files
├── devops/                   # DevOps and infrastructure configs
│   ├── prometheus/           # Prometheus configuration
│   ├── grafana/              # Grafana dashboards
│   ├── elk/                  # ELK Stack configuration
│   ├── sonarqube/            # SonarQube configuration
│   └── ...                   # Other DevOps tools
├── k6/                       # K6 load testing scripts and configs
│   ├── scripts/              # Test scenarios and flows
│   └── ...                   # K6 configuration
├── openapi/openapi_spec/     # OpenAPI specification files
├── docs/                      # Additional documentation
├── docker-compose.dev.yml    # Docker Compose for development
├── docker-compose.yml        # Docker Compose for production
├── env.example               # Example environment variables
├── DOCKER_README.md          # Detailed Docker deployment guide
├── CICD_README.md            # CI/CD pipeline documentation
└── ...                       # Other project files
```

---

## 🚀 Quick Start (Docker)

This section follows the official steps from [DOCKER_README.md](DOCKER_README.md).

### 📋 Prerequisites
- Docker Desktop installed and running  
- Docker Compose (included with Docker Desktop)  
- PostgreSQL installed locally (for pgAdmin access)  
- Git (to clone the repository)  

### 1. Clone and Setup
```bash
git clone <your-repo-url>
cd mediaJira

# Copy environment file
cp env.example .env
```

### 2. Local PostgreSQL Setup
**Option: Manual setup by SQL Shell(psql) -- **
Server [localhost]:localhost
Database [postgres]:postgres
Port [5432]:5432
Username [postgres]:postgres
User postgres password:your_postgres_password

Execute PSQL commands:
create database mediajira_db;
CREATE USER mediajira_user WITH PASSWORD 'mediajira_password';
GRANT ALL PRIVILEGES ON DATABASE mediajira_db TO mediajira_user; 
\c mediajira_db;
GRANT CREATE ON SCHEMA public TO mediajira_user;
GRANT USAGE ON SCHEMA public TO mediajira_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO mediajira_user;
exit

Then update your .env file, especially DB relevant variables.

### 3. Build and Run (Dev Mode)
```bash
find * -type f -name "Dockerfile*" | xargs dos2unix
find * -type f -name "entrypoint" | xargs dos2unix
find * -type f -name "entrypoint-dev" | xargs dos2unix
find * -type f -name "crontab.txt*" | xargs dos2unix
find * -type f -name "init-sonar" | xargs dos2unix

docker compose -f docker-compose.dev.yml --env-file .env up --build -d
```

### 4. Access the app

**Core Services:**
- Frontend: http://localhost/

**Infrastructure Services:**
- Redis: localhost:6379  
- ClamAV: localhost:3310  
- PostgreSQL: localhost:5432  

**Monitoring & Observability:**
- Prometheus: http://localhost:9090  
- Grafana: http://localhost:3001  
- Jaeger UI: http://localhost:16686  
- Kibana (ELK Stack): http://localhost:5601  
- Elasticsearch: http://localhost:9200  

**Development Tools:**
- Kafka UI: http://localhost:8081  
- Kafka Metrics: http://localhost:9308/metrics  
- SonarQube: http://localhost:9000  
- InfluxDB (K6 metrics): http://localhost:8086  

**Kafka Access:**
- Internal (containers): `kafka:9092`  
- External (host): `localhost:29092`  

> For detailed Docker deployment, production setup, and troubleshooting, please see [DOCKER_README.md](DOCKER_README.md).


## 📊 Monitoring & Observability

MediaJira includes comprehensive monitoring and observability tools for production-ready operations:

### Metrics Collection
- **Prometheus**: Collects metrics from backend and frontend services
  - Access: http://localhost:9090
  - Metrics endpoint: `/metrics` on backend and frontend

### Visualization
- **Grafana**: Visualize metrics and create dashboards
  - Access: http://localhost:3001
  - Pre-configured dashboards for application metrics
  - K6 load test dashboard for performance monitoring

### Distributed Tracing
- **Jaeger**: End-to-end request tracing across services
  - Access: http://localhost:16686
  - Traces requests through Nginx → Frontend → Backend → Database
  - OpenTelemetry integration for automatic instrumentation

### Logging
- **ELK Stack** (Elasticsearch, Filebeat, Kibana): Centralized logging
  - Elasticsearch: http://localhost:9200
  - Kibana: http://localhost:5601
  - Structured JSON logging from Django (python-json-logger) and Next.js (Pino)
  - 7-day log retention policy
  - See [ELK Setup Guide](devops/elk/kibana/ELK_SETUP.md) for detailed configuration

### Metrics Storage
- **InfluxDB**: Time-series database for K6 load test metrics
  - Access: http://localhost:8086
  - Stores performance metrics from load tests
  - Integrated with Grafana for visualization

---

## 🧪 Testing

### Unit & Integration Tests

**Backend (Django + pytest)**
```bash
# Run all backend tests
docker compose exec backend pytest

# Run with coverage
docker compose exec backend pytest --cov

# Run specific test file
docker compose exec backend pytest path/to/test_file.py
```

**Frontend (Next.js + Jest)**
```bash
# Run all frontend tests
docker compose exec frontend npm run test

# Run tests in watch mode
docker compose exec frontend npm run test:watch

# Run tests with coverage
docker compose exec frontend npm run test:coverage

# Run tests in CI mode
docker compose exec frontend npm run test:ci
```

### Component Testing
- **Storybook**: Component development and testing
  ```bash
  docker compose exec frontend npm run storybook
  ```
  Access at: http://localhost:6006

### Load Testing
- **K6**: Performance and load testing with InfluxDB metrics storage
  - Smoke test (1 VU, 30 seconds): `python k6/run_smoke_test.py`
  - Load test (10→50 VUs): `python k6/run_load_test.py`
  - Stress test (50→200 VUs): `python k6/run_stress_test.py`
  - Spike test (0→100 VUs): `python k6/run_spike_test.py`
  
  See [K6 Load Testing Guide](k6/README.md) for detailed documentation.

### CI/CD Testing
All tests run automatically in GitHub Actions CI/CD pipeline. See [CICD_README.md](CICD_README.md) for details.

---

## 🔧 Additional Services

### Event Streaming
- **Kafka**: Event streaming and messaging system
  - Kafka UI: http://localhost:8081 (Web-based cluster management)
  - Internal broker: `kafka:9092` (from containers)
  - External broker: `localhost:29092` (from host)
  - Metrics: http://localhost:9308/metrics
  - KRaft mode (no Zookeeper dependency)
  - Pre-defined topic management via topic-init container

### Background Processing
- **Celery**: Asynchronous task processing
  - Workers process background jobs (file scanning, report generation, etc.)
  - Redis as message broker
  - Integrated with Django for long-running tasks

### Code Quality
- **SonarQube**: Static code analysis and quality gates
  - Access: http://localhost:9000
  - Automated code quality checks
  - Security vulnerability scanning
  - Code coverage analysis

### File Security
- **ClamAV**: Virus scanning for uploaded files
  - Port: localhost:3310
  - Automatic scanning of all file uploads
  - Integrated with asset management system

---

## 📄 API Documentation

API specifications are located in `openapi/openapi_spec/` and are served through the **API Docs** page when the application is running.

---

## 📚 Documentation

For detailed information on specific topics, please refer to the following documentation:

- **[DOCKER_README.md](DOCKER_README.md)**: Comprehensive Docker deployment guide
  - Development vs Production setup
  - Service configuration
  - Troubleshooting guide
  - Common commands

- **[CICD_README.md](CICD_README.md)**: CI/CD pipeline documentation
  - GitHub Actions workflow
  - Testing in CI/CD
  - Best practices for developers
  - Adding new models and migrations

- **[K6 Load Testing Guide](k6/README.md)**: Performance testing documentation
  - Test scenarios (smoke, load, stress, spike)
  - InfluxDB integration
  - Grafana dashboards
  - Performance thresholds

- **ELK Stack Setup**: [devops/elk/kibana/ELK_SETUP.md](devops/elk/kibana/ELK_SETUP.md)
  - Centralized logging setup
  - Kibana dashboard configuration
  - Log retention policies

- **API Specifications**: Located in `openapi/openapi_spec/`
  - OpenAPI 3.0 specifications
  - Available through API Docs page when application is running

---

## 📜 License

This project is licensed under the **LGPL-2.1** license. See the [LICENSE](LICENSE) file for details.