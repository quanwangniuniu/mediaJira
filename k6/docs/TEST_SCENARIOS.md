# Test Scenarios Guide

Comprehensive guide to K6 load test scenarios, their purposes, configurations, and interpretation of results.

## Scenario Overview

### Smoke Test

**Purpose**: Quick verification that the system works under minimal load.

**Configuration**:
- Virtual Users: 1
- Duration: 30 seconds
- Ramping: Constant (no ramping)

**What to Test**:
- Basic authentication flow
- Critical API endpoints (health, tasks, projects)
- Frontend page loads
- All performance thresholds must pass

**Expected Results**:
- All requests should succeed
- Response times should be minimal
- No errors
- All thresholds pass

**When to Run**:
- Before deploying to production
- After major code changes
- As part of CI/CD pipeline
- Quick sanity check

**Interpreting Results**:
- If smoke test fails, the system is not ready for load
- Use as a gate before running longer tests
- Focus on fixing failures before proceeding

### Load Test

**Purpose**: Measure normal capacity and establish performance baseline.

**Configuration**:
- Stages:
  - 0→10 VUs over 2 minutes (ramp-up)
  - 10→50 VUs over 5 minutes (gradual increase)
  - 50 VUs for 5 minutes (sustained load)
  - 50→0 VUs over 2 minutes (cool-down)
- Total Duration: ~14 minutes

**What to Test**:
- Full authentication flow
- All API endpoints
- Frontend pages
- Standard performance thresholds

**Expected Results**:
- System handles load smoothly
- Response times within thresholds
- Error rate < 1%
- Stable resource usage

**When to Run**:
- Weekly/monthly performance checks
- Before major releases
- After infrastructure changes
- To establish baseline metrics

**Interpreting Results**:
- Document p95 latencies for each endpoint
- Identify slow endpoints for optimization
- Establish capacity baseline
- Compare against previous runs for regression detection

**Establishing Baseline**:
1. Run load test 3 times on stable system
2. Average the p95 latencies per endpoint
3. Document max VUs before errors exceed 1%
4. Store results in performance baseline document
5. Set thresholds based on baseline + 20% buffer

### Stress Test

**Purpose**: Find breaking points and test recovery behavior.

**Configuration**:
- Stages:
  - 0→50 VUs over 2 minutes
  - 50→100 VUs over 5 minutes
  - 100→200 VUs over 5 minutes (beyond normal capacity)
  - 200→0 VUs over 2 minutes
- Total Duration: ~14 minutes

**What to Test**:
- Core endpoints (simplified flow)
- System behavior under extreme load
- Recovery after load reduction
- Relaxed thresholds (higher latency acceptable)

**Expected Results**:
- System may slow down but should not crash
- Errors may increase but should recover
- Response times will increase significantly
- System should recover when load reduces

**When to Run**:
- Capacity planning
- Before traffic spikes (product launches, marketing events)
- After infrastructure scaling
- To validate auto-scaling policies

**Interpreting Results**:
- Identify breaking point (VU count where errors spike)
- Document recovery behavior
- Note resource bottlenecks (CPU, memory, database)
- Use for capacity planning

**Key Metrics to Watch**:
- Point where error rate exceeds 5%
- Maximum VU count before system failure
- Recovery time after load reduction
- Resource utilization at breaking point

### Spike Test

**Purpose**: Test system recovery after sudden load spikes.

**Configuration**:
- Stages:
  - 0→100 VUs over 10 seconds (sudden spike)
  - 100 VUs for 1 minute (maintain spike)
  - 100→0 VUs over 10 seconds (sudden drop)
- Total Duration: ~1.5 minutes

**What to Test**:
- Health check endpoint
- Authentication flow
- Homepage load
- Rapid iteration cycles

**Expected Results**:
- System may struggle initially but should stabilize
- Error rate may spike but should recover
- Response times spike then stabilize
- System recovers after spike ends

**When to Run**:
- Validate auto-scaling mechanisms
- Test rate limiting effectiveness
- Verify circuit breakers
- Before events with expected traffic spikes

**Interpreting Results**:
- Measure recovery time after spike
- Identify if auto-scaling triggers correctly
- Check if rate limiting prevents overload
- Validate system resilience

**Key Metrics to Watch**:
- Time to stabilize after spike
- Error rate during spike
- Recovery behavior after drop
- Auto-scaling response time

## Running Scenarios

### Sequential Execution

Run all scenarios in sequence:

```bash
python k6/run_all_tests.py
```

