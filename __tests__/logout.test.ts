import { logout } from '../src/logout';
import { api } from '../src/api';
import { ValidationError, AuthenticationError, ErrorCode } from '../src/utils/errors';

jest.mock('../src/api');
const mockApi = api as jest.MockedFunction<typeof api>;

describe('Logout Module', () => {
  beforeEach(() => {
    mockApi.mockClear();
  });

  describe('logout', () => {
    const validAccessToken = 'valid-access-token-12345';

    it('should logout successfully', async () => {
      mockApi.mockResolvedValueOnce({
        success: true,
        data: { success: true },
      });

      await expect(logout(validAccessToken)).resolves.toBeUndefined();

      expect(mockApi).toHaveBeenCalledWith(
        '/logout',
        'POST',
        {},
        { Authorization: `Bearer ${validAccessToken}` },
        false,
      );
    });

    it('should validate access token', async () => {
      await expect(logout('')).rejects.toThrow(ValidationError);
      await expect(logout(null as any)).rejects.toThrow(ValidationError);
      await expect(logout('short')).rejects.toThrow(ValidationError);
    });

    it('should handle unauthorized error', async () => {
      mockApi.mockResolvedValueOnce({
        success: false,
        error: 'Unauthorized',
        statusCode: 401,
      });

      const error = await logout(validAccessToken).catch((e) => e);
      expect(error).toBeInstanceOf(AuthenticationError);
      expect(error.code).toBe(ErrorCode.UNAUTHORIZED);
    });

    it('should handle general logout failure', async () => {
      mockApi.mockResolvedValueOnce({
        success: false,
        error: 'Logout failed',
        statusCode: 500,
      });

      const error = await logout(validAccessToken).catch((e) => e);
      expect(error).toBeInstanceOf(AuthenticationError);
      expect(error.code).toBe(ErrorCode.AUTHENTICATION_FAILED);
    });

    it('should handle network errors', async () => {
      mockApi.mockRejectedValueOnce(new Error('Network error'));

      await expect(logout(validAccessToken)).rejects.toThrow();
    });

    it('should trim access token', async () => {
      mockApi.mockResolvedValueOnce({
        success: true,
        data: { success: true },
      });

      await logout(`  ${validAccessToken}  `);

      expect(mockApi).toHaveBeenCalledWith(
        '/logout',
        'POST',
        {},
        { Authorization: `Bearer ${validAccessToken}` },
        false,
      );
    });

    it('should handle SDK error responses properly', async () => {
      const mockError = new AuthenticationError('Token expired', ErrorCode.UNAUTHORIZED);
      mockApi.mockResolvedValueOnce({
        success: false,
        error: 'Token expired',
        statusCode: 401,
        errorDetails: mockError,
      });

      await expect(logout(validAccessToken)).rejects.toThrow(AuthenticationError);
    });
  });
});
