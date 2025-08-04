import { logger } from '../../src/utils/logger';
import { getUrl } from '../../src/utils/urls';
import { getEnvironment } from '../../src/utils/environment';

// Mocking dependencies
jest.mock('../../src/utils/urls', () => ({
  getUrl: jest.fn(),
}));
jest.mock('../../src/utils/environment', () => ({
  getEnvironment: jest.fn(),
}));

global.fetch = jest.fn();

describe('Logger logEvent', () => {
  const mockGetUrl = getUrl as jest.Mock;
  const mockGetEnvironment = getEnvironment as jest.Mock;
  const mockFetch = global.fetch as jest.Mock;

  beforeEach(() => {
    jest.resetAllMocks();
    mockGetUrl.mockReturnValue('https://app-logging.vercel.app/api/logs');
    mockGetEnvironment.mockReturnValue('develop');
  });

  it('should send a POST request with the correct payload', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });

    const message = 'Test log message';
    const level = 'info';
    const context = { userId: '123' };
    const deviceId = 'test-device';

    await logger.logEvent(message, level, context, deviceId);

    expect(mockFetch).toHaveBeenCalledWith(
      'https://app-logging.vercel.app/api/logs',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.any(String),
      }),
    );

    const fetchBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(fetchBody).toEqual({
      message,
      level,
      context,
      environment: 'develop',
      deviceId,
      timestamp: expect.any(String),
    });
  });

  it('should log an error if the fetch request fails', async () => {
    const consoleErrorSpy = jest.spyOn(logger, 'error').mockImplementation();
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    await logger.logEvent('Failed log');

    expect(logger.error).toHaveBeenCalledWith('Failed to log event', { status: 500 });

    consoleErrorSpy.mockRestore();
  });

  it('should log an error if an exception occurs', async () => {
    const consoleErrorSpy = jest.spyOn(logger, 'error').mockImplementation();
    const error = new Error('Network error');
    mockFetch.mockRejectedValueOnce(error);

    await logger.logEvent('Error log');

    expect(logger.error).toHaveBeenCalledWith('Error in logEvent', error);

    consoleErrorSpy.mockRestore();
  });
});
