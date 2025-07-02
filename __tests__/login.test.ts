import { login, loginCallback } from '../src/login';
import { api } from '../src/api';
import { AuthenticationError, WebAuthnError, ValidationError, ErrorCode } from '../src/utils/errors';

jest.mock('../src/api');
const mockApi = api as jest.MockedFunction<typeof api>;

describe('Login Module', () => {
  beforeEach(() => {
    mockApi.mockClear();
  });

  describe('login', () => {
    it('should get login options successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          publicKey: {
            challenge: 'challenge',
            allowCredentials: [],
            userVerification: 'preferred',
          },
        },
        headers: new Headers({ 'X-Session-Id': 'session-123' }),
      };
      mockApi.mockResolvedValueOnce(mockResponse);

      const result = await login();

      expect(result.sessionId).toBe('session-123');
      expect(result.publicKey).toEqual(mockResponse.data.publicKey);
      expect(mockApi).toHaveBeenCalledWith('https://api.ease.tech/login/options', 'POST');
    });

    it('should handle API error responses', async () => {
      mockApi.mockResolvedValueOnce({
        success: false,
        error: 'Service unavailable',
        statusCode: 503,
      });

      const error = await login().catch((e) => e);
      expect(error).toBeInstanceOf(AuthenticationError);
      expect(error.code).toBe(ErrorCode.AUTHENTICATION_FAILED);
    });

    it('should handle missing login data', async () => {
      mockApi.mockResolvedValueOnce({
        success: true,
        data: null,
      });

      await expect(login()).rejects.toThrow(AuthenticationError);
    });

    it('should handle missing session ID', async () => {
      mockApi.mockResolvedValueOnce({
        success: true,
        data: {
          publicKey: {
            challenge: 'challenge',
            allowCredentials: [],
          },
        },
        headers: new Headers(),
      });

      const error = await login().catch((e) => e);
      expect(error).toBeInstanceOf(AuthenticationError);
      expect(error.code).toBe(ErrorCode.SESSION_EXPIRED);
    });

    it('should handle missing publicKey', async () => {
      mockApi.mockResolvedValueOnce({
        success: true,
        data: {},
        headers: new Headers({ 'X-Session-Id': 'session-123' }),
      });

      const error = await login().catch((e) => e);
      expect(error).toBeInstanceOf(WebAuthnError);
      expect(error.code).toBe(ErrorCode.WEBAUTHN_NOT_SUPPORTED);
    });

    it('should handle unexpected errors', async () => {
      mockApi.mockRejectedValueOnce(new Error('Network error'));

      await expect(login()).rejects.toThrow();
    });
  });

  describe('loginCallback', () => {
    const mockCredential = {
      id: 'credential-id',
      rawId: 'raw-id',
      response: {
        clientDataJSON: 'client-data',
        authenticatorData: 'auth-data',
        signature: 'signature',
      },
      type: 'public-key' as const,
    };
    const validSessionId = 'valid-session-id';

    it('should complete login successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          success: true,
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
        },
      };
      mockApi.mockResolvedValueOnce(mockResponse);

      const result = await loginCallback(mockCredential, validSessionId);

      expect(result.success).toBe(true);
      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(mockApi).toHaveBeenCalledWith('https://api.ease.tech/login/callback', 'POST', mockCredential, {
        'X-Session-Id': validSessionId,
      });
    });

    it('should validate required inputs', async () => {
      await expect(loginCallback(null as any, validSessionId)).rejects.toThrow(ValidationError);
      await expect(loginCallback(mockCredential, '')).rejects.toThrow(ValidationError);
      await expect(loginCallback(mockCredential, null as any)).rejects.toThrow(ValidationError);
    });

    it('should validate credential format', async () => {
      const invalidCredential = {
        ...mockCredential,
        id: '',
      };

      await expect(loginCallback(invalidCredential, validSessionId)).rejects.toThrow(ValidationError);
    });

    it('should validate credential type', async () => {
      const invalidCredential = {
        ...mockCredential,
        type: 'invalid-type' as any,
      };

      await expect(loginCallback(invalidCredential, validSessionId)).rejects.toThrow(ValidationError);
    });

    it('should handle authentication failed error', async () => {
      mockApi.mockResolvedValueOnce({
        success: false,
        error: 'Invalid credentials',
        statusCode: 401,
      });

      const error = await loginCallback(mockCredential, validSessionId).catch((e) => e);
      expect(error).toBeInstanceOf(AuthenticationError);
      expect(error.code).toBe(ErrorCode.INVALID_CREDENTIALS);
    });

    it('should handle invalid assertion error', async () => {
      mockApi.mockResolvedValueOnce({
        success: false,
        error: 'Invalid assertion',
        statusCode: 400,
      });

      const error = await loginCallback(mockCredential, validSessionId).catch((e) => e);
      expect(error).toBeInstanceOf(WebAuthnError);
      expect(error.code).toBe(ErrorCode.PASSKEY_AUTHENTICATION_FAILED);
    });

    it('should handle missing tokens in response', async () => {
      mockApi.mockResolvedValueOnce({
        success: true,
        data: {
          success: true,
          // Missing accessToken and refreshToken
        },
      });

      await expect(loginCallback(mockCredential, validSessionId)).rejects.toThrow(AuthenticationError);
    });

    it('should handle general login failure', async () => {
      mockApi.mockResolvedValueOnce({
        success: false,
        error: 'Login failed',
        statusCode: 500,
      });

      const error = await loginCallback(mockCredential, validSessionId).catch((e) => e);
      expect(error).toBeInstanceOf(AuthenticationError);
      expect(error.code).toBe(ErrorCode.AUTHENTICATION_FAILED);
    });

    it('should handle unexpected errors', async () => {
      mockApi.mockRejectedValueOnce(new Error('Network error'));

      await expect(loginCallback(mockCredential, validSessionId)).rejects.toThrow();
    });
  });
});