**⚠️ WARNING:** This will run stress and spike tests which are very aggressive. Make sure you're on a dedicated test machine or have set resource limits.

### Individual Execution

Run specific scenarios:

```bash
# ✅ SAFE: Smoke test (1 VU, 30 seconds) - Start here!
python k6/run_smoke_test.py

# ⚠️ MODERATE: Load test (10→50 VUs, ~14 minutes)
python k6/run_load_test.py

# 🔴 AGGRESSIVE: Stress test (50→200 VUs, ~14 minutes)
#   ⚠️ WARNING: Will push system BEYOND normal capacity
python k6/run_stress_test.py

# 🔴 EXTREME: Spike test (0→100 VUs in 10 seconds)
#   ⚠️ WARNING: Sudden load spike may overwhelm system
python k6/run_spike_test.py
```

**Alternative: Using docker compose directly:**

```bash
# Smoke test
docker compose -f docker-compose.dev.yml run --rm --no-deps k6 run /scripts/scenarios/smoke-test.js

# Load test
docker compose -f docker-compose.dev.yml run --rm --no-deps k6 run /scripts/scenarios/load-test.js
```

### Custom Configuration

Edit scenario files in `scripts/scenarios/` to customize:

- VU counts
- Ramping strategies
- Test duration
- Threshold values

Example: Modify load test stages in `scripts/scenarios/load-test.js`:

```javascript
export const options = {
  stages: [
    { duration: '1m', target: 20 },   // Faster ramp-up
    { duration: '5m', target: 100 },  // Higher load
    { duration: '5m', target: 100 },
    { duration: '2m', target: 0 },
  ],
  // ...
};
```

## Result Analysis

### Key Metrics

1. **Request Rate**: Requests per second
   - Indicates throughput
   - Compare across scenarios

2. **Response Time Percentiles**: p50, p95, p99
   - p95 most important for SLA
   - p99 shows tail latency

3. **Error Rate**: Percentage of failed requests
   - Should be < 1% for normal load
   - May be higher in stress/spike tests

4. **Active Virtual Users**: Current load
   - Correlate with performance metrics
   - Identify capacity limits

5. **HTTP Status Codes**: Distribution
   - 2xx: Success
   - 4xx: Client errors (check test config)
   - 5xx: Server errors (check application)

### Comparing Results

1. **Baseline Comparison**:
   - Compare against established baseline
   - Look for regressions (> 20% degradation)
   - Identify improvements

2. **Scenario Comparison**:
   - Compare smoke vs load (should be similar)
   - Compare load vs stress (performance degradation expected)
   - Compare stress vs spike (recovery behavior)

3. **Historical Comparison**:
   - Track metrics over time
   - Identify trends
   - Detect gradual degradation

## Best Practices

### Before Running Tests

1. Ensure application is in stable state
2. Verify test user credentials
3. Check InfluxDB is running and accessible
4. Confirm Grafana dashboard is configured
5. Close unnecessary applications to free resources

### During Test Execution

1. Monitor Grafana dashboard in real-time
2. Watch application logs for errors
3. Monitor system resources (CPU, memory)
4. Note any anomalies or unexpected behavior

### After Test Execution

1. Review Grafana dashboard results
2. Check application logs for errors
3. Analyze threshold pass/fail status
4. Document findings and recommendations
5. Update baseline if system performance changed

### Test Frequency Recommendations

- **Smoke Test**: Before every deployment, in CI/CD
- **Load Test**: Weekly or before major releases
- **Stress Test**: Monthly or after infrastructure changes
- **Spike Test**: Before events with expected traffic spikes

## Troubleshooting

### Common Issues

1. **High Error Rates**:
   - Check application logs
   - Verify database connections
   - Review resource constraints
   - Check rate limiting settings

2. **Slow Response Times**:
   - Identify slow endpoints
   - Check database query performance
   - Review caching strategy
   - Verify CDN configuration (if applicable)

3. **Test Failures**:
   - Verify application is running
   - Check network connectivity
   - Review test user credentials
   - Validate endpoint URLs

4. **InfluxDB Connection Issues**:
   - Verify InfluxDB is running
   - Check token is valid
   - Review network configuration
   - Confirm bucket and org exist

## Next Steps

- Review [THRESHOLDS.md](THRESHOLDS.md) for threshold tuning
- See [CI_INTEGRATION.md](CI_INTEGRATION.md) for CI/CD integration
- Check main [README.md](../README.md) for quick reference

