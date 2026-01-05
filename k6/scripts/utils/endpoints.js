/**
 * API Endpoint Definitions
 * Centralized endpoint definitions for Django and NextJS applications
 */

import { config } from '../config.js';

export const endpoints = {
  // Authentication endpoints
  auth: {
    login: `${config.baseURL}/auth/login/`,
    register: `${config.baseURL}/auth/register/`,
    me: `${config.baseURL}/auth/me/`,
    meTeams: `${config.baseURL}/auth/me/teams/`,
    verify: `${config.baseURL}/auth/verify/`,
  },
  
  // Health and status endpoints
  health: {
    health: `${config.baseURL}/health/`,
    metrics: `${config.baseURL}/metrics`,  // Prometheus metrics
  },
  
  // Task endpoints
  tasks: {
    list: `${config.baseURL}/api/tasks/`,
    create: `${config.baseURL}/api/tasks/`,
    detail: (id) => `${config.baseURL}/api/tasks/${id}/`,
    forceCreate: `${config.baseURL}/api/tasks/force-create/`,
    link: (id) => `${config.baseURL}/api/tasks/${id}/link/`,
    startReview: (id) => `${config.baseURL}/api/tasks/${id}/start-review/`,
    revise: (id) => `${config.baseURL}/api/tasks/${id}/revise/`,
    approve: (id) => `${config.baseURL}/api/tasks/${id}/approve/`,
    reject: (id) => `${config.baseURL}/api/tasks/${id}/reject/`,
  },
  
  // Campaign endpoints
  campaigns: {
    list: `${config.baseURL}/api/campaigns/`,
    create: `${config.baseURL}/api/campaigns/`,
    detail: (id) => `${config.baseURL}/api/campaigns/${id}/`,
  },
  
  // Core/Project endpoints
  core: {
    projects: `${config.baseURL}/api/core/projects/`,
    projectDetail: (id) => `${config.baseURL}/api/core/projects/${id}/`,
    checkMembership: `${config.baseURL}/api/core/check-project-membership/`,
    kpiSuggestions: `${config.baseURL}/api/core/kpi-suggestions/`,
    invitations: {
      accept: `${config.baseURL}/api/core/invitations/accept/`,
      resend: (id) => `${config.baseURL}/api/core/invitations/${id}/resend/`,
      list: (projectId) => `${config.baseURL}/api/core/projects/${projectId}/invitations/`,
    },
  },
  
  // Asset endpoints
  assets: {
    list: `${config.baseURL}/api/assets/`,
    create: `${config.baseURL}/api/assets/`,
    detail: (id) => `${config.baseURL}/api/assets/${id}/`,
  },
  
  // Budget endpoints
  budgets: {
    list: `${config.baseURL}/api/budgets/`,
    create: `${config.baseURL}/api/budgets/`,
    detail: (id) => `${config.baseURL}/api/budgets/${id}/`,
  },
  
  // Access control endpoints
  accessControl: {
    organizations: `${config.baseURL}/api/access_control/organizations/`,
    teams: `${config.baseURL}/api/access_control/teams/`,
    roles: `${config.baseURL}/api/access_control/roles/`,
    roleDetail: (id) => `${config.baseURL}/api/access_control/roles/${id}/`,
    permissions: `${config.baseURL}/api/access_control/permissions/`,
    rolePermissions: `${config.baseURL}/api/access_control/role-permissions/`,
    updateRolePermissions: (id) => `${config.baseURL}/api/access_control/roles/${id}/permissions/`,
  },
  
  // Reports endpoints
  reports: {
    list: `${config.baseURL}/api/reports/`,
    create: `${config.baseURL}/api/reports/`,
    detail: (id) => `${config.baseURL}/api/reports/${id}/`,
  },
  
  // NextJS frontend pages
  pages: {
    home: `${config.frontendURL}/`,
    login: `${config.frontendURL}/login`,
    tasks: `${config.frontendURL}/tasks`,
    campaigns: `${config.frontendURL}/campaigns`,
    projects: `${config.frontendURL}/projects`,
    profile: `${config.frontendURL}/profile`,
    teams: `${config.frontendURL}/teams`,
    metrics: `${config.frontendURL}/api/metrics`,  // NextJS metrics endpoint
  },
};

// Helper function to categorize endpoint type (read vs write)
export function getEndpointType(method) {
  const readMethods = ['GET', 'HEAD', 'OPTIONS'];
  const writeMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  
  if (readMethods.includes(method)) {
    return 'read';
  } else if (writeMethods.includes(method)) {
    return 'write';
  }
  return 'read'; // Default to read
}

// Helper function to get endpoint tag for metrics
export function getEndpointTag(url) {
  // Extract meaningful endpoint name from URL
  // e.g., /api/tasks/ -> tasks
  // e.g., /api/tasks/123/ -> tasks_detail
  const match = url.match(/\/([^\/]+)(?:\/(\d+))?(?:\/)?$/);
  if (match) {
    const resource = match[1];
    const id = match[2];
    return id ? `${resource}_detail` : resource;
  }
  return 'unknown';
}


