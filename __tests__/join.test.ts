import { join, joinCallback } from '../src/join';
import { internalApi } from '../src/api';
import { ValidationError, AuthenticationError, WebAuthnError, ErrorCode } from '../src/utils/errors';
import { RecipientData } from '../src/utils/type';
import { logger, LogLevel } from '../src/utils/logger';

jest.mock('../src/api', () => ({
  internalApi: jest.fn(),
}));

const mockApi = internalApi as jest.MockedFunction<typeof internalApi>;

describe('Join Module', () => {
  beforeEach(() => {
    mockApi.mockClear();
    logger.configure({ level: LogLevel.DEBUG });
  });

  describe('join', () => {
    const validAccessToken = 'valid-access-token-12345';
    const validDisplayName = 'Test User';

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

      const result = await join(validAccessToken, validDisplayName);

      expect(result.publicKey).toEqual(mockResponse.data.publicKey);
      expect(result.sessionId).toBe('session-123');
      expect(mockApi).toHaveBeenCalledWith(
        '/join/options',
        'POST',
        { displayName: validDisplayName },
        { Authorization: `Bearer ${validAccessToken}` },
        false,
      );
    });

    it('should validate access token and display name', async () => {
      logger.configure({ level: LogLevel.SILENT });
      await expect(join('', validDisplayName)).rejects.toThrow(ValidationError);
      await expect(join(null as any, validDisplayName)).rejects.toThrow(ValidationError);
      await expect(join('short', validDisplayName)).rejects.toThrow(ValidationError);
      await expect(join(validAccessToken, '')).rejects.toThrow(ValidationError);
      await expect(join(validAccessToken, null as any)).rejects.toThrow(ValidationError);
    });

    it('should handle unauthorized error', async () => {
      logger.configure({ level: LogLevel.SILENT });
      mockApi.mockResolvedValueOnce({
        success: false,
        error: 'Unauthorized',
        statusCode: 401,
      });

      const error = await join(validAccessToken, validDisplayName).catch((e) => e);
      expect(error).toBeInstanceOf(AuthenticationError);
      expect(error.code).toBe(ErrorCode.UNAUTHORIZED);
    });

    it('should handle missing join data', async () => {
      logger.configure({ level: LogLevel.SILENT });
      mockApi.mockResolvedValueOnce({
        success: true,
        data: null,
      });

      await expect(join(validAccessToken, validDisplayName)).rejects.toThrow(WebAuthnError);
    });

    it('should handle missing publicKey', async () => {
      logger.configure({ level: LogLevel.SILENT });
      mockApi.mockResolvedValueOnce({
        success: true,
        data: {},
        headers: new Headers({ 'X-Session-Id': 'session-123' }),
      });

      await expect(join(validAccessToken, validDisplayName)).rejects.toThrow(WebAuthnError);
    });

    it('should throw an error if session ID is missing', async () => {
      logger.configure({ level: LogLevel.SILENT });
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
        headers: new Headers(), // No session ID
      };
      mockApi.mockResolvedValueOnce(mockResponse);

      await expect(join(validAccessToken, validDisplayName)).rejects.toThrow(
        new WebAuthnError('Invalid response: missing session ID'),
      );
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

      await join(`  ${validAccessToken}  `, validDisplayName);

      expect(mockApi).toHaveBeenCalledWith(
        '/join/options',
        'POST',
        { displayName: validDisplayName },
        { Authorization: `Bearer ${validAccessToken}` },
        false,
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
    const validAccountName = 'test-account';
    const validRecipientPublicKey = 'recipient-public-key';
    const validRecipientData: RecipientData = {
      data: 'encrypted-data',
      encryptedKey: 'encrypted-key',
    };

    it('should complete join successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          success: true,
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
          recipientData: validRecipientData,
          mnemonic: 'test-mnemonic',
        },
      };
      mockApi.mockResolvedValueOnce(mockResponse);

      const result = await joinCallback(
        mockCredential,
        validAccessToken,
        validSessionId,
        validAccountName,
        validRecipientPublicKey,
        validRecipientData,
      );

      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');
      expect(result.recipientData).toEqual(validRecipientData);
      expect(result.mnemonic).toBe('test-mnemonic');
      expect(mockApi).toHaveBeenCalledWith(
        '/join/callback',
        'POST',
        {
          response: mockCredential,
          accountName: validAccountName,
          recipientPublicKey: validRecipientPublicKey,
          recipientData: validRecipientData,
          mnemonic: undefined,
          password: undefined,
        },
        {
          Authorization: `Bearer ${validAccessToken}`,
          'X-Session-Id': validSessionId,
        },
        false,
        false,
      );
    });

    it('should validate all required inputs', async () => {
      logger.configure({ level: LogLevel.SILENT });
      await expect(
        joinCallback(
          null as any,
          validAccessToken,
          validSessionId,
          validAccountName,
          validRecipientPublicKey,
          validRecipientData,
        ),
      ).rejects.toThrow(ValidationError);
      await expect(
        joinCallback(mockCredential, '', validSessionId, validAccountName, validRecipientPublicKey, validRecipientData),
      ).rejects.toThrow(ValidationError);
      await expect(
        joinCallback(
          mockCredential,
          validAccessToken,
          '',
          validAccountName,
          validRecipientPublicKey,
          validRecipientData,
        ),
      ).rejects.toThrow(ValidationError);
      await expect(
        joinCallback(mockCredential, validAccessToken, validSessionId, '', validRecipientPublicKey, validRecipientData),
      ).rejects.toThrow(ValidationError);
      await expect(
        joinCallback(mockCredential, validAccessToken, validSessionId, validAccountName, '', validRecipientData),
      ).rejects.toThrow(ValidationError);
      await expect(
        joinCallback(
          mockCredential,
          validAccessToken,
          validSessionId,
          validAccountName,
          validRecipientPublicKey,
          null as any,
        ),
      ).rejects.toThrow(ValidationError);
    });

    it('should handle unauthorized error', async () => {
      logger.configure({ level: LogLevel.SILENT });
      mockApi.mockResolvedValueOnce({
        success: false,
        error: 'Unauthorized',
        statusCode: 401,
      });

      const error = await joinCallback(
        mockCredential,
        validAccessToken,
        validSessionId,
        validAccountName,
        validRecipientPublicKey,
        validRecipientData,
      ).catch((e) => e);
      expect(error).toBeInstanceOf(AuthenticationError);
      expect(error.code).toBe(ErrorCode.UNAUTHORIZED);
    });

    it('should handle invalid attestation error', async () => {
      logger.configure({ level: LogLevel.SILENT });
      mockApi.mockResolvedValueOnce({
        success: false,
        error: 'Invalid attestation',
        statusCode: 400,
      });

      const error = await joinCallback(
        mockCredential,
        validAccessToken,
        validSessionId,
        validAccountName,
        validRecipientPublicKey,
        validRecipientData,
      ).catch((e) => e);
      expect(error).toBeInstanceOf(WebAuthnError);
      expect(error.code).toBe(ErrorCode.PASSKEY_CREATION_FAILED);
    });

    it('should handle missing tokens in response', async () => {
      logger.configure({ level: LogLevel.SILENT });
      mockApi.mockResolvedValueOnce({
        success: true,
        data: {
          success: true,
          // Missing tokens
        },
      });

      await expect(
        joinCallback(
          mockCredential,
          validAccessToken,
          validSessionId,
          validAccountName,
          validRecipientPublicKey,
          validRecipientData,
        ),
      ).rejects.toThrow(WebAuthnError);
    });
  });
});
