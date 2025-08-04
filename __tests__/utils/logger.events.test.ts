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

describe('Logger logEvents', () => {
  const mockGetUrl = getUrl as jest.Mock;
  const mockGetEnvironment = getEnvironment as jest.Mock;
  const mockFetch = global.fetch as jest.Mock;

  beforeEach(() => {
    jest.resetAllMocks();
    mockGetUrl.mockReturnValue('https://app-logging.vercel.app/api/logs');
    mockGetEnvironment.mockReturnValue('develop');
  });

  it('should send a POST request with the correct payload for batch events', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });

    const events = [
      { message: 'Event 1', level: 'info', context: { data: 'a' } },
      { message: 'Event 2', level: 'warn', deviceId: 'dev-123' },
    ];

    await logger.logEvents(events);

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
    expect(fetchBody).toEqual([
      {
        message: 'Event 1',
        level: 'info',
        context: { data: 'a' },
        environment: 'develop',
        timestamp: expect.any(String),
      },
      {
        message: 'Event 2',
        level: 'warn',
        deviceId: 'dev-123',
        environment: 'develop',
        timestamp: expect.any(String),
      },
    ]);
  });

  it('should log an error if the fetch request fails for batch events', async () => {
    const consoleErrorSpy = jest.spyOn(logger, 'error').mockImplementation();
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    await logger.logEvents([{ message: 'Failed event' }]);

    expect(logger.error).toHaveBeenCalledWith('Failed to log events', { status: 500 });

    consoleErrorSpy.mockRestore();
  });

  it('should log an error if an exception occurs during batch logging', async () => {
    const consoleErrorSpy = jest.spyOn(logger, 'error').mockImplementation();
    const error = new Error('Network error');
    mockFetch.mockRejectedValueOnce(error);

    await logger.logEvents([{ message: 'Error event' }]);

    expect(logger.error).toHaveBeenCalledWith('Error in logEvents', error);

    consoleErrorSpy.mockRestore();
  });
});
