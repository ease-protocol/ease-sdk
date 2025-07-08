import { Telemetry } from '../src/telemetry';
import { logger } from '../src/utils/logger';

// Mock Sentry and logger
import * as Sentry from '@sentry/react-native';

jest.mock('../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('Telemetry', () => {
  let telemetry: Telemetry;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    telemetry = new Telemetry(); // Initialize with default (disabled) state
  });

  describe('init', () => {
    it('should initialize Sentry when enabled and DSN is provided', () => {
      telemetry.init({
        enabled: true,
        sentryDsn: 'https://example@sentry.io/123',
        environment: 'test',
        release: '1.0.0',
      });
      expect(Sentry.init).toHaveBeenCalledTimes(1);
      expect(Sentry.init).toHaveBeenCalledWith({
        dsn: 'https://example@sentry.io/123',
        environment: 'test',
        release: '1.0.0',
      });
      expect(logger.info).toHaveBeenCalledWith('Sentry initialized.');
    });

    it('should not initialize Sentry when disabled', () => {
      telemetry.init({
        enabled: false,
        sentryDsn: 'https://example@sentry.io/123',
      });
      expect(Sentry.init).not.toHaveBeenCalled();
      expect(logger.info).not.toHaveBeenCalled();
    });

    it('should not initialize Sentry when DSN is not provided but enabled', () => {
      telemetry.init({
        enabled: true,
        sentryDsn: undefined,
      });
      expect(Sentry.init).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        'Telemetry is enabled but Sentry DSN is not provided. Sentry will not be initialized.',
      );
    });

    it('should not initialize Sentry when DSN is an empty string', () => {
      telemetry.init({
        enabled: true,
        sentryDsn: '',
      });
      expect(Sentry.init).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        'Telemetry is enabled but Sentry DSN is not provided. Sentry will not be initialized.',
      );
    });
  });

  describe('trackEvent', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      telemetry = new Telemetry();
    });

    it('should call Sentry.addBreadcrumb and logger.info when enabled', () => {
      telemetry.init({ enabled: true, sentryDsn: 'https://example@sentry.io/123' });
      const eventName = 'test_event';
      const properties = { key: 'value' };
      telemetry.trackEvent(eventName, properties);

      expect(Sentry.addBreadcrumb).toHaveBeenCalledTimes(1);
      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        category: 'event',
        message: eventName,
        data: properties,
        level: 'info',
      });
      expect(logger.info).toHaveBeenCalledWith(`Telemetry Event: ${eventName}`, properties);
    });

    it('should not call Sentry.addBreadcrumb or logger.info when disabled', () => {
      telemetry.init({ enabled: false });
      const eventName = 'test_event';
      const properties = { key: 'value' };
      telemetry.trackEvent(eventName, properties);

      expect(Sentry.addBreadcrumb).not.toHaveBeenCalled();
      expect(logger.info).not.toHaveBeenCalled();
    });
  });

  describe('trackError', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      telemetry = new Telemetry();
    });

    it('should call Sentry.captureException and logger.error when enabled', () => {
      telemetry.init({ enabled: true, sentryDsn: 'https://example@sentry.io/123' });
      const error = new Error('Test Error');
      const properties = { context: 'test' };
      telemetry.trackError(error, properties);

      expect(Sentry.captureException).toHaveBeenCalledTimes(1);
      expect(Sentry.captureException).toHaveBeenCalledWith(error, {
        extra: properties,
      });
      expect(logger.error).toHaveBeenCalledWith(`Telemetry Error: ${error.message}`, {
        ...properties,
        stack: error.stack,
        errorType: error.name,
      });
    });

    it('should not call Sentry.captureException or logger.error when disabled', () => {
      telemetry.init({ enabled: false });
      const error = new Error('Test Error');
      const properties = { context: 'test' };
      telemetry.trackError(error, properties);

      expect(Sentry.captureException).not.toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
    });
  });
});
