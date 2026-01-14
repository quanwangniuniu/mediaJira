/**
 * NextJS Page Load Tests
 * Tests for frontend page load performance
 */

import { check, sleep } from 'k6';
import http from 'k6/http';
import { endpoints } from '../utils/endpoints.js';
import { makeRequest, checkResponse, executeGroup } from '../utils/helpers.js';

/**
 * Test homepage load
 * @param {Object} httpModule - K6 http module (optional, defaults to global)
 * @returns {Object} - Test result
 */
export function testHomePage(httpModule = http) {
  return executeGroup('Page Load - Home', () => {
    const response = makeRequest(
      httpModule,
      'GET',
      endpoints.pages.home,
      null,
      {
        tags: {
          name: 'page_home',
          flow: 'page_loads',
          page_type: 'home',
        },
      }
    );
    
    const isValid = checkResponse(response, 200, 'home page');
    
    check(response, {
      'home page loads successfully': () => response.status === 200,
      'home page has HTML content': () => response.body && response.body.length > 0,
      'home page loads in reasonable time': () => response.timings.duration < 3000,
    });
    
    return {
      success: isValid,
      response,
      loadTime: response.timings.duration,
    };
  });
}

/**
 * Test login page load
 * @param {Object} httpModule - K6 http module (optional, defaults to global)
 * @returns {Object} - Test result
 */
export function testLoginPage(httpModule = http) {
  return executeGroup('Page Load - Login', () => {
    const response = makeRequest(
      httpModule,
      'GET',
      endpoints.pages.login,
      null,
      {
        tags: {
          name: 'page_login',
          flow: 'page_loads',
          page_type: 'login',
        },
      }
    );
    
    const isValid = checkResponse(response, 200, 'login page');
    
    check(response, {
      'login page loads successfully': () => response.status === 200,
      'login page has HTML content': () => response.body && response.body.length > 0,
      'login page loads in reasonable time': () => response.timings.duration < 3000,
    });
    
    return {
      success: isValid,
      response,
      loadTime: response.timings.duration,
    };
  });
}

/**
 * Test tasks page load
 * @param {Object} httpModule - K6 http module (optional, defaults to global)
 * @returns {Object} - Test result
 */
export function testTasksPage(httpModule = http) {
  return executeGroup('Page Load - Tasks', () => {
    const response = makeRequest(
      httpModule,
      'GET',
      endpoints.pages.tasks,
      null,
      {
        tags: {
          name: 'page_tasks',
          flow: 'page_loads',
          page_type: 'tasks',
        },
      }
    );
    
    // Tasks page might redirect to login if not authenticated, so accept 200 or 307/302
    const isValid = checkResponse(response, [200, 302, 307, 401], 'tasks page');
    
    check(response, {
      'tasks page returns valid response': () => [200, 302, 307, 401].includes(response.status),
      'tasks page has content': () => response.body && response.body.length > 0,
    });
    
    return {
      success: isValid,
      response,
      loadTime: response.timings.duration,
    };
  });
}

/**
 * Test campaigns page load
 * @param {Object} httpModule - K6 http module (optional, defaults to global)
 * @returns {Object} - Test result
 */
export function testCampaignsPage(httpModule = http) {
  return executeGroup('Page Load - Campaigns', () => {
    const response = makeRequest(
      httpModule,
      'GET',
      endpoints.pages.campaigns,
      null,
      {
        tags: {
          name: 'page_campaigns',
          flow: 'page_loads',
          page_type: 'campaigns',
        },
      }
    );
    
    // Campaigns page might redirect to login if not authenticated
    const isValid = checkResponse(response, [200, 302, 307, 401], 'campaigns page');
    
    check(response, {
      'campaigns page returns valid response': () => [200, 302, 307, 401].includes(response.status),
      'campaigns page has content': () => response.body && response.body.length > 0,
    });
    
    return {
      success: isValid,
      response,
      loadTime: response.timings.duration,
    };
  });
}

/**
 * Test projects page load
 * @param {Object} httpModule - K6 http module (optional, defaults to global)
 * @returns {Object} - Test result
 */
export function testProjectsPage(httpModule = http) {
  return executeGroup('Page Load - Projects', () => {
    const response = makeRequest(
      httpModule,
      'GET',
      endpoints.pages.projects,
      null,
      {
        tags: {
          name: 'page_projects',
          flow: 'page_loads',
          page_type: 'projects',
        },
      }
    );
    
    const isValid = checkResponse(response, [200, 302, 307, 401], 'projects page');
    
    check(response, {
      'projects page returns valid response': () => [200, 302, 307, 401].includes(response.status),
      'projects page has content': () => response.body && response.body.length > 0,
    });
    
    return {
      success: isValid,
      response,
      loadTime: response.timings.duration,
    };
  });
}

/**
 * Test NextJS metrics endpoint
 * @param {Object} httpModule - K6 http module (optional, defaults to global)
 * @returns {Object} - Test result
 */
export function testMetricsEndpoint(httpModule = http) {
  return executeGroup('Page Load - Metrics', () => {
    const response = makeRequest(
      httpModule,
      'GET',
      endpoints.pages.metrics,
      null,
      {
        tags: {
          name: 'page_metrics',
          flow: 'page_loads',
          page_type: 'metrics',
        },
      }
    );
    
    // Metrics endpoint should return 200, but 404 is also acceptable if not implemented
    const isValid = checkResponse(response, [200, 404], 'metrics endpoint');
    
    return {
      success: isValid,
      response,
      loadTime: response.timings.duration,
    };
  });
}

/**
 * Test complete page load flow: test multiple pages
 * @param {Object} httpModule - K6 http module (optional, defaults to global)
 * @returns {Object} - Complete page load test result
 */
export function completePageLoadFlow(httpModule = http) {
  const results = {
    home: null,
    login: null,
    tasks: null,
    campaigns: null,
    projects: null,
    metrics: null,
  };
  
  results.home = testHomePage(httpModule);
  sleep(0.5);
  
  results.login = testLoginPage(httpModule);
  sleep(0.5);
  
  results.tasks = testTasksPage(httpModule);
  sleep(0.5);
  
  results.campaigns = testCampaignsPage(httpModule);
  sleep(0.5);
  
  results.projects = testProjectsPage(httpModule);
  sleep(0.5);
  
  results.metrics = testMetricsEndpoint(httpModule);
  
  const allSuccess = Object.values(results).every(result => result && result.success);
  
  return {
    success: allSuccess,
    results,
    averageLoadTime: Object.values(results)
      .filter(r => r && r.loadTime)
      .reduce((sum, r) => sum + r.loadTime, 0) / Object.values(results).filter(r => r && r.loadTime).length,
  };
}


