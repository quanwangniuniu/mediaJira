import pino from 'pino';

const loggerConfig = {
  level: process.env.LOG_LEVEL || 'info',
};

// Only use pino-pretty in Node.js development environment
// Check if we're in a Node.js server environment (not edge runtime or browser)
// Use environment variable to explicitly enable pretty logging
const usePrettyLogging = 
  typeof process !== 'undefined' && 
  process.versions?.node && 
  process.env.NODE_ENV === 'development' &&
  process.env.ENABLE_PRETTY_LOGGING !== 'false';

if (usePrettyLogging) {
  // Only add transport if explicitly enabled
  // This prevents Next.js from trying to bundle pino-pretty for edge runtime
  loggerConfig.transport = {
    target: 'pino-pretty',
    options: { colorize: true }
  };
}

const logger = pino(loggerConfig);

export default logger;
