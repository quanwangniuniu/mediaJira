# K6 Load Testing Infrastructure

Complete K6 load testing setup for MediaJira NextJS and Django applications with InfluxDB metrics storage and Grafana visualization.

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Access to the application (NextJS on port 3000, Django on port 8000)
- Test user credentials (configured in `.env`)

### Initial Setup

1. **Start InfluxDB service:**

```bash
docker-compose -f docker-compose.dev.yml -f k6/docker-compose.k6.yml up -d influxdb
```

2. **Generate InfluxDB token (first time only):**

```bash
# Wait for InfluxDB to be ready (about 10 seconds)
docker exec influxdb-k6 influx auth create \
  --org k6 \
  --all-access \
  --description "K6 Load Testing Token"
```

Copy the token and add it to your `.env` file as `INFLUXDB_TOKEN`.

3. **Configure Grafana datasource:**

- Open Grafana at http://localhost:3001
- Go to Configuration > Data Sources
- Add InfluxDB datasource:
  - Query Language：Flux（Not InfluxQL）
  - URL: `http://influxdb-k6:8086` (from within Docker network) or `http://localhost:8086` (from host)
  - Organization: `k6`
  - Bucket: `k6`
  - Authentication: Token (use the token from step 2)

4. **Import Grafana dashboard:**

- Go to Dashboards > Import
- Click "Upload JSON file" and select `devops/grafana/k6-dashboard.json`
- **Important:** When prompted, select the InfluxDB datasource you created in step 3
- Click "Import" to complete the setup

**Note:** The dashboard will show "no data" until you run K6 tests with InfluxDB output enabled. See "InfluxDB 2.x Output Setup" section below.

### Running Tests

Run tests using the provided scripts (Python or Bash):

**Python scripts (recommended for Windows):**
```bash
# Smoke test (1 VU, 30 seconds)
python k6/run_smoke_test.py

# Load test (10-50 VUs, ~14 minutes)
python k6/run_load_test.py

# Stress test (50-200 VUs, ~14 minutes)
python k6/run_stress_test.py

# Spike test (0→100 VUs in seconds)
python k6/run_spike_test.py

# Run all tests sequentially
python k6/run_all_tests.py
```

**Bash scripts (Linux/Mac/WSL):**
```bash
# Smoke test (1 VU, 30 seconds)
./k6/run-smoke-test.sh

# Load test (10-50 VUs, ~14 minutes)
./k6/run-load-test.sh

# Stress test (50-200 VUs, ~14 minutes)
./k6/run-stress-test.sh

# Spike test (0→100 VUs in seconds)
./k6/run-spike-test.sh

# Run all tests sequentially
./k6/run-all-tests.sh
```

**Note:** Python scripts handle Windows paths correctly and are recommended when running on Windows. Bash scripts work best on Linux, Mac, or WSL.

## Test Scenarios

### Smoke Test
- **Purpose**: Verify system works under minimal load
- **Configuration**: 1 VU, 30 seconds
- **Thresholds**: Strict - all must pass
- **Use Case**: Quick sanity check before deploying

### Load Test
- **Purpose**: Measure normal capacity and performance
- **Configuration**: Gradual ramp-up (10→50 VUs), sustained load
- **Thresholds**: Standard performance thresholds
- **Use Case**: Establish baseline performance metrics

### Stress Test
- **Purpose**: Find breaking points and recovery behavior
- **Configuration**: Push beyond normal capacity (50→200 VUs)
- **Thresholds**: Relaxed (higher latency acceptable)
- **Use Case**: Capacity planning and optimization

### Spike Test
- **Purpose**: Test system recovery after sudden load spikes
- **Configuration**: Sudden spike (0→100 VUs in seconds)
- **Thresholds**: Lenient error rate (up to 3%)
- **Use Case**: Validate auto-scaling and recovery mechanisms

## Performance Thresholds

Default thresholds are configured in `scripts/config.js`:

