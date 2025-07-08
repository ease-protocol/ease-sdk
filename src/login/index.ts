import { internalApi as api } from '../api';
import { telemetry } from '../telemetry';
import { APIDefaultResponse, LoginResp, PublicKeyCredential } from '../utils/type';
import { logger } from '../utils/logger';
import {
  AuthenticationError,
  WebAuthnError,
  ValidationError,
  ErrorCode,
  handleUnknownError,
  isEaseSDKError,
} from '../utils/errors';

export async function login(): Promise<LoginResp> {
  try {
    const response = await api<LoginResp>('/login/options', 'POST', null, undefined, false);

    if (!response.success) {
      logger.error('Login options request failed:', {
        error: response.error,
        statusCode: response.statusCode,
      });

      if (response.errorDetails && isEaseSDKError(response.errorDetails)) {
        throw response.errorDetails;
      }

      throw new AuthenticationError(response.error || 'Failed to get login options', ErrorCode.AUTHENTICATION_FAILED);
    }

    if (!response.data) {
      throw new AuthenticationError('Invalid response: missing login data', ErrorCode.AUTHENTICATION_FAILED);
    }

    const sessionId = response.headers?.get('X-Session-Id');

    if (!sessionId) {
      logger.error('Missing session ID in login response headers');
      throw new AuthenticationError('Session ID not found in response', ErrorCode.SESSION_EXPIRED);
    }

    if (!response.data.publicKey) {
      throw new WebAuthnError('Invalid response: missing WebAuthn options', ErrorCode.WEBAUTHN_NOT_SUPPORTED);
    }

    logger.debug('Login options retrieved successfully:', {
      sessionId: sessionId.substring(0, 8) + '***',
      hasPublicKey: !!response.data.publicKey,
    });

    telemetry.trackEvent('login_success', {
      sessionId: sessionId.substring(0, 8) + '***',
      hasPublicKey: !!response.data.publicKey,
    });

    return {
      sessionId,
      publicKey: response.data.publicKey,
    };
  } catch (error) {
    if (isEaseSDKError(error)) {
      throw error;
    }

    const enhancedError = handleUnknownError(error, {
      operation: 'login',
    });

    telemetry.trackError(enhancedError, {
      operation: 'login',
    });

    logger.error('Unexpected error in login:', enhancedError);
    throw enhancedError;
  }
}

export async function loginCallback(credential: PublicKeyCredential, sessionId: string): Promise<APIDefaultResponse> {
  // Input validation
  if (!credential) {
    throw new ValidationError('WebAuthn credential is required', 'credential', credential);
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
    const response = await api<APIDefaultResponse>(
      '/login/callback',
      'POST',
      credential,
      {
        'X-Session-Id': sessionId,
      },
      false,
    );

    if (!response.success) {
      logger.error('Login callback failed:', {
        sessionId: sessionId.substring(0, 8) + '***',
        credentialId: credential.id.substring(0, 8) + '***',
        error: response.error,
        statusCode: response.statusCode,
      });

      if (response.errorDetails && isEaseSDKError(response.errorDetails)) {
        throw response.errorDetails;
      }

      // Map common login callback errors
      if (response.statusCode === 401) {
        throw new AuthenticationError('Authentication failed: invalid credentials', ErrorCode.INVALID_CREDENTIALS, {
          sessionId: sessionId.substring(0, 8),
        });
      }

      if (response.statusCode === 400) {
        throw new WebAuthnError(
          response.error || 'Invalid WebAuthn assertion',
          ErrorCode.PASSKEY_AUTHENTICATION_FAILED,
          { sessionId: sessionId.substring(0, 8) },
        );
      }

      throw new AuthenticationError(response.error || 'Login authentication failed', ErrorCode.AUTHENTICATION_FAILED, {
        sessionId: sessionId.substring(0, 8),
      });
    }

    if (!response.data || !response.data.accessToken || !response.data.refreshToken) {
      throw new AuthenticationError(
        'Invalid response: missing authentication tokens',
        ErrorCode.AUTHENTICATION_FAILED,
        { sessionId: sessionId.substring(0, 8) },
      );
    }

    const { accessToken, refreshToken } = response.data;

    telemetry.trackEvent('login_callback_success', {
      sessionId: sessionId.substring(0, 8) + '***',
      credentialId: credential.id.substring(0, 8) + '***',
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
    });

    return {
      success: true,
      accessToken,
      refreshToken,
    };
  } catch (error) {
    if (isEaseSDKError(error)) {
      throw error;
    }

    const enhancedError = handleUnknownError(error, {
      operation: 'loginCallback',
      sessionId: sessionId.substring(0, 8),
      credentialId: credential.id?.substring(0, 8),
    });

    telemetry.trackError(enhancedError, {
      operation: 'loginCallback',
      sessionId: sessionId.substring(0, 8),
      credentialId: credential.id?.substring(0, 8),
    });

    logger.error('Unexpected error in loginCallback:', enhancedError);
    throw enhancedError;
  }
}
