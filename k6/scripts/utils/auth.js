/**
 * Authentication Utilities
 * Helper functions for authentication flow in K6 tests
 */

import { check, sleep } from 'k6';
import { endpoints } from './endpoints.js';
import { config } from '../config.js';
import { parseJSON } from './helpers.js';

/**
 * Authenticate user and return access token
 * @param {Object} http - K6 http module
 * @param {Object} params - Request parameters
 * @returns {string|null} - Access token or null if authentication fails
 */
export function authenticate(http, params = {}) {
  const loginPayload = JSON.stringify({
    email: config.testUser.email,
    password: config.testUser.password,
  });
  
  const loginHeaders = {
    'Content-Type': 'application/json',
    ...params.headers,
  };
  
  const loginParams = {
    ...params,
    headers: loginHeaders,
    tags: {
      name: 'auth_login',
      type: 'authentication',
      ...params.tags,
    },
  };
  
  const response = http.post(endpoints.auth.login, loginPayload, loginParams);
  
  const success = check(response, {
    'authentication status is 200': (r) => r.status === 200,
    'authentication response has token': (r) => {
      const body = parseJSON(r, {});
      return body && body.token !== undefined;
    },
  });
  
  if (success && response.status === 200) {
    const body = parseJSON(response, {});
    return body && body.token ? body.token : null;
  }
  
  // Safe body access - ES5.1 compatible (avoid optional chaining)
  const errorBody = response.body ? response.body.substring(0, 200) : 'No response body';
  console.error(`Authentication failed: ${response.status} - ${errorBody}`);
  return null;
}

/**
 * Get authenticated request headers with token
 * @param {string} token - Access token
 * @param {Object} additionalHeaders - Additional headers to include
 * @returns {Object} - Headers object with Authorization token
 */
export function getAuthHeaders(token, additionalHeaders = {}) {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...additionalHeaders,
  };
}

/**
 * Get current user profile (requires authentication)
 * @param {Object} http - K6 http module
 * @param {string} token - Access token
 * @param {Object} params - Request parameters
 * @returns {Object|null} - User profile object or null if request fails
 */
export function getCurrentUser(http, token, params = {}) {
  const headers = getAuthHeaders(token);
  
  const requestParams = {
    ...params,
    headers: {
      ...headers,
      ...params.headers,
    },
    tags: {
      name: 'auth_me',
      type: 'authentication',
      ...params.tags,
    },
  };
  
  const response = http.get(endpoints.auth.me, requestParams);
  
  const success = check(response, {
    'get user profile status is 200': (r) => r.status === 200,
  });
  
  if (success && response.status === 200) {
    return parseJSON(response, null);
  }
  
  return null;
}

/**
 * Complete authentication flow: login and get user profile
 * @param {Object} http - K6 http module
 * @param {Object} params - Request parameters
 * @returns {Object} - Object with token and user profile
 */
export function authFlow(http, params = {}) {
  const token = authenticate(http, params);
  
  if (!token) {
    return { token: null, user: null, success: false };
  }
  
  // Small delay between auth and profile request
  sleep(0.1);
  
  const user = getCurrentUser(http, token, params);
  
  return {
    token,
    user,
    success: token !== null && user !== null,
  };
}


