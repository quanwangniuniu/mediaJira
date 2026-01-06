/**
 * Load Test Scenario
 * Gradual ramp-up (10-50 VUs), sustained load, measure normal capacity
 * Standard performance thresholds
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { getThresholds, config } from '../config.js';
import { completeAuthFlow } from '../flows/authentication.js';
import { completeApiFlow } from '../flows/api-endpoints.js';
import { completePageLoadFlow } from '../flows/page-loads.js';
import { randomSleep } from '../utils/helpers.js';
import { performHealthCheck } from '../utils/setup.js';

// Test configuration
export const options = {
  stages: config.scenarios.load.stages,
  thresholds: getThresholds('load'),
  tags: {
    test_type: 'load',
  },
};

/**
 * Main test function
 */
export default function () {
  // Test authentication flow
  const authResult = completeAuthFlow();
  
  check(authResult, {
    'authentication flow completed successfully': (result) => result.success === true,
    'authentication token obtained': (result) => result.token !== null && result.token !== undefined,
  });
  
  // Small delay after authentication
  sleep(0.5);
  
  // If authentication succeeded, test API endpoints
  if (authResult.success && authResult.token) {
    const apiResult = completeApiFlow(authResult.token);
    
    check(apiResult, {
      'API flow completed successfully': (result) => result.success === true,
      'health check passed': (result) => result.results.health && result.results.health.success,
      'tasks endpoint accessible': (result) => result.results.tasks && result.results.tasks.success,
    });
    
    // Random sleep between API calls to simulate real user behavior
    randomSleep(1, 2);
  }
  
  // Test page loads (no auth required)
  const pageLoadResult = completePageLoadFlow();
  
  check(pageLoadResult, {
    'page load flow completed': (result) => result.success === true,
    'home page loaded': (result) => result.results.home && result.results.home.success,
  });
  
  // Random sleep at end of iteration to simulate think time
  randomSleep(2, 5);
}

/**
 * Setup function - runs once before the test
 */
export function setup() {
  return performHealthCheck(__ENV.K6_BASE_URL);
}

/**
 * Teardown function - runs once after the test
 */
export function teardown(data) {
  console.log(`Load test completed. Started at: ${data.startTime}`);
}


