/**
 * K6 Load Testing Configuration
 * Central configuration file for all test scenarios
 */

// Load environment variables
export const config = {
  // Base URLs
  baseURL: __ENV.K6_BASE_URL || 'http://localhost:8000',
  frontendURL: __ENV.K6_FRONTEND_URL || 'http://localhost:3000',
  
  // Test user credentials
  testUser: {
    email: __ENV.K6_TEST_USER_EMAIL || 'test@example.com',
    password: __ENV.K6_TEST_USER_PASSWORD || 'testpassword123',
  },
  
  // InfluxDB configuration
  influxdb: {
    url: __ENV.INFLUXDB_URL || 'http://localhost:8086',
    org: __ENV.INFLUXDB_ORG || 'k6',
    bucket: __ENV.INFLUXDB_BUCKET || 'k6',
    token: __ENV.INFLUXDB_TOKEN || '',
  },
  
  // Performance thresholds
  thresholds: {
    // HTTP request duration thresholds
    httpReqDuration: {
      read: ['p(95)<200', 'p(99)<500'],      // Read operations (GET)
      write: ['p(95)<500', 'p(99)<1000'],    // Write operations (POST, PUT, PATCH)
    },
    
    // Error rate threshold
    httpReqFailed: ['rate<0.01'],            // Less than 1% errors
    
    // Waiting time (time to first byte)
    httpReqWaiting: ['p(95)<150'],
    
    // Iteration duration
    iterationDuration: ['p(95)<1000'],       // Less than 1 second per iteration
    
    // Custom threshold names for reporting
    names: {
      readDuration: 'http_req_duration{type:read}',
      writeDuration: 'http_req_duration{type:write}',
      failed: 'http_req_failed',
      waiting: 'http_req_waiting',
      iteration: 'iteration_duration',
    },
  },
  
  // Test scenario defaults
  scenarios: {
    smoke: {
      vus: 1,
      duration: '30s',
    },
    load: {
      stages: [
        { duration: '2m', target: 10 },   // Ramp-up
        { duration: '5m', target: 50 },   // Gradual increase
        { duration: '5m', target: 50 },   // Sustained load
        { duration: '2m', target: 0 },    // Cool-down
      ],
    },
    stress: {
      stages: [
        { duration: '2m', target: 50 },
        { duration: '5m', target: 100 },
        { duration: '5m', target: 200 },  // Beyond normal capacity
        { duration: '2m', target: 0 },
      ],
    },
    spike: {
      stages: [
        { duration: '10s', target: 100 },  // Sudden spike
        { duration: '1m', target: 100 },   // Maintain spike
        { duration: '10s', target: 0 },    // Sudden drop
      ],
    },
  },
  
  // Request options
  requestOptions: {
    timeout: '30s',
    tags: {
      test_type: 'load_test',
    },
  },
};

// Helper function to get threshold config for a scenario
// K6 thresholds must be arrays of strings, not objects
export function getThresholds(scenarioType = 'load') {
  const baseThresholds = {
    'http_req_duration': ['p(95)<200', 'p(99)<500'],
    'http_req_failed': ['rate<0.01'],  // Less than 1% errors
    'http_req_waiting': ['p(95)<150'],
    'iteration_duration': ['p(95)<1000'],
  };
  
  // Adjust thresholds based on scenario type
  switch (scenarioType) {
    case 'smoke':
      // More lenient thresholds for smoke test (app might not be fully ready)
      return {
        'http_req_duration': ['p(95)<500', 'p(99)<1000'],
        'http_req_failed': ['rate<0.05'],  // 5% error rate acceptable for smoke test
        'http_req_waiting': ['p(95)<300'],
        'iteration_duration': ['p(95)<2000'],
      };
      
    case 'load':
      // Standard thresholds
      return baseThresholds;
      
    case 'stress':
      // Relaxed thresholds for stress test
      return {
        'http_req_duration': ['p(95)<1000', 'p(99)<2000'],
        'http_req_failed': ['rate<0.05'],  // 5% error rate acceptable
        'http_req_waiting': ['p(95)<500'],
        'iteration_duration': ['p(95)<3000'],
      };
      
    case 'spike':
      // More lenient error rate for spike test
      return {
        'http_req_duration': ['p(95)<200', 'p(99)<500'],
        'http_req_failed': ['rate<0.03'],  // 3% error rate acceptable
        'http_req_waiting': ['p(95)<150'],
        'iteration_duration': ['p(95)<1000'],
      };
      
    default:
      return baseThresholds;
  }
}

// Helper function to get scenario config
export function getScenarioConfig(scenarioType = 'load') {
  return config.scenarios[scenarioType] || config.scenarios.load;
}


