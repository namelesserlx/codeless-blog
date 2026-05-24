import { env } from './env';

export const telemetryConfig = {
    enabled: env.telemetry.enabled,
    serviceName: env.telemetry.serviceName,
    serviceVersion: env.telemetry.serviceVersion,
    environment: env.telemetry.environment,
    exporterEndpoint: env.telemetry.exporterEndpoint,
    tracesSampleRate: env.telemetry.tracesSampleRate,
};
