# K6 Load Testing Infrastructure

Complete K6 load testing setup for MediaJira NextJS and Django applications with InfluxDB metrics storage and Grafana visualization.

## ⚠️ IMPORTANT: Test Load Warnings

**Before running any tests, please read these warnings:**

- **Stress Test**: Ramps up to **200 Virtual Users (VUs)** over 14 minutes - this will push your system BEYOND normal capacity
- **Spike Test**: Creates a **sudden spike to 100 VUs in just 10 seconds** - this may overwhelm your system
- **Load Test**: Gradually increases to **50 VUs** over 14 minutes - moderate load
- **Smoke Test**: Uses only **1 VU for 30 seconds** - safe for development machines ✅

**Recommendations:**
1. **Always start with the smoke test** to verify your system is ready
2. **Monitor system resources** (CPU, memory, network) during all tests
3. **Consider running stress/spike tests on dedicated test machines** to avoid impacting your development workstation
4. **Ensure your services are healthy** before running any test
5. **Start with smoke test, then load test** before attempting stress/spike tests

**Resource Impact:**
- High VU counts can consume significant CPU and memory
- Network bandwidth will be heavily utilized
- Database connections may be exhausted
- Your development machine may become unresponsive during heavy tests

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Access to the application (NextJS on port 3000, Django on port 8000)
- Test user credentials (configured in `.env`)

### Initial Setup

1. **Start InfluxDB service:**

```bash
docker-compose -f docker-compose.dev.yml --env-file .env up --build -d
```

**Note:** InfluxDB is defined as a service in `docker-compose.dev.yml`. The K6 service is also defined there and will be built automatically when needed.

2. **Generate InfluxDB token:**

**Option A: Pre-generate token (recommended for first-time setup)**

Add `INFLUXDB_TOKEN` to your `.env` file before starting InfluxDB. If not provided, InfluxDB will auto-generate one on first startup.

**Option B: Generate token after InfluxDB starts (if not set in .env):**

```bash
# Wait for InfluxDB to be ready (about 10-15 seconds)
# Check health: docker ps (influxdb-k6 should be healthy)

# Generate token
docker exec influxdb-k6 influx auth create \
  --org k6 \
  --all-access \
  --description "K6 Load Testing Token"

# Copy the token from output and add to .env file:
# INFLUXDB_TOKEN=<paste-token-here>
```

**Important:** Never commit real tokens to the repository. Use placeholders in example files.

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
- Click "Upload JSON file" and select `devops/grafana/k6-dashboard-custom.json`
- **Important:** When prompted, select the InfluxDB datasource you created in step 3
  - The dashboard uses `${DS_INFLUXDB}` template variable which will be replaced with your datasource UID
  - If the datasource is not automatically mapped, manually select it from the dropdown
- Click "Import" to complete the setup

**Understanding Datasource UID:**
- Each Grafana datasource has a unique identifier (UID)
- The dashboard JSON uses template variables like `${DS_INFLUXDB}` that Grafana replaces with the actual UID during import
- If automatic mapping fails, you may need to manually replace UIDs in the dashboard JSON

**Manual Datasource UID Replacement (if needed):**

If the dashboard shows "no data" after import and automatic mapping didn't work:

1. **Find your datasource UID:**
   - Go to Configuration > Data Sources
   - Click on your InfluxDB datasource
   - The UID is shown in the URL or in the datasource settings (usually a short string like `influxdb-k6` or similar)

2. **Option A: Replace during import (recommended):**
   - During import, Grafana will prompt you to select the datasource
   - If prompted, select your InfluxDB datasource from the dropdown
   - Grafana will automatically replace `${DS_INFLUXDB}` with your datasource UID

