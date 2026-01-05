# Threshold Tuning Guide

Guide to understanding, configuring, and tuning K6 performance thresholds for different test scenarios.

## Overview

Performance thresholds define acceptable performance limits for your application. K6 will fail the test if thresholds are exceeded, helping you catch performance regressions.

## Default Thresholds

Default thresholds are defined in `scripts/config.js`:

### HTTP Request Duration

**Read Operations (GET)**:
- p95 < 200ms
- p99 < 500ms

**Write Operations (POST, PUT, PATCH)**:
- p95 < 500ms
- p99 < 1000ms

**Rationale**: Write operations typically take longer due to database writes, validation, and processing.

### Error Rate

- Rate < 0.01 (1%)

**Rationale**: Production systems should have < 1% error rate. Higher rates indicate system issues.

### Waiting Time (Time to First Byte)

- p95 < 150ms

**Rationale**: TTFB indicates server processing time. Low TTFB ensures good user experience.

### Iteration Duration

- p95 < 1000ms (1 second)

**Rationale**: Complete test iteration (authentication + API calls) should complete quickly.

## Scenario-Specific Thresholds

Thresholds are adjusted based on test scenario type:

### Smoke Test

**Configuration**: Strict thresholds (same as defaults)

**Rationale**: System should perform optimally under minimal load.

**Thresholds**:
```javascript
{
  'http_req_duration': ['p(95)<200', 'p(99)<500'],
  'http_req_failed': ['rate<0.01'],
  'http_req_waiting': ['p(95)<150'],
  'iteration_duration': ['p(95)<1000'],
}
```

### Load Test

**Configuration**: Standard thresholds (same as defaults)

**Rationale**: Normal operating conditions should meet standard thresholds.

**Thresholds**: Same as smoke test (default values)

### Stress Test

**Configuration**: Relaxed thresholds

**Rationale**: System will be pushed beyond normal capacity. Higher latency and error rates are expected.

**Thresholds**:
```javascript
{
  'http_req_duration': ['p(95)<1000', 'p(99)<2000'],  // 5x more lenient
  'http_req_failed': ['rate<0.05'],                    // 5% error rate acceptable
  'http_req_waiting': ['p(95)<500'],
  'iteration_duration': ['p(95)<3000'],
}
```

### Spike Test

**Configuration**: More lenient error rate

**Rationale**: Sudden spikes may cause temporary errors, but system should recover.

**Thresholds**:
```javascript
{
  'http_req_duration': ['p(95)<200', 'p(99)<500'],
  'http_req_failed': ['rate<0.03'],    // 3% error rate acceptable
  'http_req_waiting': ['p(95)<150'],
  'iteration_duration': ['p(95)<1000'],
}
```

## Tuning Thresholds

### Step 1: Establish Baseline

1. Run load test on stable system
2. Document actual p95, p99, and error rates
3. Run 3 times and average results
4. Store baseline metrics

### Step 2: Set Initial Thresholds

Set thresholds based on baseline:

```javascript
// Example: If baseline p95 is 150ms, set threshold to 180ms (20% buffer)
'http_req_duration': ['p(95)<180']
```

**Recommendation**: Baseline + 20% buffer for warning, baseline + 50% for failure threshold.

### Step 3: Refine Based on Business Requirements

Adjust thresholds based on:

- **SLA Requirements**: If SLA requires p95 < 200ms, set threshold accordingly
- **User Expectations**: Consider user experience requirements
- **Business Priorities**: Critical endpoints may need stricter thresholds

### Step 4: Test Threshold Validity

1. Run tests with new thresholds
2. Verify thresholds are achievable
3. Adjust if too strict (frequent failures) or too lenient (missed regressions)

## Threshold Configuration

### Location

Thresholds are configured in:

- **Global defaults**: `scripts/config.js` - `config.thresholds`
- **Scenario-specific**: `scripts/scenarios/*.js` - `options.thresholds`
- **Function**: `scripts/config.js` - `getThresholds(scenarioType)`

### Modifying Thresholds

#### Option 1: Edit Config File

Edit `scripts/config.js`:

```javascript
export const config = {
  thresholds: {
    httpReqDuration: {
      read: ['p(95)<250'],  // Changed from 200ms to 250ms
      write: ['p(95)<600'],
    },
    // ...
  },
};
```

#### Option 2: Edit Scenario File

Edit specific scenario in `scripts/scenarios/load-test.js`:

```javascript
export const options = {
  thresholds: {
    'http_req_duration': ['p(95)<250'],  // Override default
    'http_req_failed': ['rate<0.015'],   // 1.5% error rate
  },
  // ...
};
```

#### Option 3: Use getThresholds Function

The `getThresholds()` function in `config.js` provides scenario-specific defaults:

```javascript
import { getThresholds } from '../config.js';

export const options = {
  thresholds: getThresholds('load'),  // Gets thresholds for load test
  // ...
};
```

## Threshold Types

### Percentile Thresholds

Format: `p(percentile)<value`

