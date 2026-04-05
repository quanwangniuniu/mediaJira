import pino from 'pino';

const loggerConfig = {
  level: process.env.LOG_LEVEL || 'info',
};

// Do NOT use pino-pretty transport in Next.js: webpack bundles server code and
// cannot resolve the worker transport ("unable to determine transport target for pino-pretty"),
// which breaks /app/api/[...path] and any login/API traffic that hits the dev server.
// Opt-in only for local Node scripts outside Next: ENABLE_PRETTY_LOGGING=true
const usePrettyLogging =
  typeof process !== 'undefined' &&
  process.versions?.node &&
  process.env.NODE_ENV === 'development' &&
  process.env.ENABLE_PRETTY_LOGGING === 'true';

if (usePrettyLogging) {
  loggerConfig.transport = {
    target: 'pino-pretty',
    options: { colorize: true },
  };
}

const logger = pino(loggerConfig);

export default logger;