3. **Option B: Manual JSON editing (if Option A doesn't work):**
   - Before importing, open the dashboard JSON file in a text editor
   - Search for `${DS_INFLUXDB}` or the old datasource UID
   - Replace with your actual InfluxDB datasource UID
   - Save and import the modified JSON

**Note:** The dashboard will show "no data" until you run K6 tests with InfluxDB output enabled. See "InfluxDB 2.x Output Setup" section below.

**Troubleshooting datasource mapping:**

**If dashboard shows "no data" after import:**

1. **Verify datasource is correctly configured:**
   - Go to Configuration > Data Sources
   - Test your InfluxDB datasource connection (click "Test" button)
   - Ensure it shows "Data source is working"

2. **Check dashboard datasource settings:**
   - Open the imported dashboard
   - Click the gear icon (⚙️) > Settings > Variables
   - Verify the datasource variable is set correctly
   - Or edit the dashboard and check each panel's datasource setting

3. **Verify datasource UID in dashboard:**
   - Edit the dashboard (click Edit/Pencil icon)
   - Check any panel's query editor
   - The datasource dropdown should show your InfluxDB datasource
   - If it shows "Mixed" or wrong datasource, manually select the correct one for each panel

4. **Manual UID replacement in dashboard JSON:**
   - Export the dashboard (Dashboard Settings > JSON Model)
   - Search for datasource references (look for `"datasource": { "uid": "..." }`)
   - Replace any incorrect UIDs with your InfluxDB datasource UID
   - Save and re-import the dashboard

5. **Common issues:**
   - **"No data" but datasource works**: Check time range in dashboard (top right corner)
   - **Wrong datasource selected**: Manually change datasource in each panel's query editor
   - **UID mismatch**: The dashboard JSON may have a hardcoded UID that doesn't match your datasource
   - **Template variable not replaced**: The `__inputs` section in JSON should prompt for datasource during import

**Dashboard JSON Structure:**
- The dashboard JSON includes an `__inputs` section that prompts for datasource selection during import
- Template variables like `${DS_INFLUXDB}` are replaced with actual datasource UIDs during import
- If the UID doesn't match, panels will show "no data" or datasource errors
- You can verify the UID by checking the datasource settings in Grafana or inspecting the dashboard JSON

### Running Tests

K6 is now configured as a service in `docker-compose.dev.yml`. You can run tests in two ways:

**⚠️ RECOMMENDED: Start with Smoke Test**

Always run the smoke test first to verify your system is ready:

```bash
# ✅ SAFE: Smoke test (1 VU, 30 seconds) - Recommended starting point
python k6/run_smoke_test.py
```

**Option 1: Using Python scripts (recommended):**

```bash
# ✅ SAFE: Smoke test (1 VU, 30 seconds) - Start here!
python k6/run_smoke_test.py

# ⚠️ MODERATE: Load test (10→50 VUs, ~14 minutes)
#   - Gradual ramp-up, sustained load
#   - Monitor system resources
python k6/run_load_test.py

# 🔴 AGGRESSIVE: Stress test (50→200 VUs, ~14 minutes)
#   ⚠️ WARNING: Will push system BEYOND normal capacity
#   ⚠️ WARNING: May impact development machine performance
#   ⚠️ WARNING: Recommended to run on dedicated test machine
python k6/run_stress_test.py

# 🔴 EXTREME: Spike test (0→100 VUs in 10 seconds)
#   ⚠️ WARNING: Sudden load spike may overwhelm system
#   ⚠️ WARNING: May cause system instability
#   ⚠️ WARNING: Recommended to run on dedicated test machine
python k6/run_spike_test.py

# ⚠️ Runs all tests sequentially (includes aggressive tests)
#   WARNING: This will run stress and spike tests which are very aggressive
python k6/run_all_tests.py
```

**Option 2: Using docker compose directly:**
```bash
# Smoke test
docker compose -f docker-compose.dev.yml run --rm --no-deps k6 run /scripts/scenarios/smoke-test.js

# Load test
docker compose -f docker-compose.dev.yml run --rm --no-deps k6 run /scripts/scenarios/load-test.js

# With InfluxDB output (if INFLUXDB_TOKEN is set in .env)
docker compose -f docker-compose.dev.yml run --rm --no-deps k6 run --out xk6-influxdb /scripts/scenarios/smoke-test.js
```

**Note:** 
- The Python scripts automatically use the `k6` service from docker-compose
- Make sure backend, frontend, and influxdb services are running before executing tests
- The `--no-deps` flag prevents docker-compose from starting dependencies (assumes they're already running)

**Test Execution Guidelines:**

1. **✅ Always start with smoke test** - Verifies system is ready (1 VU, 30 seconds)
2. **⚠️ Load test is moderate** - Gradual ramp to 50 VUs, monitor resources
3. **🔴 Stress test is aggressive** - Up to 200 VUs, may impact your machine
4. **🔴 Spike test is extreme** - Sudden 100 VU spike, may overwhelm system

**Resource Considerations:**
- **Smoke test**: Safe for any machine (minimal resource usage)
- **Load test**: Moderate resource usage, monitor CPU/memory
- **Stress test**: High resource usage, may slow down development machine
- **Spike test**: Very high resource usage, may cause system instability

**Use `K6_ABORT_ON_FAIL=true`** to stop tests immediately if thresholds are crossed (see Advanced Options below)

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
- **Configuration**: Push beyond normal capacity (50→100→200 VUs over 14 minutes)
- **Thresholds**: Relaxed (higher latency acceptable)
- **Use Case**: Capacity planning and optimization
- **🔴 CRITICAL WARNING**: 
  - **Ramps up to 200 Virtual Users** - Very aggressive load
  - **May significantly impact your development machine** - CPU and memory usage will be high
  - **May cause system slowdown or unresponsiveness** during test execution
  - **Recommended**: Run on dedicated test machines, not development workstations
  - **Resource impact**: High CPU, high memory, high network bandwidth
  - **Duration**: ~14 minutes of sustained high load

### Spike Test
- **Purpose**: Test system recovery after sudden load spikes
- **Configuration**: Sudden spike (0→100 VUs in 10 seconds, maintain for 1 minute)
- **Thresholds**: Lenient error rate (up to 3%)
- **Use Case**: Validate auto-scaling and recovery mechanisms
- **🔴 CRITICAL WARNING**: 
  - **Creates sudden spike to 100 Virtual Users in just 10 seconds** - Extremely aggressive
  - **May overwhelm your system immediately** - Sudden load increase
  - **May cause system instability or crashes** if resources are insufficient
  - **Recommended**: Run on dedicated test machines with adequate resources
  - **Resource impact**: Very high CPU spike, very high memory spike, network saturation
  - **Duration**: ~1 minute 20 seconds (but most load in first 10 seconds)

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

**Resource Limit Variables:**
- `K6_DOCKER_MEMORY` - Memory limit for K6 container (e.g., "2g", "4g")
  - Recommended for stress/spike tests on development machines
  - Prevents K6 from consuming all available memory
  - Example: `K6_DOCKER_MEMORY=2g`
  
- `K6_DOCKER_CPUS` - CPU limit for K6 container (e.g., "2", "4")
  - Recommended for stress/spike tests on development machines
  - Prevents K6 from consuming all available CPU cores
  - Example: `K6_DOCKER_CPUS=2`

**Test Control Variables:**
- `K6_ABORT_ON_FAIL` - Abort test immediately when thresholds are crossed
  - **Recommended for**: Smoke tests, CI/CD pipelines (fail fast)
  - **Optional for**: Load tests (early regression detection)
  - **Not recommended for**: Stress/spike tests (may want full results)
  - When enabled, test stops immediately on threshold failure
  - Exit code is non-zero when aborted
  - Example: `K6_ABORT_ON_FAIL=true`

**Note:** Resource limits are optional but highly recommended when running stress/spike tests on development workstations. For dedicated test machines, you may omit these limits to allow full resource utilization.

**Complete .env Configuration:**

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
# IMPORTANT: Generate token using: docker exec influxdb-k6 influx auth create --org k6 --all-access
# Never commit real tokens to the repository
INFLUXDB_TOKEN=<generate-token-using-command-above>

# Docker network configuration (optional)
K6_DOCKER_NETWORK=mediajira_default  # Default: mediajira_default
K6_USE_SERVICE_NAMES=true             # Default: true (uses service names when on same network)

# Advanced options
K6_USE_CUSTOM_IMAGE=false             # Set to true to use custom k6-influxdb image
K6_ABORT_ON_FAIL=false                # Set to true to abort test on threshold failure

# Docker resource limits (recommended for stress/spike tests on development machines)
K6_DOCKER_MEMORY=2g                   # Memory limit (e.g., "2g", "4g") - Optional but recommended
K6_DOCKER_CPUS=2                      # CPU limit (e.g., "2", "4") - Optional but recommended
```

### Docker Network Configuration

**⚠️ IMPORTANT:** The K6 test runner automatically joins the Docker network where your services are running to enable container-to-container communication. By default, it uses the `mediajira_default` network.

**Finding your Docker network:**

```bash
# List all networks
docker network ls

# Check which network a service is on
docker inspect backend-dev --format='{{range $net, $conf := .NetworkSettings.Networks}}{{$net}}{{end}}'
```

**If your services use a different network name:**

Set `K6_DOCKER_NETWORK` in your `.env` file to match your actual network:
```bash
K6_DOCKER_NETWORK=your_network_name
```

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

### Advanced Options

**Abort on Threshold Failure:**

The `--abort-on-fail` flag stops tests immediately when performance thresholds are crossed, preventing wasted time on tests that are already failing.

**When to Use:**
- ✅ **Recommended for**: Smoke tests, CI/CD pipelines, critical threshold validation
- ✅ **Useful for**: Early failure detection, saving time on clearly failing tests
- ⚠️ **Consider for**: Load tests when you want to catch regressions early
- ❌ **Not recommended for**: Stress/spike tests (you may want to see full results even if thresholds fail)

**How it works:**
- When a threshold is crossed, K6 immediately stops the test
- Test exits with a non-zero exit code
- Partial metrics are still available up to the point of failure
- Useful for fast feedback in automated pipelines

**Usage:**

Set `K6_ABORT_ON_FAIL=true` to enable:
```bash
export K6_ABORT_ON_FAIL=true
python k6/run_smoke_test.py
```

Or add to `.env` file:
```bash
K6_ABORT_ON_FAIL=true
```

**Examples:**

**Smoke Test (Recommended):**
```bash
# Smoke tests should fail fast if basic functionality is broken
export K6_ABORT_ON_FAIL=true
python k6/run_smoke_test.py
```

**CI/CD Pipeline:**
```bash
# Fail fast in CI to save pipeline time
export K6_ABORT_ON_FAIL=true
python k6/run_load_test.py
```

**Stress Test (Optional):**
```bash
# For stress tests, you may want to see full results even if thresholds fail
# Leave K6_ABORT_ON_FAIL unset or false to see complete test results
python k6/run_stress_test.py
```

**Important Notes:**
- When enabled, tests stop immediately on threshold failure - you won't get complete test data
- Partial metrics are still useful for diagnosing issues
- Exit code will be non-zero when test is aborted
- Status is displayed in test output: "Abort on fail: ENABLED" or "DISABLED"

**Verify InfluxDB Output Plugin:**

After building the custom K6 image, verify the output plugin name:
```bash
# Check k6 version and verify plugin registration
docker run --rm k6-influxdb:latest version
# Expected output: Extensions: github.com/grafana/xk6-output-influxdb v0.7.0, xk6-influxdb [output]

# List available output options (optional)
docker run --rm --entrypoint="" k6-influxdb:latest k6 run --help | grep -i "out\|influx"
```

**Verified Configuration:**
- **Plugin Name:** `xk6-influxdb` ✅ (verified)
- **Version:** v0.7.0 (requires Go 1.23+)
- **Usage:** `--out xk6-influxdb` (with environment variables) or `--out xk6-influxdb=http://localhost:8086`

### Customizing Test Scenarios

Edit scenario files in `scripts/scenarios/` to modify:

- Virtual user counts and ramping strategies
- Test duration
- Threshold values
- Test flows and endpoints

**Note:** VU count and duration are configured in the test script files, not via command-line arguments.

### JavaScript Runtime Compatibility

**IMPORTANT:** K6 uses ES5.1 JavaScript runtime, which has limitations compared to modern JavaScript:

- **Do NOT use optional chaining (`?.`)** - Use explicit null checks instead:
  ```javascript
  // ❌ NOT supported: response.body?.substring(0, 200)
  // ✅ Use instead: response.body ? response.body.substring(0, 200) : 'No body'
  ```

- **Do NOT use `URL` constructor** - Use regex parsing instead:
  ```javascript
  // ❌ NOT supported: new URL(healthURL).hostname
  // ✅ Use instead: healthURL.match(/^https?:\/\/([^\/]+)/)[1]
  ```

- **Do NOT use other ES2020+ features** - Stick to ES5.1 compatible syntax

All test scripts in this repository have been verified to be ES5.1 compatible. When adding new code, ensure compatibility with older JavaScript versions.

### InfluxDB 2.x Output Setup (Required for Grafana Dashboard)

**Note:** The K6 service in `docker-compose.dev.yml` automatically builds a custom K6 image with the `xk6-output-influxdb` extension. No manual build step is required.

1. **The K6 service is configured automatically:**

The `k6` service in `docker-compose.dev.yml`:
- Builds the custom K6 image with InfluxDB 2.x support automatically
- Uses the image from `k6/Dockerfile.k6`
- Includes the `xk6-output-influxdb` extension (v0.7.0)
- Registers the output plugin as `xk6-influxdb`

**Verify the custom image (optional):**

```bash
# Check k6 version and verify plugin is registered
docker compose -f docker-compose.dev.yml run --rm --no-deps k6 version
# Should show: Extensions: github.com/grafana/xk6-output-influxdb v0.7.0, xk6-influxdb [output]
```

**Verified Output Plugin Name:** `xk6-influxdb`

2. **Run tests with InfluxDB output:**

Tests automatically use the custom K6 image when run via Python scripts or docker compose. To enable InfluxDB output:

```bash
# Ensure INFLUXDB_TOKEN is set in .env file
# Then run tests - InfluxDB output will be enabled automatically if token is present
python k6/run_smoke_test.py
```

The Python scripts automatically:
- Use the `k6` service from docker-compose
- Send metrics to InfluxDB using the `xk6-influxdb` output (if `INFLUXDB_TOKEN` is set)
- Make data available in Grafana dashboard

3. **Verify data in Grafana:**

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

### 100% Failure Rate - Backend Not Reaching

If you see 100% failure rate and errors indicate the backend is not handling requests, follow these steps:

**1. Verify Backend Service is Running:**

```bash
# Check if backend-dev container exists and is running
docker compose -f docker-compose.dev.yml ps backend-dev

# If not running, start it:
docker compose -f docker-compose.dev.yml up -d backend

# Check backend logs for errors:
docker compose -f docker-compose.dev.yml logs backend-dev
```

**2. Test Backend Health Endpoint from Host:**

```bash
# Test health endpoint directly
curl http://localhost:8000/health/

# Should return: OK
# If it fails, the backend is not accessible on port 8000
```

**3. Verify Django ALLOWED_HOSTS Configuration:**

The most common cause of 100% failure rate is Django rejecting requests because service names are not in `ALLOWED_HOSTS`.

Check your `.env` file and ensure it includes:

```bash
ALLOWED_HOSTS=localhost,127.0.0.1,backend-dev,frontend-dev,influxdb-k6,0.0.0.0
```

**Important:** The service names (`backend-dev`, `frontend-dev`, `influxdb-k6`) must be included because K6 connects using Docker service names when running in containers.

**4. Verify Network Connectivity:**

```bash
# Test if K6 container can reach backend
docker compose -f docker-compose.dev.yml run --rm --no-deps k6 sh -c "ping -c 1 backend-dev"

# Or test HTTP connectivity from K6 container
docker compose -f docker-compose.dev.yml run --rm --no-deps k6 sh -c "wget -qO- http://backend-dev:8000/health/ || echo 'Connection failed'"
```

**5. Check Pre-Flight Checks Output:**

The Python runner scripts now include pre-flight checks that verify:
- Backend container is running
- Health endpoint is accessible
- Network connectivity

If pre-flight checks fail, fix the issues before running tests.

**6. Common Error Messages and Solutions:**

| Error Message | Cause | Solution |
|--------------|-------|----------|
| `status === 0` (Network error) | Backend not running or not accessible | Start backend: `docker compose -f docker-compose.dev.yml up -d backend` |
| `status === 400` (Bad Request) | Django ALLOWED_HOSTS rejecting request | Add service names to ALLOWED_HOSTS in `.env` |
| `status === 500` (Server Error) | Backend error | Check backend logs: `docker compose -f docker-compose.dev.yml logs backend-dev` |
| DNS resolution failed | Service name not found | Verify services are on same Docker network |

**7. Enable Verbose Logging:**

To see detailed request/response information:

```bash
export K6_VERBOSE=true
python k6/run_smoke_test.py
```

This will log all HTTP requests and responses for debugging.

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
│   │   ├── helpers.js
│   │   ├── setup.js
│   │   └── network-check.js
│   └── config.js           # Central configuration
├── docs/                   # Documentation
│   ├── TEST_SCENARIOS.md
│   ├── THRESHOLDS.md
│   └── CI_INTEGRATION.md
├── Dockerfile.k6           # Custom K6 image with InfluxDB support
├── run_smoke_test.py       # Test execution scripts (Python)
├── run_load_test.py
├── run_stress_test.py
├── run_spike_test.py
├── run_all_tests.py
└── README.md               # This file
```

**Note:** 
- K6 and InfluxDB services are defined in `docker-compose.dev.yml` (not in a separate k6 compose file)
- All test execution scripts are Python-based (`.py` files) for cross-platform compatibility
- The Grafana dashboard JSON is located at `devops/grafana/k6-dashboard-custom.json`

## Advanced Configuration

### Abort on Threshold Failure

To stop tests immediately when performance thresholds are crossed:

```bash
export K6_ABORT_ON_FAIL=true
python k6/run_load_test.py
```

Or add to `.env`:
```bash
K6_ABORT_ON_FAIL=true
```

### Verifying Custom K6 Image

After building the custom K6 image, verify it works correctly:

```bash
# Check k6 version and verify plugin registration
docker run --rm k6-influxdb:latest version
# Expected output should show: Extensions: github.com/grafana/xk6-output-influxdb v0.7.0, xk6-influxdb [output]

# List available output options (optional)
docker run --rm --entrypoint="" k6-influxdb:latest k6 run --help | grep -i "out\|influx"
```

**Verified Configuration:**
- **Plugin Name:** `xk6-influxdb` ✅ (verified via build output)
- **Extension Version:** v0.7.0
- **Go Version Required:** 1.23+
- **Environment Variables Used:**
  - `K6_INFLUXDB_ADDR` - InfluxDB address (default: http://localhost:8086)
  - `K6_INFLUXDB_ORGANIZATION` - Organization name
  - `K6_INFLUXDB_BUCKET` - Bucket name
  - `K6_INFLUXDB_TOKEN` - Authentication token
  - `K6_INFLUXDB_PUSH_INTERVAL` - Flush interval (optional, default: 1s)
  - `K6_INFLUXDB_CONCURRENT_WRITES` - Concurrent writes (optional, default: 4)

### Resource Considerations

**Protecting Your Development Machine:**

Heavy load tests (especially stress and spike tests) can consume significant system resources. To protect your development workstation:

1. **Use Docker Resource Limits** (Recommended for development machines)
   - Limits prevent K6 from consuming all available resources
   - Set via environment variables before running tests:
     ```bash
     # Recommended limits for stress/spike tests on development machines
     export K6_DOCKER_MEMORY=2g      # Limit memory to 2GB
     export K6_DOCKER_CPUS=2         # Limit to 2 CPU cores
     python k6/run_stress_test.py
     ```
   - Limits are applied automatically when environment variables are set
   - Can be added to `.env` file for persistence

2. **Use Dedicated Test Machines** (Recommended for production-like testing)
   - Stress and spike tests are best run on dedicated machines
   - Prevents impact on development workstation
   - Allows full resource utilization for accurate results
   - Minimum recommended specs for dedicated test machine:
     - **CPU**: 4+ cores
     - **Memory**: 8GB+ RAM
     - **Network**: Stable, high-bandwidth connection
     - **Storage**: SSD recommended for better performance

**Resource Limit Recommendations:**

| Test Type | Development Machine | Dedicated Test Machine |
|-----------|-------------------|----------------------|
| **Smoke** | No limits needed (1 VU) | No limits needed |
| **Load** | Optional: `--memory=1g --cpus=1` | No limits (up to 50 VUs) |
| **Stress** | **Required**: `--memory=2g --cpus=2` | No limits (up to 200 VUs) |
| **Spike** | **Required**: `--memory=2g --cpus=2` | No limits (100 VU spike) |

**Setting Resource Limits:**

**Option 1: Environment Variables (Recommended)**
```bash
# Set limits for current session
export K6_DOCKER_MEMORY=2g
export K6_DOCKER_CPUS=2
python k6/run_stress_test.py
```

**Option 2: Add to .env File**
```bash
# Add to .env file
K6_DOCKER_MEMORY=2g
K6_DOCKER_CPUS=2
```

**Option 3: Direct Docker Compose Command**
```bash
docker compose -f docker-compose.dev.yml run --rm --no-deps \
  --memory=2g --cpus=2 \
  k6 run /scripts/scenarios/stress-test.js
```

**Monitoring Resource Usage:**

During test execution, monitor system resources:
```bash
# Monitor CPU and memory usage
docker stats

# Or use system monitoring tools
# Windows: Task Manager
# Linux/Mac: htop, top, or system monitor
```

**When to Use Dedicated Machines:**

- ✅ **Use dedicated machines for:**
  - Production-like performance testing
  - Stress tests (200 VUs)
  - Spike tests (sudden 100 VU spikes)
  - Long-running test suites
  - CI/CD pipeline testing

- ✅ **Development machines are fine for:**
  - Smoke tests (1 VU)
  - Load tests with resource limits (up to 50 VUs)
  - Quick validation testing

## Additional Resources

- [K6 Documentation](https://k6.io/docs/)
- [InfluxDB Documentation](https://docs.influxdata.com/)
- [Grafana Dashboards](https://grafana.com/docs/grafana/latest/dashboards/)
- [Test Scenario Guide](docs/TEST_SCENARIOS.md)
- [Threshold Tuning Guide](docs/THRESHOLDS.md)
- [CI Integration Guide](docs/CI_INTEGRATION.md)

