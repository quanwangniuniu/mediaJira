/**
 * Network Connectivity Check Utility
 * Verifies network connectivity before running tests
 * 
 * IMPORTANT: K6 JavaScript Runtime Compatibility
 * - K6 uses ES5.1 JavaScript runtime (does not support ES2020+ features)
 * - Do NOT use optional chaining (`?.`) - use explicit null checks instead
 * - All code must be ES5.1 compatible
 */

import http from 'k6/http';
import { check } from 'k6';

/**
 * Verify network connectivity to backend
 * @param {string} baseURL - Base URL for the backend service
 * @returns {Object} - Connectivity status report
 */
export function verifyNetworkConnectivity(baseURL) {
  const actualBaseURL = baseURL || __ENV.K6_BASE_URL || 'http://localhost:8000';
  const healthURL = `${actualBaseURL.replace(/\/$/, '')}/health/`;
  
  // Extract hostname from URL (ES5.1 compatible - no URL constructor)
  const urlMatch = healthURL.match(/^https?:\/\/([^\/]+)/);
  const hostname = urlMatch ? urlMatch[1].split(':')[0] : 'localhost';
  const port = urlMatch && urlMatch[1].includes(':') ? urlMatch[1].split(':')[1] : '8000';
  
  console.log(`[Network Check] Testing connectivity to ${hostname}:${port}`);
  console.log(`[Network Check] Health check URL: ${healthURL}`);
  
  const results = {
    hostname: hostname,
    port: port,
    url: healthURL,
    dnsResolved: false,
    tcpConnected: false,
    httpResponded: false,
    status: null,
    error: null,
  };
  
  // Test 1: HTTP connectivity (this also tests DNS and TCP)
  try {
    const response = http.get(healthURL, {
      timeout: '5s',
      tags: {
        name: 'network_check',
      },
    });
    
    results.status = response.status;
    
    // DNS resolution test (if status is 0, DNS likely failed)
    if (response.status === 0) {
      results.error = response.error || 'Network error';
      console.error(`[Network Check] ❌ DNS/Network error: ${results.error}`);
      console.error(`[Network Check] Cannot resolve hostname or connect to ${hostname}:${port}`);
      console.error(`[Network Check] Verify:`);
      console.error(`  - Backend service is running: docker compose -f docker-compose.dev.yml ps backend-dev`);
      console.error(`  - Services are on the same Docker network`);
      console.error(`  - Service name is correct: ${hostname}`);
    } else {
      results.dnsResolved = true;
      results.tcpConnected = true;
      console.log(`[Network Check] ✓ DNS resolved and TCP connection established`);
      
      // HTTP response test
      if (response.status === 200) {
        results.httpResponded = true;
        console.log(`[Network Check] ✓ HTTP health check passed (status: 200)`);
      } else {
        results.httpResponded = false;
        console.error(`[Network Check] ⚠️  HTTP responded but with error status: ${response.status}`);
        const bodyPreview = response.body ? response.body.substring(0, 200) : 'No body';
        console.error(`[Network Check] Response: ${bodyPreview}`);
        
        if (response.status === 400) {
          console.error(`[Network Check] Bad Request - Check Django ALLOWED_HOSTS includes: ${hostname}`);
        }
      }
    }
  } catch (e) {
    results.error = e.message;
    console.error(`[Network Check] ❌ Exception during connectivity test: ${e.message}`);
  }
  
  // Summary
  const allPassed = results.dnsResolved && results.tcpConnected && results.httpResponded;
  
  if (allPassed) {
    console.log(`[Network Check] ✓ All connectivity checks passed`);
  } else {
    console.error(`[Network Check] ❌ Connectivity check failed`);
    console.error(`[Network Check] DNS resolved: ${results.dnsResolved ? '✓' : '✗'}`);
    console.error(`[Network Check] TCP connected: ${results.tcpConnected ? '✓' : '✗'}`);
    console.error(`[Network Check] HTTP responded: ${results.httpResponded ? '✓' : '✗'}`);
  }
  
  return results;
}

/**
 * Quick connectivity check (returns boolean)
 * @param {string} baseURL - Base URL for the backend service
 * @returns {boolean} - True if connectivity is OK
 */
export function isBackendReachable(baseURL) {
  const results = verifyNetworkConnectivity(baseURL);
  return results.dnsResolved && results.tcpConnected && results.httpResponded;
}

