/**
 * Common Setup Utilities
 * Shared setup logic for all test scenarios
 * 
 * IMPORTANT: K6 JavaScript Runtime Compatibility
 * - K6 uses ES5.1 JavaScript runtime (does not support ES2020+ features)
 * - Do NOT use optional chaining (`?.`) - use explicit null checks instead
 * - Example: `response.body ? response.body.substring(0, 200) : 'No body'` (NOT `response.body?.substring(0, 200)`)
 * - Do NOT use `URL` constructor - use regex parsing instead
 * - All code in this file and related utilities must be ES5.1 compatible
 */

import http from 'k6/http';
import { check } from 'k6';

/**
 * Perform health check before test starts
 * @param {string} baseURL - Base URL for the backend service
 * @returns {Object} - Setup data with baseURL and frontendURL
 */
export function performHealthCheck(baseURL) {
  // Log the baseURL being used for debugging
  const actualBaseURL = baseURL || __ENV.K6_BASE_URL || 'http://localhost:8000';
  console.log(`[Setup] Using baseURL: ${actualBaseURL}`);
  console.log(`[Setup] K6_BASE_URL env var: ${__ENV.K6_BASE_URL || 'not set'}`);
  
  // Ensure baseURL doesn't have trailing slash, then add /health/ with trailing slash
  const healthURL = `${actualBaseURL.replace(/\/$/, '')}/health/`;
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
    // Safe body access - ES5.1 compatible (avoid optional chaining `?.` which is not supported)
    // Pattern: use explicit null check instead of optional chaining
    const bodyPreview = healthCheck.body ? healthCheck.body.substring(0, 200) : 'No response body';
    console.error(`[Setup] Response body: ${bodyPreview}`);
    throw new Error(`Health check failed: ${healthCheck.status}`);
  }
  
  console.log(`[Setup] Health check passed successfully`);
  
  return {
    baseURL: actualBaseURL,
    frontendURL: __ENV.K6_FRONTEND_URL || 'http://localhost:3000',
    startTime: new Date().toISOString(),
  };
}