- **HTTP Request Duration (Read)**: p95 < 200ms
- **HTTP Request Duration (Write)**: p95 < 500ms
- **Error Rate**: < 1%
- **Waiting Time (TTFB)**: p95 < 150ms
- **Iteration Duration**: p95 < 1s

Thresholds are adjusted per scenario type. See [THRESHOLDS.md](docs/THRESHOLDS.md) for tuning recommendations.

## Test Coverage

### API Endpoints Tested

- Authentication: `/auth/login/`, `/auth/me/`, `/auth/me/teams/`
- Health: `/health/`
- Tasks: `/api/tasks/`
- Campaigns: `/api/campaigns/`
- Projects: `/api/core/projects/`
- Assets: `/api/assets/`
- Budgets: `/api/budgets/`

### Frontend Pages Tested

- Homepage: `http://localhost:3000/`
- Login: `http://localhost:3000/login`
- Tasks: `http://localhost:3000/tasks`
- Campaigns: `http://localhost:3000/campaigns`
- Projects: `http://localhost:3000/projects`

## Configuration

### Environment Variables

Configure test settings in `.env`:

```bash
# Test user credentials
K6_TEST_USER_EMAIL=test@example.com
K6_TEST_USER_PASSWORD=testpassword123

# Target URLs
K6_BASE_URL=http://localhost:8000
K6_FRONTEND_URL=http://localhost:3000

# InfluxDB settings
INFLUXDB_URL=http://localhost:8086
INFLUXDB_ORG=k6
INFLUXDB_BUCKET=k6
INFLUXDB_TOKEN=<your-token-here>

# Docker network configuration (optional)
K6_DOCKER_NETWORK=mediajira_default  # Default: mediajira_default
K6_USE_SERVICE_NAMES=true             # Default: true (uses service names when on same network)
```

### Docker Network Configuration

The K6 test runner automatically joins the Docker network where your services are running to enable container-to-container communication. By default, it uses the `mediajira_default` network.

**How it works:**
- By default (`K6_USE_SERVICE_NAMES=true`), the scripts automatically convert `localhost` URLs to Docker service names:
  - `http://localhost:8000` → `http://backend-dev:8000`
  - `http://localhost:3000` → `http://frontend-dev:3000`
  - `http://localhost:8086` → `http://influxdb-k6:8086`
- This allows K6 to communicate directly with services on the same Docker network
- **REQUIRED:** You must add service names to Django's `ALLOWED_HOSTS` in your `.env` file:
  ```bash
  # In your .env file, update ALLOWED_HOSTS:
  ALLOWED_HOSTS=localhost,127.0.0.1,backend-dev,frontend-dev,influxdb-k6
  ```
  Without this, Django will reject requests with a 400 error: "Invalid HTTP_HOST header"

**Customizing the network:**
- If your services are on a different network, set `K6_DOCKER_NETWORK` in your `.env` file
- To disable service names (use localhost), set `K6_USE_SERVICE_NAMES=false` (not recommended for container-to-container communication)

**Finding your Docker network:**
```bash
# List all networks
docker network ls

# Check which network a service is on
docker inspect backend-dev --format='{{range $net, $conf := .NetworkSettings.Networks}}{{$net}}{{end}}'
```

### Customizing Test Scenarios

Edit scenario files in `scripts/scenarios/` to modify:

- Virtual user counts and ramping strategies
- Test duration
- Threshold values
- Test flows and endpoints

### InfluxDB 2.x Output Setup (Required for Grafana Dashboard)

**Note:** The standard K6 Docker image doesn't support InfluxDB 2.x natively. To enable InfluxDB output and see data in Grafana, you need to build a custom K6 image with the `xk6-output-influxdb` extension.

1. **Build custom K6 image with InfluxDB 2.x support:**

```bash
# Build the custom image (Dockerfile.k6 already exists)
docker build -t k6-influxdb:latest -f mediaJira/k6/Dockerfile.k6 mediaJira/k6/
```

2. **Enable custom image in test scripts:**

Set the environment variable before running tests:
```bash
export K6_USE_CUSTOM_IMAGE=true
# Or add to .env file: K6_USE_CUSTOM_IMAGE=true
```

