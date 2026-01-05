/**
 * Authentication Flow Tests
 * Tests for user authentication endpoints
 */

import { check, sleep } from 'k6';
import http from 'k6/http';
import { authFlow, getAuthHeaders } from '../utils/auth.js';
import { endpoints } from '../utils/endpoints.js';
import { makeRequest, checkResponse, executeGroup } from '../utils/helpers.js';
import { config } from '../config.js';

/**
 * Test login endpoint
 * @param {Object} http - K6 http module (optional, defaults to global)
 * @returns {Object} - Test result with token
 */
export function testLogin(httpModule = http) {
  return executeGroup('Authentication - Login', () => {
    const loginPayload = {
      email: config.testUser.email,
      password: config.testUser.password,
    };
    
    const response = makeRequest(
      httpModule,
      'POST',
      endpoints.auth.login,
      loginPayload,
      {
        tags: {
          name: 'auth_login',
          flow: 'authentication',
        },
      }
    );
    
    const isValid = checkResponse(response, 200, 'login');
    
    let token = null;
    if (isValid && response.status === 200) {
      try {
        const body = JSON.parse(response.body);
        token = body.token;
        check(response, {
          'login response has token': () => token !== null && token !== undefined,
          'login response has user data': () => body.user !== undefined,
        });
      } catch (e) {
        console.error('Failed to parse login response:', e);
      }
    }
    
    sleep(0.5); // Small delay after login
    
    return {
      success: isValid && token !== null,
      token,
      response,
    };
  });
}

/**
 * Test user profile endpoint (requires authentication)
 * @param {string} token - Access token
 * @param {Object} http - K6 http module (optional, defaults to global)
 * @returns {Object} - Test result with user data
 */
export function testGetProfile(token, httpModule = http) {
  return executeGroup('Authentication - Get Profile', () => {
    if (!token) {
      return { success: false, error: 'Token required' };
    }
    
    const headers = getAuthHeaders(token);
    
    const response = makeRequest(
      httpModule,
      'GET',
      endpoints.auth.me,
      null,
      {
        headers,
        tags: {
          name: 'auth_me',
          flow: 'authentication',
        },
      }
    );
    
    const isValid = checkResponse(response, 200, 'get profile');
    
    let userData = null;
    if (isValid && response.status === 200) {
      try {
        userData = JSON.parse(response.body);
        check(response, {
          'profile response has user id': () => userData.id !== undefined,
          'profile response has email': () => userData.email !== undefined,
        });
      } catch (e) {
        console.error('Failed to parse profile response:', e);
      }
    }
    
    return {
      success: isValid && userData !== null,
      user: userData,
      response,
    };
  });
}

/**
 * Test user teams endpoint (requires authentication)
 * @param {string} token - Access token
 * @param {Object} http - K6 http module (optional, defaults to global)
 * @returns {Object} - Test result with teams data
 */
export function testGetTeams(token, httpModule = http) {
  return executeGroup('Authentication - Get Teams', () => {
    if (!token) {
      return { success: false, error: 'Token required' };
    }
    
    const headers = getAuthHeaders(token);
    
    const response = makeRequest(
      httpModule,
      'GET',
      endpoints.auth.meTeams,
      null,
      {
        headers,
        tags: {
          name: 'auth_me_teams',
          flow: 'authentication',
        },
      }
    );
    
    const isValid = checkResponse(response, [200, 404], 'get teams'); // 404 is OK if no teams
    
    let teamsData = null;
    if (isValid && response.status === 200) {
      try {
        teamsData = JSON.parse(response.body);
      } catch (e) {
        console.error('Failed to parse teams response:', e);
      }
    }
    
    return {
      success: isValid,
      teams: teamsData,
      response,
    };
  });
}

/**
 * Complete authentication flow: login, get profile, get teams
 * @param {Object} http - K6 http module (optional, defaults to global)
 * @returns {Object} - Complete authentication result
 */
export function completeAuthFlow(httpModule = http) {
  const loginResult = testLogin(httpModule);
  
  if (!loginResult.success || !loginResult.token) {
    return {
      success: false,
      error: 'Login failed',
      login: loginResult,
    };
  }
  
  sleep(0.2);
  
  const profileResult = testGetProfile(loginResult.token, httpModule);
  
  sleep(0.2);
  
  const teamsResult = testGetTeams(loginResult.token, httpModule);
  
  return {
    success: loginResult.success && profileResult.success,
    token: loginResult.token,
    user: profileResult.user,
    teams: teamsResult.teams,
    login: loginResult,
    profile: profileResult,
    teams: teamsResult,
  };
}

/**
 * Test authentication with invalid credentials
 * @param {Object} http - K6 http module (optional, defaults to global)
 * @returns {Object} - Test result
 */
export function testInvalidLogin(httpModule = http) {
  return executeGroup('Authentication - Invalid Login', () => {
    const loginPayload = {
      email: 'invalid@example.com',
      password: 'wrongpassword',
    };
    
    const response = makeRequest(
      httpModule,
      'POST',
      endpoints.auth.login,
      loginPayload,
      {
        tags: {
          name: 'auth_login_invalid',
          flow: 'authentication',
        },
      }
    );
    
    // Should return 401 for invalid credentials
    const isValid = checkResponse(response, 401, 'invalid login');
    
    check(response, {
      'invalid login returns 401': () => response.status === 401,
      'invalid login has error message': () => {
        try {
          const body = JSON.parse(response.body);
          return body.error !== undefined;
        } catch (e) {
          return false;
        }
      },
    });
    
    return {
      success: isValid,
      response,
    };
  });
}


