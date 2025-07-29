import { refreshToken } from '../src/refresh';
import { internalApi } from '../src/api';
import { AuthenticationError, ValidationError } from '../src/utils/errors';
import { logger, LogLevel } from '../src/utils/logger';

jest.mock('../src/api', () => ({
  internalApi: jest.fn(),
}));

const mockApi = internalApi as jest.MockedFunction<typeof internalApi>;

describe('Token Refresh', () => {
  beforeEach(() => {
    mockApi.mockClear();
    logger.configure({ level: LogLevel.DEBUG });
  });

  const validRefreshToken = 'valid-refresh-token';

  it('should refresh token successfully', async () => {
    const mockResponse = {
      success: true,
      data: {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      },
    };
    mockApi.mockResolvedValueOnce(mockResponse);

    const result = await refreshToken(validRefreshToken);

    expect(result.accessToken).toBe('new-access-token');
    expect(result.refreshToken).toBe('new-refresh-token');
    expect(mockApi).toHaveBeenCalledWith(
      '/refresh',
      'POST',
      null,
      { Authorization: `Bearer ${validRefreshToken}` },
      false,
    );
  });

  it('should handle invalid refresh token', async () => {
    logger.configure({ level: LogLevel.SILENT });
    mockApi.mockResolvedValueOnce({
      success: false,
      error: 'Invalid refresh token',
      statusCode: 401,
    });

    await expect(refreshToken(validRefreshToken)).rejects.toThrow(AuthenticationError);
  });

  it('should handle missing tokens in response', async () => {
    logger.configure({ level: LogLevel.SILENT });
    mockApi.mockResolvedValueOnce({ success: true, data: {} });

    await expect(refreshToken(validRefreshToken)).rejects.toThrow(AuthenticationError);
  });

  it('should handle unexpected errors', async () => {
    logger.configure({ level: LogLevel.SILENT });
    const error = new Error('Network error');
    mockApi.mockRejectedValueOnce(error);

    await expect(refreshToken(validRefreshToken)).rejects.toThrow();
  });

  it('should validate refresh token', async () => {
    logger.configure({ level: LogLevel.SILENT });
    await expect(refreshToken('')).rejects.toThrow(ValidationError);
    await expect(refreshToken(null as any)).rejects.toThrow(ValidationError);
  });
});
