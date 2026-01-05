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
  // Get baseURL from environment variable
  const baseURL = __ENV.K6_BASE_URL || 'http://localhost:8000';
  
  // Log the baseURL being used for debugging
  console.log(`[Setup] Using baseURL: ${baseURL}`);
  console.log(`[Setup] K6_BASE_URL env var: ${__ENV.K6_BASE_URL || 'not set'}`);
  
  // Ensure baseURL doesn't have trailing slash, then add /health/ with trailing slash
  const healthURL = `${baseURL.replace(/\/$/, '')}/health/`;
  console.log(`[Setup] Health check URL: ${healthURL}`);
  
  // Extract hostname from URL manually (K6 doesn't have URL constructor)
  // Parse http://hostname:port/path -> hostname:port
  const urlMatch = healthURL.match(/^https?:\/\/([^\/]+)/);
  const requestHostname = urlMatch ? urlMatch[1] : 'localhost';
  
  // Set Host header to 'localhost' to avoid Django ALLOWED_HOSTS issues
  // We use service names for connection, but set Host header to localhost
  const requestHeaders = {
    'Host': 'localhost',
  };
  
  console.log(`[Setup] Connecting to: ${requestHostname}, but setting Host header to: localhost`);
  
  const healthCheck = http.get(healthURL, { 
    timeout: '10s',
    headers: requestHeaders,
  });
  
  check(healthCheck, {
    'setup: health check passed': (r) => r.status === 200,
  });
  
  if (healthCheck.status !== 200) {
    console.error(`[Setup] Health check failed with status ${healthCheck.status}`);
    console.error(`[Setup] Health check URL: ${healthURL}`);
    console.error(`[Setup] Request hostname: ${requestHostname}`);
    console.error(`[Setup] Host header set to: localhost`);
    console.error(`[Setup] Response body: ${healthCheck.body?.substring(0, 200)}`);
    throw new Error(`Health check failed: ${healthCheck.status}`);
  }
  
  console.log(`[Setup] Health check passed successfully`);
  
  return {
    baseURL,
    frontendURL: __ENV.K6_FRONTEND_URL || 'http://localhost:3000',
    startTime: new Date().toISOString(),
  };
}

/**
 * Teardown function - runs once after the test
 */
export function teardown(data) {
  console.log(`Load test completed. Started at: ${data.startTime}`);
}


