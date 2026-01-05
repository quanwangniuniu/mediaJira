/**
 * Helper Utilities
 * Common utility functions for K6 tests
 */

import { check, group, sleep } from 'k6';
import { getEndpointType, getEndpointTag } from './endpoints.js';
import { config } from '../config.js';

/**
 * Make HTTP request with proper tagging and error handling
 * @param {Object} http - K6 http module
 * @param {string} method - HTTP method (GET, POST, etc.)
 * @param {string} url - Request URL
 * @param {*} body - Request body (optional)
 * @param {Object} params - Request parameters
 * @returns {Object} - HTTP response object
 */
export function makeRequest(http, method, url, body = null, params = {}) {
  const endpointType = getEndpointType(method);
  const endpointTag = getEndpointTag(url);
  
  const requestParams = {
    ...config.requestOptions,
    ...params,
    tags: {
      ...config.requestOptions.tags,
      method: method,
      endpoint: endpointTag,
      type: endpointType,
      ...params.tags,
    },
  };
  
  // Add endpoint name for better metrics
  if (!requestParams.tags.name) {
    requestParams.tags.name = `${endpointTag}_${method.toLowerCase()}`;
  }
  
  let response;
  
  switch (method.toUpperCase()) {
    case 'GET':
      response = http.get(url, requestParams);
      break;
    case 'POST':
      response = http.post(url, body ? JSON.stringify(body) : null, requestParams);
      break;
    case 'PUT':
      response = http.put(url, body ? JSON.stringify(body) : null, requestParams);
      break;
    case 'PATCH':
      response = http.patch(url, body ? JSON.stringify(body) : null, requestParams);
      break;
    case 'DELETE':
      response = http.delete(url, requestParams);
      break;
    default:
      throw new Error(`Unsupported HTTP method: ${method}`);
  }
  
  return response;
}

/**
 * Check HTTP response with common validations
 * @param {Object} response - HTTP response object
 * @param {number|number[]} expectedStatus - Expected status code(s)
 * @param {string} name - Check name for reporting
 * @returns {boolean} - True if all checks pass
 */
export function checkResponse(response, expectedStatus = 200, name = 'response') {
  const statusCodes = Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus];
  
  const checks = {};
  statusCodes.forEach((status, index) => {
    checks[`${name} status is ${status}`] = (r) => r.status === status;
  });
  
  checks[`${name} has response time < 5s`] = (r) => r.timings.duration < 5000;
  
  return check(response, checks);
}

/**
 * Execute a group of requests with proper error handling
 * @param {string} groupName - Name of the group
 * @param {Function} groupFunction - Function containing group operations
 * @returns {Object} - Results from group execution
 */
export function executeGroup(groupName, groupFunction) {
  return group(groupName, () => {
    try {
      return groupFunction();
    } catch (error) {
      console.error(`Error in group ${groupName}:`, error);
      return { success: false, error: error.message };
    }
  });
}

/**
 * Random sleep between min and max seconds
 * @param {number} min - Minimum sleep duration in seconds
 * @param {number} max - Maximum sleep duration in seconds
 */
export function randomSleep(min = 1, max = 3) {
  const duration = Math.random() * (max - min) + min;
  return sleep(duration);
}

/**
 * Generate random string for testing
 * @param {number} length - Length of random string
 * @returns {string} - Random string
 */
export function randomString(length = 10) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate random integer between min and max (inclusive)
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} - Random integer
 */
export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Parse JSON response safely
 * @param {Object} response - HTTP response object
 * @param {*} defaultValue - Default value if parsing fails
 * @returns {*} - Parsed JSON or default value
 */
export function parseJSON(response, defaultValue = null) {
  try {
    return JSON.parse(response.body);
  } catch (e) {
    console.error('Failed to parse JSON response:', e);
    return defaultValue;
  }
}

/**
 * Add custom metric tracking
 * @param {Object} Trend - K6 Trend metric constructor
 * @param {string} name - Metric name
 * @param {number} value - Metric value
 * @param {Object} tags - Metric tags
 */
export function trackCustomMetric(Trend, name, value, tags = {}) {
  if (typeof Trend === 'function') {
    const metric = Trend(name);
    metric.add(value, tags);
  }
}

/**
 * Wait for a condition with timeout
 * @param {Function} condition - Function that returns true when condition is met
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {number} intervalMs - Check interval in milliseconds
 * @returns {boolean} - True if condition met, false if timeout
 */
export function waitFor(condition, timeoutMs = 5000, intervalMs = 100) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    if (condition()) {
      return true;
    }
    sleep(intervalMs / 1000);
  }
  
  return false;
}


