import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { TraceIdRatioBasedSampler } from '@opentelemetry/sdk-trace-base';
import { telemetryConfig } from '../config/telemetry';
import { logger } from '../utils/logger';

const createOtelUrl = (signalPath: 'v1/traces' | 'v1/metrics'): string => {
    return `${telemetryConfig.exporterEndpoint}/${signalPath}`;
};

let sdk: NodeSDK | null = null;

if (telemetryConfig.enabled && telemetryConfig.exporterEndpoint) {
    sdk = new NodeSDK({
        serviceName: telemetryConfig.serviceName,
        traceExporter: new OTLPTraceExporter({
            url: createOtelUrl('v1/traces'),
        }),
        metricReaders: [
            new PeriodicExportingMetricReader({
                exporter: new OTLPMetricExporter({
                    url: createOtelUrl('v1/metrics'),
                }),
                exportIntervalMillis: 30000,
            }),
        ],
        sampler: new TraceIdRatioBasedSampler(telemetryConfig.tracesSampleRate),
        instrumentations: [
            getNodeAutoInstrumentations({
                '@opentelemetry/instrumentation-fs': {
                    enabled: false,
                },
            }),
        ],
    });

    sdk.start();

    logger.info('OpenTelemetry initialized', {
        serviceName: telemetryConfig.serviceName,
        environment: telemetryConfig.environment,
        exporterEndpoint: telemetryConfig.exporterEndpoint,
        tracesSampleRate: telemetryConfig.tracesSampleRate,
    });
} else if (telemetryConfig.enabled) {
    logger.warn('OpenTelemetry is enabled but OTEL_EXPORTER_OTLP_ENDPOINT is missing');
}

const shutdownTelemetry = async () => {
    if (!sdk) return;

    try {
        await sdk.shutdown();
        logger.info('OpenTelemetry shutdown complete');
    } catch (error) {
        logger.warn('OpenTelemetry shutdown failed', {
            message: error instanceof Error ? error.message : String(error),
        });
    }
};

const handleShutdownSignal = (exitCode: number) => {
    void shutdownTelemetry().finally(() => {
        process.exit(exitCode);
    });
};

process.once('SIGTERM', () => {
    handleShutdownSignal(0);
});

process.once('SIGINT', () => {
    handleShutdownSignal(130);
});
