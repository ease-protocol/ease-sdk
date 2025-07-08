import * as Sentry from '@sentry/react-native';
import { logger } from '../utils/logger';

interface TelemetryConfig {
  enabled?: boolean;
  sentryDsn?: string;
  environment?: string;
  release?: string;
  packageVersion?: string;
  phoneConfig?: {
    countryCode: string;
    phoneNumber: string;
    platform: 'ios' | 'android' | 'web';
    uuid?: string;
  }
}

export class Telemetry {
  private _enabled: boolean = false;

  constructor() {
    this._enabled = false;
  }

  public init(config: TelemetryConfig) {
    if (config?.enabled !== undefined) {
      this._enabled = config.enabled;
    }

    if (this._enabled) {
      Sentry.init({
        dsn: 'https://39d2b8ee90f9ac14880c9728a0064778@o4509634133622784.ingest.us.sentry.io/4509634753527808',
        environment: config.environment || 'development',
        release: config.release || config.packageVersion,
        sendDefaultPii: true,
        tracesSampleRate: 1.0, // Adjust this value based on your needs
        profilesSampleRate: 1.0, // Adjust this value based on your needs
        integrations: [Sentry.mobileReplayIntegration()],
        attachStacktrace: true,
        enabled: true,
        
      });
      logger.info('Sentry initialized.');
    } else if (this._enabled && !config.sentryDsn) {
      logger.warn('Telemetry is enabled but Sentry DSN is not provided. Sentry will not be initialized.');
    }
  }

  public trackEvent(eventName: string, properties?: Record<string, any>) {
    if (this._enabled) {
      Sentry.addBreadcrumb({
        category: 'event',
        message: eventName,
        data: properties,
        level: 'info',
      });
      logger.info(`Telemetry Event: ${eventName}`, properties);
    }
  }

  public trackError(error: Error, properties?: Record<string, any>) {
    if (this._enabled) {
      Sentry.captureException(error, {
        extra: properties,
      });
      logger.error(`Telemetry Error: ${error.message}`, {
        ...properties,
        stack: error.stack,
        errorType: error.name,
      });
    }
  }
}

export const telemetry = new Telemetry();
