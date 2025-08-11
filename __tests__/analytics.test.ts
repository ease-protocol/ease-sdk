import { logEvent, logEvents } from '../src/analytics';
import { getEnvironment } from '../src/utils/environment';
import { getUrl } from '../src/utils/urls';
import { logger } from '../src/utils/logger';
import { SDK_VERSION } from '../src/version';

// Mock dependencies
jest.mock('../src/utils/environment', () => ({
  getEnvironment: jest.fn(),
}));

jest.mock('../src/utils/urls', () => ({
  getUrl: jest.fn(),
}));

jest.mock('../src/utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Typecast mocks for easier use
const mockGetEnvironment = getEnvironment as jest.Mock;
const mockGetUrl = getUrl as jest.Mock;
const mockLoggerError = logger.error as jest.Mock;

describe('Analytics', () => {
  const mockApiUrl = 'https://api.logging.com/log';
  const mockEnvironment = 'test';
  const mockTimestamp = '2023-01-01T00:00:00.000Z';

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUrl.mockReturnValue(mockApiUrl);
    mockGetEnvironment.mockReturnValue(mockEnvironment);
    jest.useFakeTimers().setSystemTime(new Date(mockTimestamp));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('logEvent', () => {
    it('should send a single log event to the logging API', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      const eventData = {
        message: 'User logged in',
        level: 'info' as const,
        context: { userId: '123' },
        deviceId: 'device-abc',
      };

      await logEvent(eventData.message, eventData.level, eventData.context, eventData.deviceId);

      expect(mockGetUrl).toHaveBeenCalledWith('API_LOGGING');
      expect(mockGetEnvironment).toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledWith(mockApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.any(String), // Expecting a string, will parse and check content below
      });

      const fetchCall = mockFetch.mock.calls[0];
      const sentBody = JSON.parse(fetchCall[1].body);

      expect(sentBody).toEqual({
        message: eventData.message,
        level: eventData.level,
        context: { ...eventData.context, appName: `EASE_SDK_DEFAULT_APP_V${SDK_VERSION}` },
        deviceId: eventData.deviceId,
        environment: mockEnvironment,
        timestamp: mockTimestamp,
      });
    });

    it('should use default values for level and context if not provided', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      const message = 'Simple event';
      await logEvent(message);

      expect(mockFetch).toHaveBeenCalledWith(mockApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          level: 'info',
          context: { appName: `EASE_SDK_DEFAULT_APP_V${SDK_VERSION}` },
          environment: mockEnvironment,
          deviceId: undefined,
          timestamp: mockTimestamp,
        }),
      });
    });

    it('should log an error if the fetch call fails', async () => {
      const error = new Error('Network error');
      mockFetch.mockRejectedValueOnce(error);

      await logEvent('Test message');

      expect(mockLoggerError).toHaveBeenCalledWith('Error in logEvent', error);
    });

    it('should log an error if the API response is not ok', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

      await logEvent('Test message');

      expect(mockLoggerError).toHaveBeenCalledWith('Failed to log event', { status: 500 });
    });
  });

  describe('logEvents', () => {
    it('should send multiple log events to the logging API', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      const events = [
        { message: 'Event 1', level: 'warn' as const, context: { data: 'abc' }, deviceId: 'device-1' },
        { message: 'Event 2', level: 'error' as const, context: { data: 'xyz' }, deviceId: 'device-2' },
      ];

      await logEvents(events);

      const expectedBody = events.map((event) => ({
        ...event,
        environment: mockEnvironment,
        timestamp: mockTimestamp,
      }));

      expect(mockGetUrl).toHaveBeenCalledWith('API_LOGGING');
      expect(mockGetEnvironment).toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledWith(mockApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expectedBody),
      });
    });

    it('should log an error if the fetch call fails', async () => {
      const error = new Error('Network error');
      mockFetch.mockRejectedValueOnce(error);
      await logEvents([{ message: 'Test message' }]);
      expect(mockLoggerError).toHaveBeenCalledWith('Error in logEvents', error);
    });

    it('should log an error if the API response is not ok', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
      await logEvents([{ message: 'Test message' }]);
      expect(mockLoggerError).toHaveBeenCalledWith('Failed to log events', { status: 500 });
    });
  });
});
