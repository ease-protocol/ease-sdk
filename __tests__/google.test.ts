import { getGoogleOAuthURL, verifyGoogleOAuthCallback } from '../src/google';
import { internalApi } from '../src/api';
import { AuthenticationError, ErrorCode } from '../src/utils/errors';
import { logger, LogLevel } from '../src/utils/logger';

jest.mock('../src/api', () => ({
  internalApi: jest.fn(),
}));

const mockInternalApi = internalApi as jest.Mock;

describe('Google OAuth', () => {
  afterEach(() => {
    jest.clearAllMocks();
    logger.configure({ level: LogLevel.DEBUG });
  });

  describe('getGoogleOAuthURL', () => {
    it('should return the authURL on success', async () => {
      const mockResponse = {
        success: true,
        data: {
          success: true,
          authURL: 'https://accounts.google.com/o/oauth2/v2/auth?...',
        },
      };
      mockInternalApi.mockResolvedValue(mockResponse);

      const result = await getGoogleOAuthURL();

      expect(result).toEqual(mockResponse.data);
      expect(internalApi).toHaveBeenCalledWith('/oauth/google', 'GET');
    });

    it('should throw an AuthenticationError on failure', async () => {
      logger.configure({ level: LogLevel.SILENT });
      const mockResponse = {
        success: false,
        error: 'Failed to get Google OAuth URL',
        statusCode: 500,
      };
      mockInternalApi.mockResolvedValue(mockResponse);

      await expect(getGoogleOAuthURL()).rejects.toThrow(
        new AuthenticationError('Failed to get Google OAuth URL', ErrorCode.AUTHENTICATION_FAILED),
      );
    });
  });

  describe('verifyGoogleOAuthCallback', () => {
    it('should return tokens on success', async () => {
      const mockCallbackData = {
        code: 'test_code',
        state: 'test_state',
        chainID: 'test_chain_id',
      };
      const mockResponse = {
        success: true,
        data: {
          success: true,
          accessToken: 'test_access_token',
          refreshToken: 'test_refresh_token',
        },
      };
      mockInternalApi.mockResolvedValue(mockResponse);

      const result = await verifyGoogleOAuthCallback(mockCallbackData);

      expect(result).toEqual(mockResponse.data);
      expect(internalApi).toHaveBeenCalledWith('/oauth/google/callback', 'POST', mockCallbackData, undefined, false);
    });

    it('should throw an AuthenticationError on failure', async () => {
      logger.configure({ level: LogLevel.SILENT });
      const mockCallbackData = {
        code: 'test_code',
        state: 'test_state',
        chainID: 'test_chain_id',
      };
      const mockResponse = {
        success: false,
        error: 'Google OAuth callback failed',
        statusCode: 500,
      };
      mockInternalApi.mockResolvedValue(mockResponse);

      await expect(verifyGoogleOAuthCallback(mockCallbackData)).rejects.toThrow(
        new AuthenticationError('Google OAuth callback failed', ErrorCode.AUTHENTICATION_FAILED),
      );
    });
  });
});
