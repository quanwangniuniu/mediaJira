# CI/CD Integration Guide

Guide to integrating K6 load tests into CI/CD pipelines for automated performance regression testing.

## Overview

Integrating K6 tests into CI/CD pipelines enables:

- Automatic performance regression detection
- Performance gates before deployments
- Historical performance tracking
- Early detection of performance issues

## GitHub Actions Integration

### Basic Workflow

Create `.github/workflows/k6-load-test.yml`:

```yaml
name: K6 Load Tests

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main]
  schedule:
    # Run daily at 2 AM UTC
    - cron: '0 2 * * *'

jobs:
  smoke-test:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Start application
        run: |
          docker-compose up -d
          # Wait for application to be ready
          ./scripts/wait-for-health.sh
      
      - name: Setup InfluxDB
        run: |
          docker-compose -f docker-compose.dev.yml -f k6/docker-compose.k6.yml up -d influxdb
          sleep 10  # Wait for InfluxDB to initialize
      
      - name: Generate InfluxDB token
        id: influxdb-token
        run: |
          TOKEN=$(docker exec influxdb-k6 influx auth create \
            --org k6 \
            --all-access \
            --description "CI Token" \
            --json | jq -r '.token')
          echo "token=$TOKEN" >> $GITHUB_OUTPUT
      
      - name: Run smoke test
        env:
          K6_BASE_URL: http://localhost:8000
          K6_FRONTEND_URL: http://localhost:3000
          K6_TEST_USER_EMAIL: ${{ secrets.K6_TEST_USER_EMAIL }}
          K6_TEST_USER_PASSWORD: ${{ secrets.K6_TEST_USER_PASSWORD }}
          INFLUXDB_URL: http://localhost:8086
          INFLUXDB_ORG: k6
          INFLUXDB_BUCKET: k6
          INFLUXDB_TOKEN: ${{ steps.influxdb-token.outputs.token }}
        run: |
          cd k6
          ./run-smoke-test.sh
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: k6-smoke-test-results
          path: k6/test-results/
          retention-days: 30
      
      - name: Comment PR with results
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            // Parse and comment test results
            // Implementation depends on result format
```

### Advanced Workflow with Multiple Scenarios

```yaml
name: K6 Load Tests

on:
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM UTC

jobs:
  load-tests:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    strategy:
      matrix:
        scenario: [smoke, load]
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Setup application and infrastructure
        run: |
          docker-compose -f docker-compose.dev.yml -f k6/docker-compose.k6.yml up -d
          ./scripts/wait-for-services.sh
      
      - name: Run ${{ matrix.scenario }} test
        env:
          K6_BASE_URL: http://localhost:8000
          K6_FRONTEND_URL: http://localhost:3000
          K6_TEST_USER_EMAIL: ${{ secrets.K6_TEST_USER_EMAIL }}
          K6_TEST_USER_PASSWORD: ${{ secrets.K6_TEST_USER_PASSWORD }}
          INFLUXDB_URL: http://localhost:8086
          INFLUXDB_ORG: k6
          INFLUXDB_BUCKET: k6
          INFLUXDB_TOKEN: ${{ secrets.INFLUXDB_TOKEN }}
        run: |
          cd k6
          ./run-${{ matrix.scenario }}-test.sh
      
      - name: Parse and publish results
        if: always()
        run: |
          # Parse K6 JSON output
          # Publish to job summary or external service
```

### Performance Regression Detection

```yaml
- name: Detect performance regression
  run: |
    # Compare current results with baseline
    CURRENT_P95=$(jq '.metrics.http_req_duration.values.p95' current-results.json)
    BASELINE_P95=$(jq '.metrics.http_req_duration.values.p95' baseline-results.json)
    
    # Calculate percentage increase
    INCREASE=$(echo "scale=2; ($CURRENT_P95 - $BASELINE_P95) / $BASELINE_P95 * 100" | bc)
    
    # Fail if > 20% degradation
    if (( $(echo "$INCREASE > 20" | bc -l) )); then
      echo "Performance regression detected: p95 increased by ${INCREASE}%"
      exit 1
    fi
```

## GitLab CI Integration

### Basic Pipeline

Create `.gitlab-ci.yml`:

```yaml
stages:
  - test
  - performance

variables:
  DOCKER_DRIVER: overlay2
  DOCKER_TLS_CERTDIR: "/certs"

k6-smoke-test:
  stage: performance
  image: docker:latest
  services:
    - docker:dind
  before_script:
    - apk add --no-cache bash
    - docker-compose -f docker-compose.dev.yml -f k6/docker-compose.k6.yml up -d
    - sleep 20  # Wait for services
  script:
    - cd k6
    - export INFLUXDB_TOKEN=$(docker exec influxdb-k6 influx auth create --org k6 --all-access --json | jq -r '.token')
    - ./run-smoke-test.sh
  artifacts:
    when: always
    paths:
      - k6/test-results/
    expire_in: 30 days
  only:
    - merge_requests
    - main
```

## Jenkins Integration

### Jenkinsfile

