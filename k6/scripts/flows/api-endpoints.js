/**
 * API Endpoint Flow Tests
 * Tests for critical API endpoints (tasks, campaigns, projects, etc.)
 */

import { check, sleep } from 'k6';
import http from 'k6/http';
import { getAuthHeaders } from '../utils/auth.js';
import { endpoints } from '../utils/endpoints.js';
import { makeRequest, checkResponse, executeGroup, parseJSON, randomString } from '../utils/helpers.js';

/**
 * Test health check endpoint
 * @param {Object} httpModule - K6 http module (optional, defaults to global)
 * @returns {Object} - Test result
 */
export function testHealthCheck(httpModule = http) {
  return executeGroup('API - Health Check', () => {
    const response = makeRequest(
      httpModule,
      'GET',
      endpoints.health.health,
      null,
      {
        tags: {
          name: 'health_check',
          flow: 'api_endpoints',
        },
      }
    );
    
    const isValid = checkResponse(response, 200, 'health check');
    
    check(response, {
      'health check returns OK': () => response.body === 'OK' || response.status === 200,
      'health check is fast': () => response.timings.duration < 100,
    });
    
    return {
      success: isValid,
      response,
    };
  });
}

/**
 * Test tasks list endpoint (requires authentication)
 * @param {string} token - Access token
 * @param {Object} httpModule - K6 http module (optional, defaults to global)
 * @returns {Object} - Test result with tasks data
 */
export function testTasksList(token, httpModule = http) {
  return executeGroup('API - Tasks List', () => {
    if (!token) {
      return { success: false, error: 'Token required' };
    }
    
    const headers = getAuthHeaders(token);
    
    const response = makeRequest(
      httpModule,
      'GET',
      endpoints.tasks.list,
      null,
      {
        headers,
        tags: {
          name: 'tasks_list',
          flow: 'api_endpoints',
        },
      }
    );
    
    const isValid = checkResponse(response, [200, 404], 'tasks list');
    
    let tasksData = null;
    if (isValid && response.status === 200) {
      try {
        tasksData = parseJSON(response);
        check(response, {
          'tasks list returns array': () => Array.isArray(tasksData) || (tasksData.results && Array.isArray(tasksData.results)),
        });
      } catch (e) {
        console.error('Failed to parse tasks response:', e);
      }
    }
    
    return {
      success: isValid,
      tasks: tasksData,
      response,
    };
  });
}

/**
 * Test campaigns list endpoint (requires authentication)
 * @param {string} token - Access token
 * @param {Object} httpModule - K6 http module (optional, defaults to global)
 * @returns {Object} - Test result with campaigns data
 */
export function testCampaignsList(token, httpModule = http) {
  return executeGroup('API - Campaigns List', () => {
    if (!token) {
      return { success: false, error: 'Token required' };
    }
    
    const headers = getAuthHeaders(token);
    
    const response = makeRequest(
      httpModule,
      'GET',
      endpoints.campaigns.list,
      null,
      {
        headers,
        tags: {
          name: 'campaigns_list',
          flow: 'api_endpoints',
        },
      }
    );
    
    const isValid = checkResponse(response, [200, 404], 'campaigns list');
    
    let campaignsData = null;
    if (isValid && response.status === 200) {
      campaignsData = parseJSON(response);
    }
    
    return {
      success: isValid,
      campaigns: campaignsData,
      response,
    };
  });
}

/**
 * Test projects list endpoint (requires authentication)
 * @param {string} token - Access token
 * @param {Object} httpModule - K6 http module (optional, defaults to global)
 * @returns {Object} - Test result with projects data
 */
export function testProjectsList(token, httpModule = http) {
  return executeGroup('API - Projects List', () => {
    if (!token) {
      return { success: false, error: 'Token required' };
    }
    
    const headers = getAuthHeaders(token);
    
    const response = makeRequest(
      httpModule,
      'GET',
      endpoints.core.projects,
      null,
      {
        headers,
        tags: {
          name: 'projects_list',
          flow: 'api_endpoints',
        },
      }
    );
    
    const isValid = checkResponse(response, [200, 404], 'projects list');
    
    let projectsData = null;
    if (isValid && response.status === 200) {
      projectsData = parseJSON(response);
    }
    
    return {
      success: isValid,
      projects: projectsData,
      response,
    };
  });
}

/**
 * Test assets list endpoint (requires authentication)
 * @param {string} token - Access token
 * @param {Object} httpModule - K6 http module (optional, defaults to global)
 * @returns {Object} - Test result with assets data
 */
export function testAssetsList(token, httpModule = http) {
  return executeGroup('API - Assets List', () => {
    if (!token) {
      return { success: false, error: 'Token required' };
    }
    
    const headers = getAuthHeaders(token);
    
    const response = makeRequest(
      httpModule,
      'GET',
      endpoints.assets.list,
      null,
      {
        headers,
        tags: {
          name: 'assets_list',
          flow: 'api_endpoints',
        },
      }
    );
    
    const isValid = checkResponse(response, [200, 404], 'assets list');
    
    let assetsData = null;
    if (isValid && response.status === 200) {
      assetsData = parseJSON(response);
    }
    
    return {
      success: isValid,
      assets: assetsData,
      response,
    };
  });
}

/**
 * Test complete API endpoint flow: authenticate and test multiple endpoints
 * @param {string} token - Access token (optional, will authenticate if not provided)
 * @param {Object} httpModule - K6 http module (optional, defaults to global)
 * @returns {Object} - Complete API test result
 */
export function completeApiFlow(token = null, httpModule = http) {
  const results = {
    health: null,
    tasks: null,
    campaigns: null,
    projects: null,
    assets: null,
  };
  
  // Test health check (no auth required)
  results.health = testHealthCheck(httpModule);
  sleep(0.3);
  
  // If no token provided, skip authenticated endpoints
  if (!token) {
    return {
      success: results.health.success,
      results,
    };
  }
  
  // Test authenticated endpoints
  results.tasks = testTasksList(token, httpModule);
  sleep(0.3);
  
  results.campaigns = testCampaignsList(token, httpModule);
  sleep(0.3);
  
  results.projects = testProjectsList(token, httpModule);
  sleep(0.3);
  
  results.assets = testAssetsList(token, httpModule);
  
  const allSuccess = Object.values(results).every(result => result && result.success);
  
  return {
    success: allSuccess,
    results,
  };
}


