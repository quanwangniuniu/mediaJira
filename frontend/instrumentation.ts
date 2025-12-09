import { registerOTel } from '@vercel/otel';

export function register() {
  registerOTel({
    serviceName: 'nextjs-app',
    exporter: 'otlp',
    otlp: {
      url: 'http://localhost:4318/v1/traces', // Jaeger OTLP HTTP endpoint
    },
  });
}
