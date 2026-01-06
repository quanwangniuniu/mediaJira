/**
 * Spike Test Scenario
 * Sudden spike (0→100 VUs in seconds), test recovery
 * More lenient error rate threshold
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { getThresholds, config } from '../config.js';
import { completeAuthFlow } from '../flows/authentication.js';
import { testHealthCheck } from '../flows/api-endpoints.js';
import { testHomePage } from '../flows/page-loads.js';
import { performHealthCheck } from '../utils/setup.js';

// Test configuration
export const options = {
  stages: config.scenarios.spike.stages,
  thresholds: getThresholds('spike'),
  tags: {
    test_type: 'spike',
  },
};

/**
 * Main test function
 * Simplified for spike test - focus on core functionality
 */
export default function () {
  // Quick health check (lightweight)
  const healthResult = testHealthCheck();
  
  check(healthResult, {
    'health check accessible': (result) => result.success === true,
  });
  
  sleep(0.2);
  
  // Test authentication (critical path)
  const authResult = completeAuthFlow();
  
  check(authResult, {
    'authentication flow completed': (result) => result.success === true || result.token !== null,
  });
  
  sleep(0.2);
  
  // Test homepage load (quick test)
  const homeResult = testHomePage();
  
  check(homeResult, {
    'homepage accessible': (result) => result.success === true,
  });
  
  // Minimal sleep for spike test - we want rapid iterations
  sleep(0.3);
}

/**
 * Setup function - runs once before the test
 */
export function setup() {
  const setupData = performHealthCheck(__ENV.K6_BASE_URL);
  console.log('Starting spike test - sudden load increase to test system recovery');
  return {
    ...setupData,
    testType: 'spike',
  };
}

/**
 * Teardown function - runs once after the test
 */
export function teardown(data) {
  console.log(`Spike test completed. Started at: ${data.startTime}`);
  console.log('Review metrics to assess system recovery after sudden load spike');
}