```groovy
pipeline {
    agent any
    
    environment {
        K6_BASE_URL = 'http://localhost:8000'
        K6_FRONTEND_URL = 'http://localhost:3000'
    }
    
    stages {
        stage('Setup') {
            steps {
                sh 'docker-compose -f docker-compose.dev.yml -f k6/docker-compose.k6.yml up -d'
                sh 'sleep 20'
            }
        }
        
        stage('Run Smoke Test') {
            steps {
                dir('k6') {
                    sh './run-smoke-test.sh'
                }
            }
        }
        
        stage('Publish Results') {
            steps {
                // Publish test results
                archiveArtifacts artifacts: 'k6/test-results/**/*', fingerprint: true
            }
        }
    }
    
    post {
        always {
            sh 'docker-compose down'
        }
        success {
            // Notify on success
        }
        failure {
            // Notify on failure
        }
    }
}
```

## Environment Variables

### Required Secrets

Set these as CI/CD secrets:

```bash
K6_TEST_USER_EMAIL=test@example.com
K6_TEST_USER_PASSWORD=testpassword123
INFLUXDB_TOKEN=<generated-token>
```

### Optional Configuration

```bash
K6_BASE_URL=http://localhost:8000
K6_FRONTEND_URL=http://localhost:3000
INFLUXDB_URL=http://localhost:8086
INFLUXDB_ORG=k6
INFLUXDB_BUCKET=k6
```

## Performance Gates

### Fail on Threshold Violations

K6 automatically fails if thresholds are violated:

```bash
# Exit code will be non-zero if thresholds fail
./k6/run-smoke-test.sh
if [ $? -ne 0 ]; then
  echo "Performance thresholds violated"
  exit 1
fi
```

### Custom Gates

Add custom performance gates:

```bash
# Extract metrics from K6 JSON output
P95=$(jq '.metrics.http_req_duration.values.p95' results.json)
ERROR_RATE=$(jq '.metrics.http_req_failed.values.rate' results.json)

# Custom gates
if (( $(echo "$P95 > 300" | bc -l) )); then
  echo "p95 latency too high: ${P95}ms"
  exit 1
fi

if (( $(echo "$ERROR_RATE > 0.01" | bc -l) )); then
  echo "Error rate too high: ${ERROR_RATE}"
  exit 1
fi
```

## Result Storage and Visualization

### Store Results as Artifacts

```yaml
- name: Upload test results
  uses: actions/upload-artifact@v3
  with:
    name: k6-results
    path: k6/test-results/
    retention-days: 90
```

### Send to External InfluxDB

For production CI/CD, use external InfluxDB instance:

```yaml
- name: Run test with external InfluxDB
  env:
    INFLUXDB_URL: https://influxdb.example.com
    INFLUXDB_TOKEN: ${{ secrets.PRODUCTION_INFLUXDB_TOKEN }}
  run: ./k6/run-load-test.sh
```

### Grafana Integration

1. Configure Grafana to read from CI/CD InfluxDB
2. Create dashboards for CI/CD results
3. Set up alerts for performance regressions
4. Track performance trends over time

## Best Practices

### 1. Run Smoke Tests on Every PR

- Fast feedback
- Catch critical issues early
- Low resource usage

### 2. Run Load Tests on Main Branch

- More comprehensive testing
- Resource intensive
- Less frequent execution

### 3. Store Results for Comparison

- Enable regression detection
- Track performance trends
- Historical analysis

### 4. Use Appropriate Timeouts

```yaml
timeout-minutes: 30  # For load tests
timeout-minutes: 5   # For smoke tests
```

### 5. Fail Fast on Critical Issues

- Use `abortOnFail` for critical thresholds
- Fail immediately on high error rates
- Don't wait for test completion

### 6. Parallel Execution

Run multiple scenarios in parallel (if resources allow):

```yaml
strategy:
  matrix:
    scenario: [smoke, load]
```

### 7. Conditional Execution

Only run expensive tests when needed:

```yaml
- name: Run load test
  if: github.event_name == 'schedule' || contains(github.event.head_commit.message, '[run-load-test]')
  run: ./k6/run-load-test.sh
```

## Troubleshooting

### Common Issues

1. **Timeouts**: Increase timeout or reduce test duration
2. **Resource Limits**: Use smaller VU counts in CI
3. **Network Issues**: Ensure services are accessible
4. **Token Generation**: Cache tokens or use secrets

### Debugging

Enable verbose output:

```bash
docker run --rm -i grafana/k6 run --verbose /scripts/scenarios/smoke-test.js
```

Check service logs:

```bash
docker-compose logs application
docker-compose logs influxdb
```

## Example: Complete GitHub Actions Workflow

See `k6/.github/workflows/k6-load-test.yml.example` for a complete example.

## Next Steps

- Review [TEST_SCENARIOS.md](TEST_SCENARIOS.md) for test scenario details
- See [THRESHOLDS.md](THRESHOLDS.md) for threshold configuration
- Check main [README.md](../README.md) for setup instructions

