import { internalApi as api } from '../api';
import { APIDefaultResponse, JoinResponse, OptionsResp, PublicKeyCredential } from '../utils/type';
import { logger } from '../utils/logger';
import {
  AuthenticationError,
  WebAuthnError,
  ValidationError,
  ErrorCode,
  handleUnknownError,
  isEaseSDKError,
} from '../utils/errors';

export async function join(accessToken: string): Promise<JoinResponse> {
  // Input validation
  if (!accessToken || typeof accessToken !== 'string') {
    throw new ValidationError('Access token is required and must be a string', 'accessToken', accessToken);
  }

  // Basic token format validation
  if (accessToken.trim().length < 10) {
    throw new ValidationError('Access token appears to be invalid', 'accessToken', 'token too short');
  }

  try {
    const response = await api<OptionsResp>(
      '/join/options',
      'POST',
      {},
      {
        Authorization: `Bearer ${accessToken.trim()}`,
      },
      false,
    );

    if (!response.success) {
      logger.error('Join options request failed:', {
        tokenPrefix: accessToken.substring(0, 8) + '***',
        error: response.error,
        statusCode: response.statusCode,
      });

      if (response.errorDetails && isEaseSDKError(response.errorDetails)) {
        throw response.errorDetails;
      }

      // Map common join errors
      if (response.statusCode === 401) {
        throw new AuthenticationError('Invalid or expired access token', ErrorCode.UNAUTHORIZED, {
          tokenPrefix: accessToken.substring(0, 8),
        });
      }

      throw new WebAuthnError(
        response.error || 'Failed to get passkey creation options',
        ErrorCode.PASSKEY_CREATION_FAILED,
        { tokenPrefix: accessToken.substring(0, 8) },
      );
    }

    if (!response.data) {
      throw new WebAuthnError('Invalid response: missing join data', ErrorCode.PASSKEY_CREATION_FAILED, {
        tokenPrefix: accessToken.substring(0, 8),
      });
    }

    const { publicKey } = response.data;

    if (!publicKey) {
      throw new WebAuthnError(
        'Invalid response: missing WebAuthn creation options',
        ErrorCode.PASSKEY_CREATION_FAILED,
        { tokenPrefix: accessToken.substring(0, 8) },
      );
    }

    const sessionId = response.headers?.get('X-Session-Id');

    if (!sessionId) {
      logger.warn('Missing session ID in join response headers');
    }

    logger.debug('Join options retrieved successfully:', {
      tokenPrefix: accessToken.substring(0, 8) + '***',
      sessionId: sessionId?.substring(0, 8) + '***' || 'none',
      hasPublicKey: !!publicKey,
    });

    return {
      publicKey,
      sessionId: sessionId || '',
    };
  } catch (error) {
    if (isEaseSDKError(error)) {
      throw error;
    }

    const enhancedError = handleUnknownError(error, {
      operation: 'join',
      tokenPrefix: accessToken.substring(0, 8),
    });

    logger.error('Unexpected error in join:', enhancedError);
    throw enhancedError;
  }
}

export async function joinCallback(
  credential: PublicKeyCredential,
  accessToken: string,
  sessionId: string,
): Promise<APIDefaultResponse> {
  // Input validation
  if (!credential) {
    throw new ValidationError('WebAuthn credential is required', 'credential', credential);
  }

  if (!accessToken || typeof accessToken !== 'string') {
    throw new ValidationError('Access token is required and must be a string', 'accessToken', accessToken);
  }

  if (!sessionId || typeof sessionId !== 'string') {
    throw new ValidationError('Session ID is required and must be a string', 'sessionId', sessionId);
  }

  // Validate credential structure
  if (!credential.id || !credential.response || credential.type !== 'public-key') {
    throw new ValidationError('Invalid WebAuthn credential format', 'credential', {
      hasId: !!credential.id,
      hasResponse: !!credential.response,
      type: credential.type,
    });
  }

  try {
    const responseCallback = await api<APIDefaultResponse>(
      '/join/callback',
      'POST',
      {
        publicKey: credential,
      },
      {
        Authorization: `Bearer ${accessToken.trim()}`,
        'X-Session-Id': sessionId.trim(),
      },
      false,
    );

    if (!responseCallback.success) {
      logger.error('Join callback failed:', {
        tokenPrefix: accessToken.substring(0, 8) + '***',
        sessionId: sessionId.substring(0, 8) + '***',
        credentialId: credential.id.substring(0, 8) + '***',
        error: responseCallback.error,
        statusCode: responseCallback.statusCode,
      });

      if (responseCallback.errorDetails && isEaseSDKError(responseCallback.errorDetails)) {
        throw responseCallback.errorDetails;
      }

      // Map common join callback errors
      if (responseCallback.statusCode === 401) {
        throw new AuthenticationError('Invalid or expired access token', ErrorCode.UNAUTHORIZED, {
          tokenPrefix: accessToken.substring(0, 8),
          sessionId: sessionId.substring(0, 8),
        });
      }

      if (responseCallback.statusCode === 400) {
        throw new WebAuthnError(
          responseCallback.error || 'Invalid WebAuthn attestation',
          ErrorCode.PASSKEY_CREATION_FAILED,
          {
            tokenPrefix: accessToken.substring(0, 8),
            sessionId: sessionId.substring(0, 8),
          },
        );
      }

      throw new WebAuthnError(responseCallback.error || 'Passkey creation failed', ErrorCode.PASSKEY_CREATION_FAILED, {
        tokenPrefix: accessToken.substring(0, 8),
        sessionId: sessionId.substring(0, 8),
      });
    }

    if (!responseCallback.data || !responseCallback.data.accessToken || !responseCallback.data.refreshToken) {
      throw new WebAuthnError('Invalid response: missing authentication tokens', ErrorCode.PASSKEY_CREATION_FAILED, {
        tokenPrefix: accessToken.substring(0, 8),
        sessionId: sessionId.substring(0, 8),
      });
    }

    const { accessToken: newAccessToken, refreshToken } = responseCallback.data;

    logger.debug('Passkey creation successful:', {
      tokenPrefix: accessToken.substring(0, 8) + '***',
      sessionId: sessionId.substring(0, 8) + '***',
      credentialId: credential.id.substring(0, 8) + '***',
      hasNewAccessToken: !!newAccessToken,
      hasRefreshToken: !!refreshToken,
    });

    return {
      success: true,
      accessToken: newAccessToken,
      refreshToken: refreshToken,
    };
  } catch (error) {
    if (isEaseSDKError(error)) {
      throw error;
    }

    const enhancedError = handleUnknownError(error, {
      operation: 'joinCallback',
      tokenPrefix: accessToken.substring(0, 8),
      sessionId: sessionId.substring(0, 8),
      credentialId: credential.id?.substring(0, 8),
    });

    logger.error('Unexpected error in joinCallback:', enhancedError);
    throw enhancedError;
  }
}
