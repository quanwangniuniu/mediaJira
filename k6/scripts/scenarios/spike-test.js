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
    timeout: '5s',
    headers: requestHeaders,
  });
  
  check(healthCheck, {
    'setup: health check passed': (r) => r.status === 200,
  });
  
  if (healthCheck.status !== 200) {
    console.error(`[Setup] Health check failed with status ${healthCheck.status}`);
    console.error(`[Setup] Health check URL: ${healthURL}`);
    console.error(`[Setup] Request hostname: ${new URL(healthURL).hostname}`);
    console.error(`[Setup] Response body: ${healthCheck.body?.substring(0, 200)}`);
  } else {
    console.log(`[Setup] Health check passed successfully`);
  }
  
  console.log('Starting spike test - sudden load increase to test system recovery');
  
  return {
    baseURL,
    frontendURL: __ENV.K6_FRONTEND_URL || 'http://localhost:3000',
    startTime: new Date().toISOString(),
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


