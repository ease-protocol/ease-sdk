import { join, joinCallback } from '../src/join';
import { api } from '../src/api';
import { ValidationError, AuthenticationError, WebAuthnError, ErrorCode } from '../src/utils/errors';

jest.mock('../src/api');
const mockApi = api as jest.MockedFunction<typeof api>;

describe('Join Module', () => {
  beforeEach(() => {
    mockApi.mockClear();
  });

  describe('join', () => {
    const validAccessToken = 'valid-access-token-12345';

    it('should get join options successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          publicKey: {
            challenge: 'challenge',
            rp: { name: 'Ease' },
            user: { id: 'user-id', name: 'user', displayName: 'User' },
            pubKeyCredParams: [],
          },
        },
        headers: new Headers({ 'X-Session-Id': 'session-123' }),
      };
      mockApi.mockResolvedValueOnce(mockResponse);

      const result = await join(validAccessToken);

      expect(result.publicKey).toEqual(mockResponse.data.publicKey);
      expect(result.sessionId).toBe('session-123');
      expect(mockApi).toHaveBeenCalledWith(
        'https://api.ease.tech/join/options',
        'POST',
        {},
        { 'Authorization': `Bearer ${validAccessToken}` }
      );
    });

    it('should validate access token', async () => {
      await expect(join('')).rejects.toThrow(ValidationError);
      await expect(join(null as any)).rejects.toThrow(ValidationError);
      await expect(join('short')).rejects.toThrow(ValidationError);
    });

    it('should handle unauthorized error', async () => {
      mockApi.mockResolvedValueOnce({
        success: false,
        error: 'Unauthorized',
        statusCode: 401,
      });

      const error = await join(validAccessToken).catch(e => e);
      expect(error).toBeInstanceOf(AuthenticationError);
      expect(error.code).toBe(ErrorCode.UNAUTHORIZED);
    });

    it('should handle missing join data', async () => {
      mockApi.mockResolvedValueOnce({
        success: true,
        data: null,
      });

      await expect(join(validAccessToken)).rejects.toThrow(WebAuthnError);
    });

    it('should handle missing publicKey', async () => {
      mockApi.mockResolvedValueOnce({
        success: true,
        data: {},
        headers: new Headers({ 'X-Session-Id': 'session-123' }),
      });

      await expect(join(validAccessToken)).rejects.toThrow(WebAuthnError);
    });

    it('should handle missing session ID gracefully', async () => {
      const mockResponse = {
        success: true,
        data: {
          publicKey: {
            challenge: 'challenge',
            rp: { name: 'Ease' },
            user: { id: 'user-id', name: 'user', displayName: 'User' },
            pubKeyCredParams: [],
          },
        },
        headers: new Headers(),
      };
      mockApi.mockResolvedValueOnce(mockResponse);

      const result = await join(validAccessToken);

      expect(result.sessionId).toBe('');
    });

    it('should trim access token', async () => {
      const mockResponse = {
        success: true,
        data: {
          publicKey: {
            challenge: 'challenge',
            rp: { name: 'Ease' },
            user: { id: 'user-id', name: 'user', displayName: 'User' },
            pubKeyCredParams: [],
          },
        },
        headers: new Headers({ 'X-Session-Id': 'session-123' }),
      };
      mockApi.mockResolvedValueOnce(mockResponse);

      await join(`  ${validAccessToken}  `);

      expect(mockApi).toHaveBeenCalledWith(
        'https://api.ease.tech/join/options',
        'POST',
        {},
        { 'Authorization': `Bearer ${validAccessToken}` }
      );
    });
  });

  describe('joinCallback', () => {
    const mockCredential = {
      id: 'credential-id',
      rawId: 'raw-id',
      response: {
        clientDataJSON: 'client-data',
        attestationObject: 'attestation',
      },
      type: 'public-key' as const,
    };
    const validAccessToken = 'valid-access-token-12345';
    const validSessionId = 'valid-session-id';

    it('should complete join successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          success: true,
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
        },
      };
      mockApi.mockResolvedValueOnce(mockResponse);

      const result = await joinCallback(mockCredential, validAccessToken, validSessionId);

      expect(result.success).toBe(true);
      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');
      expect(mockApi).toHaveBeenCalledWith(
        'https://api.ease.tech/join/callback',
        'POST',
        { publicKey: mockCredential },
        {
          'Authorization': `Bearer ${validAccessToken}`,
          'X-Session-Id': validSessionId,
        }
      );
    });

    it('should validate all required inputs', async () => {
      await expect(joinCallback(null as any, validAccessToken, validSessionId)).rejects.toThrow(ValidationError);
      await expect(joinCallback(mockCredential, '', validSessionId)).rejects.toThrow(ValidationError);
      await expect(joinCallback(mockCredential, validAccessToken, '')).rejects.toThrow(ValidationError);
    });

    it('should validate credential format', async () => {
      const invalidCredential = {
        ...mockCredential,
        id: '',
      };

      await expect(joinCallback(invalidCredential, validAccessToken, validSessionId)).rejects.toThrow(ValidationError);
    });

    it('should validate credential type', async () => {
      const invalidCredential = {
        ...mockCredential,
        type: 'invalid-type' as any,
      };

      await expect(joinCallback(invalidCredential, validAccessToken, validSessionId)).rejects.toThrow(ValidationError);
    });

    it('should handle unauthorized error', async () => {
      mockApi.mockResolvedValueOnce({
        success: false,
        error: 'Unauthorized',
        statusCode: 401,
      });

      const error = await joinCallback(mockCredential, validAccessToken, validSessionId).catch(e => e);
      expect(error).toBeInstanceOf(AuthenticationError);
      expect(error.code).toBe(ErrorCode.UNAUTHORIZED);
    });

    it('should handle invalid attestation error', async () => {
      mockApi.mockResolvedValueOnce({
        success: false,
        error: 'Invalid attestation',
        statusCode: 400,
      });

      const error = await joinCallback(mockCredential, validAccessToken, validSessionId).catch(e => e);
      expect(error).toBeInstanceOf(WebAuthnError);
      expect(error.code).toBe(ErrorCode.PASSKEY_CREATION_FAILED);
    });

    it('should handle missing tokens in response', async () => {
      mockApi.mockResolvedValueOnce({
        success: true,
        data: {
          success: true,
          // Missing accessToken and refreshToken
        },
      });

      await expect(joinCallback(mockCredential, validAccessToken, validSessionId)).rejects.toThrow(WebAuthnError);
    });

    it('should trim access token and session ID', async () => {
      const mockResponse = {
        success: true,
        data: {
          success: true,
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
        },
      };
      mockApi.mockResolvedValueOnce(mockResponse);

      await joinCallback(mockCredential, `  ${validAccessToken}  `, `  ${validSessionId}  `);

      expect(mockApi).toHaveBeenCalledWith(
        'https://api.ease.tech/join/callback',
        'POST',
        { publicKey: mockCredential },
        {
          'Authorization': `Bearer ${validAccessToken}`,
          'X-Session-Id': validSessionId,
        }
      );
    });
  });
});