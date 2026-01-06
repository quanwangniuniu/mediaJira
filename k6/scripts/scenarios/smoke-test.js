/**
 * Smoke Test Scenario
 * Minimal load test to verify system works under minimal load (1-2 VUs)
 * All thresholds must pass
 */

import http from 'k6/http';
import { check } from 'k6';
import { getThresholds } from '../config.js';
import { completeAuthFlow } from '../flows/authentication.js';
import { completeApiFlow } from '../flows/api-endpoints.js';
import { completePageLoadFlow } from '../flows/page-loads.js';
import { performHealthCheck } from '../utils/setup.js';

// Test configuration
export const options = {
  vus: 1,
  duration: '30s',
  thresholds: getThresholds('smoke'),
  tags: {
    test_type: 'smoke',
  },
  // Note: abortOnFail is not directly supported in K6 options
  // Thresholds will be reported but won't abort the test
  // To abort on threshold failure, use --abort-on-fail flag or handle in teardown
};

/**
 * Main test function
 */
export default function () {
  // Test authentication flow
  const authResult = completeAuthFlow();
  
  const authChecks = check(authResult, {
    'authentication flow completed successfully': (result) => result.success === true,
    'authentication token obtained': (result) => result.token !== null && result.token !== undefined,
    'user profile retrieved': (result) => result.user !== null,
  });
  
  // Log authentication issues
  if (!authResult.success) {
    console.warn('Authentication failed:', authResult.error || 'Unknown error');
    if (authResult.login && authResult.login.response) {
      console.warn('Login response status:', authResult.login.response.status);
      const bodyPreview = authResult.login.response.body ? authResult.login.response.body.substring(0, 200) : 'No response body';
      console.warn('Login response body:', bodyPreview);
    }
  }
  
  // If authentication succeeded, test API endpoints
  if (authResult.success && authResult.token) {
    const apiResult = completeApiFlow(authResult.token);
    
    check(apiResult, {
      'API flow completed successfully': (result) => result.success === true,
      'health check passed': (result) => result.results.health && result.results.health.success,
    });
  } else {
    console.warn('Skipping API flow tests - authentication failed');
  }
  
  // Test page loads (no auth required)
  const pageLoadResult = completePageLoadFlow();
  
  check(pageLoadResult, {
    'page load flow completed': (result) => result.success === true,
    'home page loaded': (result) => result.results.home && result.results.home.success,
    'login page loaded': (result) => result.results.login && result.results.login.success,
  });
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
  // Optional: Cleanup or final checks
  console.log('Smoke test completed');
}