3. **Run tests with InfluxDB output:**

Once the custom image is built and `K6_USE_CUSTOM_IMAGE=true` is set, tests will automatically:
- Use the custom K6 image
- Send metrics to InfluxDB using the `xk6-influxdb` output
- Make data available in Grafana dashboard

```bash
# Example: Run smoke test with InfluxDB output
export K6_USE_CUSTOM_IMAGE=true
python mediaJira/k6/run_smoke_test.py
```

4. **Verify data in Grafana:**

- Open the K6 Load Test Dashboard in Grafana
- Check that panels show data (request rate, VUs, response times, etc.)
- If still showing "no data":
  - Verify InfluxDB token is set in `.env`
  - Check that tests completed successfully
  - Verify InfluxDB datasource is correctly configured
  - Check time range in dashboard (default is last 15 minutes)

## Viewing Results

### Grafana Dashboard

Access the K6 dashboard at http://localhost:3001 (after importing):

- Request rate (requests/second)
- Response time percentiles (p50, p95, p99)
- Error rate percentage
- Active virtual users
- HTTP status code distribution
- Request duration by endpoint
- Threshold pass/fail status

### Command Line Output

K6 outputs real-time metrics to the console during test execution, including:

- Request statistics
- Threshold pass/fail status
- Error summaries
- Final summary report

## Performance Baseline

Establish a baseline by:

1. Running smoke test 3 times and averaging results
2. Running load test and documenting p95 latencies per endpoint
3. Documenting current capacity (max VUs before errors > 1%)
4. Storing baseline metrics in documentation

See [TEST_SCENARIOS.md](docs/TEST_SCENARIOS.md) for detailed baseline establishment process.

## Troubleshooting

### InfluxDB Connection Issues

- Verify InfluxDB is running: `docker ps | grep influxdb`
- Check token is correct: `docker exec influxdb-k6 influx auth list`
- Verify network connectivity: `docker exec influxdb-k6 ping host.docker.internal`

### Test Failures

- Check application is running and accessible
- Verify test user credentials are correct
- Review error messages in K6 output
- Check Grafana for detailed error breakdowns

### High Error Rates

- Review server logs for application errors
- Check database connection pool limits
- Verify resource constraints (CPU, memory)
- Consider reducing VU count or increasing ramp-up time

## CI/CD Integration

See [CI_INTEGRATION.md](docs/CI_INTEGRATION.md) for:

- GitHub Actions workflow examples
- Performance regression detection
- Automated test execution in pipelines
- Artifact collection and reporting

## Directory Structure

```
k6/
├── scripts/
│   ├── scenarios/          # Test scenario scripts
│   │   ├── smoke-test.js
│   │   ├── load-test.js
│   │   ├── stress-test.js
│   │   └── spike-test.js
│   ├── flows/              # Test flow implementations
│   │   ├── authentication.js
│   │   ├── api-endpoints.js
│   │   └── page-loads.js
│   ├── utils/              # Utility functions
│   │   ├── auth.js
│   │   ├── endpoints.js
│   │   └── helpers.js
│   └── config.js           # Central configuration
├── docs/                   # Documentation
│   ├── TEST_SCENARIOS.md
│   ├── THRESHOLDS.md
│   └── CI_INTEGRATION.md
├── docker-compose.k6.yml   # Docker compose for K6/InfluxDB
├── run-smoke-test.sh       # Test execution scripts
├── run-load-test.sh
├── run-stress-test.sh
├── run-spike-test.sh
└── run-all-tests.sh
└── README.md               # This file
```

## Additional Resources

- [K6 Documentation](https://k6.io/docs/)
- [InfluxDB Documentation](https://docs.influxdata.com/)
- [Grafana Dashboards](https://grafana.com/docs/grafana/latest/dashboards/)
- [Test Scenario Guide](docs/TEST_SCENARIOS.md)
- [Threshold Tuning Guide](docs/THRESHOLDS.md)
- [CI Integration Guide](docs/CI_INTEGRATION.md)

