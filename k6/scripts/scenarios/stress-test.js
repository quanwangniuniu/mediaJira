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
    console.error(`[Setup] Request hostname: ${new URL(healthURL).hostname}`);
    console.error(`[Setup] Response body: ${healthCheck.body?.substring(0, 200)}`);
  } else {
    console.log(`[Setup] Health check passed successfully`);
  }
  
  console.log('Starting stress test - pushing system beyond normal capacity');
  
  return {
    baseURL,
    frontendURL: __ENV.K6_FRONTEND_URL || 'http://localhost:3000',
    startTime: new Date().toISOString(),
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