Examples:
- `p(95)<200` - 95th percentile must be less than 200ms
- `p(99)<500` - 99th percentile must be less than 500ms
- `p(50)<100` - Median must be less than 100ms

**Use Cases**:
- Response time limits
- Duration limits
- Any metric with distribution

### Rate Thresholds

Format: `rate<value` or `rate>value`

Examples:
- `rate<0.01` - Error rate must be less than 1%
- `rate>0.95` - Success rate must be greater than 95%

**Use Cases**:
- Error rates
- Success rates
- Any ratio metric

### Count Thresholds

Format: `count<value` or `count>value`

Examples:
- `count<100` - Total count must be less than 100
- `count>1000` - Total count must be greater than 1000

**Use Cases**:
- Total errors
- Total requests
- Absolute counts

### Abort Conditions

Add `abortOnFail` to fail test immediately:

```javascript
thresholds: {
  'http_req_failed': [
    { threshold: 'rate<0.01', abortOnFail: true }  // Abort if error rate > 1%
  ],
}
```

Add `delayAbortEval` to wait before aborting:

```javascript
thresholds: {
  'http_req_duration': [
    { threshold: 'p(95)<200', abortOnFail: true, delayAbortEval: '10s' }
  ],
}
```

## Best Practices

### 1. Start Conservative

Begin with stricter thresholds and relax if needed:
- Better to catch issues early
- Easier to relax than tighten
- Prevents performance degradation

### 2. Use Percentiles, Not Averages

- Percentiles show tail behavior (p95, p99)
- Averages hide outliers
- Focus on p95 for SLA, p99 for worst-case

### 3. Set Multiple Thresholds

Use both p95 and p99:
- p95 for normal operations
- p99 for worst-case scenarios
- Helps identify tail latency issues

### 4. Scenario-Appropriate Thresholds

- Smoke test: Strict (all must pass)
- Load test: Standard (realistic expectations)
- Stress test: Relaxed (expected degradation)
- Spike test: Error-tolerant (recovery focus)

### 5. Endpoint-Specific Thresholds

Set different thresholds per endpoint:

```javascript
thresholds: {
  'http_req_duration{name:health_check}': ['p(95)<50'],   // Health check should be very fast
  'http_req_duration{name:api_tasks}': ['p(95)<300'],     // API calls can be slower
  'http_req_duration{type:write}': ['p(95)<500'],         // Write operations slower
}
```

### 6. Regular Review

- Review thresholds quarterly
- Adjust based on baseline changes
- Update for new requirements
- Document threshold rationale

### 7. Document Rationale

Document why thresholds are set:

```javascript
// Thresholds based on SLA requirement: p95 < 200ms for all API endpoints
// Baseline measurement: p95 = 150ms (measured 2024-01-15)
// Threshold set to 180ms (baseline + 20% buffer)
thresholds: {
  'http_req_duration': ['p(95)<180'],
}
```

## Common Threshold Values

### Web Applications

| Metric | p50 | p95 | p99 |
|--------|-----|-----|-----|
| API Response | 50ms | 200ms | 500ms |
| Page Load | 100ms | 500ms | 1000ms |
| Database Query | 10ms | 50ms | 100ms |

### API Services

| Metric | p50 | p95 | p99 |
|--------|-----|-----|-----|
| Read Operations | 20ms | 100ms | 200ms |
| Write Operations | 50ms | 200ms | 500ms |
| Complex Queries | 100ms | 500ms | 1000ms |

### Error Rates

- Production: < 0.01 (1%)
- Canary/Staging: < 0.02 (2%)
- Stress Test: < 0.05 (5%)
- Spike Test: < 0.03 (3%)

## Troubleshooting Threshold Failures

### High Response Times

**Symptoms**: `http_req_duration` thresholds failing

**Investigation**:
1. Check which endpoints are slow (Grafana dashboard)
2. Review database query performance
3. Check external API dependencies
4. Verify caching effectiveness

**Actions**:
- Optimize slow endpoints
- Add database indexes
- Implement caching
- Consider increasing threshold if justified

### High Error Rates

**Symptoms**: `http_req_failed` threshold failing

**Investigation**:
1. Check error types (4xx vs 5xx)
2. Review application logs
3. Check database connection pools
4. Verify rate limiting settings

**Actions**:
- Fix application bugs
- Increase connection pool size
- Adjust rate limits
- Review error handling

### High Iteration Duration

**Symptoms**: `iteration_duration` threshold failing

**Investigation**:
1. Identify slow operations in iteration
2. Check authentication performance
3. Review API call sequences
4. Verify network latency

**Actions**:
- Optimize authentication flow
- Reduce number of API calls
- Implement parallel requests
- Review test script efficiency

## Next Steps

- Review [TEST_SCENARIOS.md](TEST_SCENARIOS.md) for scenario details
- See [CI_INTEGRATION.md](CI_INTEGRATION.md) for CI/CD integration
- Check main [README.md](../README.md) for quick reference

