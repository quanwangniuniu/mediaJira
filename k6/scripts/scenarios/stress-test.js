/**
 * Stress Test Scenario
 * Ramp beyond normal capacity (50-200 VUs), find breaking points
 * Relaxed thresholds (higher latency acceptable)
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { getThresholds, config } from '../config.js';
import { completeAuthFlow } from '../flows/authentication.js';
import { completeApiFlow } from '../flows/api-endpoints.js';
import { testHealthCheck } from '../flows/api-endpoints.js';
import { randomSleep } from '../utils/helpers.js';
import { performHealthCheck } from '../utils/setup.js';

// Test configuration
export const options = {
  stages: config.scenarios.stress.stages,
  thresholds: getThresholds('stress'),
  tags: {
    test_type: 'stress',
  },
};

/**
 * Main test function
 * Simplified for stress test - focus on core endpoints
 */
export default function () {
  // Test authentication (critical path)
  const authResult = completeAuthFlow();
  
  check(authResult, {
    'authentication flow completed': (result) => result.success === true || result.token !== null,
  });
  
  // Small delay
  sleep(0.3);
  
  // If authentication succeeded, test critical API endpoints
  if (authResult.success && authResult.token) {
    // Test health check (lightweight)
    const healthResult = testHealthCheck();
    
    check(healthResult, {
      'health check accessible': (result) => result.success === true,
    });
    
    // Test API endpoints (simplified for stress test)
    const apiResult = completeApiFlow(authResult.token);
    
    check(apiResult, {
      'API endpoints accessible': (result) => result.success === true || result.results.health !== null,
    });
    
    // Reduced sleep time for stress test
    sleep(0.5);
  }
  
  // Random sleep to simulate user behavior
  randomSleep(0.5, 1.5);
}

/**
 * Setup function - runs once before the test
 */
export function setup() {
  const setupData = performHealthCheck(__ENV.K6_BASE_URL);
  console.log('Starting stress test - pushing system beyond normal capacity');
  return {
    ...setupData,
    testType: 'stress',
  };
}

/**
 * Teardown function - runs once after the test
 */
export function teardown(data) {
  console.log(`Stress test completed. Started at: ${data.startTime}`);
  console.log('Review metrics to identify system breaking points and recovery behavior');
}


