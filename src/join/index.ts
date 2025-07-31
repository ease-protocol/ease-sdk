import { internalApi } from '../api';
import { JoinResponse, OptionsResp, PublicKeyCredential, JoinCallbackResponse, RecipientData } from '../utils/type';
import { logger } from '../utils/logger';
import {
  AuthenticationError,
  WebAuthnError,
  ValidationError,
  ErrorCode,
  handleUnknownError,
  isEaseSDKError,
} from '../utils/errors';

/**
 * Initiates the join (registration) process by fetching WebAuthn options from the API.
 * This is the first step in registering a new user with a passkey.
 *
 * @param {string} accessToken The access token for authorization.
 * @param {string} displayName The display name for the new user.
 * @returns {Promise<JoinResponse>} A promise that resolves with the WebAuthn public key credential creation options and a session ID.
 * @throws {ValidationError} If the access token or display name are invalid or missing.
 * @throws {AuthenticationError} If the access token is invalid or expired.
 * @throws {WebAuthnError} If passkey creation options are not available or missing from the response.
 * @throws {EaseSDKError} For any unexpected errors during the operation.
 */
export async function join(accessToken: string, displayName: string): Promise<JoinResponse> {
  if (!accessToken || typeof accessToken !== 'string') {
    throw new ValidationError('Access token is required and must be a string', 'accessToken', accessToken);
  }
  if (accessToken.trim().length < 10) {
    throw new ValidationError('Access token appears to be invalid', 'accessToken', 'token too short');
  }
  if (!displayName || typeof displayName !== 'string') {
    throw new ValidationError('Display name is required and must be a string', 'displayName', displayName);
  }

  try {
    const response = await internalApi<OptionsResp>(
      '/join/options',
      'POST',
      {
        displayName,
      },
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

      if (response.statusCode === 401) {
        throw new AuthenticationError('Invalid or expired access token', ErrorCode.UNAUTHORIZED, {
          tokenPrefix: accessToken.substring(0, 8),
          displayName,
        });
      }

      throw new WebAuthnError(
        response.error || 'Failed to get passkey creation options',
        ErrorCode.PASSKEY_CREATION_FAILED,
        { tokenPrefix: accessToken.substring(0, 8), displayName },
      );
    }

    if (!response.data) {
      throw new WebAuthnError('Invalid response: missing join data', ErrorCode.PASSKEY_CREATION_FAILED, {
        tokenPrefix: accessToken.substring(0, 8),
        displayName,
      });
    }

    const { publicKey } = response.data;

    if (!publicKey) {
      throw new WebAuthnError(
        'Invalid response: missing WebAuthn creation options',
        ErrorCode.PASSKEY_CREATION_FAILED,
        { tokenPrefix: accessToken.substring(0, 8), displayName },
      );
    }

    const sessionId = response.headers?.get('X-Session-Id');

    if (!sessionId) {
      logger.warn('Missing session ID in join response headers');

      throw new WebAuthnError('Invalid response: missing session ID', ErrorCode.PASSKEY_CREATION_FAILED, {
        tokenPrefix: accessToken.substring(0, 8),
        displayName,
      });
    }

    logger.debug('Join options retrieved successfully:', {
      tokenPrefix: accessToken.substring(0, 8) + '***',
      sessionId: sessionId?.substring(0, 8) + '***' || 'none',
      hasPublicKey: !!publicKey,
    });

    return {
      publicKey,
      sessionId,
    };
  } catch (error) {
    if (isEaseSDKError(error)) {
      throw error;
    }

    const enhancedError = handleUnknownError(error, {
      operation: 'join',
      tokenPrefix: accessToken.substring(0, 8),
      displayName,
    });

    logger.error('Unexpected error in join:', enhancedError);
    throw enhancedError;
  }
}

/**
 * Completes the join (registration) process by sending the created WebAuthn credential back to the API.
 * This is the second step in registering a new user, following `join()`.
 *
 * @param {PublicKeyCredential} credential The WebAuthn credential obtained from the user's authenticator.
 * @param {string} accessToken The access token for authorization.
 * @param {string} sessionId The session ID received from the `join()` function.
 * @param {string} accountName The desired account name for the new user.
 * @param {string} recipientPublicKey The public key of the recipient.
 * @param {RecipientData} recipientData Encrypted recipient data.
 * @param {string} [mnemonic] Optional mnemonic phrase for wallet recovery.
 * @param {string} [password] Optional password for wallet encryption.
 * @returns {Promise<JoinCallbackResponse>} A promise that resolves with success status, new access token, refresh token, and recipient data.
 * @throws {ValidationError} If any required parameters are invalid or missing.
 * @throws {AuthenticationError} If the access token is invalid or expired.
 * @throws {WebAuthnError} If the WebAuthn attestation is invalid or passkey creation fails.
 * @throws {EaseSDKError} For any unexpected errors during the operation.
 */
export async function joinCallback(
  credential: PublicKeyCredential,
  accessToken: string,
  sessionId: string,
  accountName: string,
  recipientPublicKey: string,
  recipientData: RecipientData,
  mnemonic?: string,
  password?: string,
): Promise<JoinCallbackResponse> {
  if (!credential) {
    throw new ValidationError('WebAuthn credential is required', 'credential', credential);
  }
  if (!accessToken || typeof accessToken !== 'string') {
    throw new ValidationError('Access token is required and must be a string', 'accessToken', accessToken);
  }
  if (!sessionId || typeof sessionId !== 'string') {
    throw new ValidationError('Session ID is required and must be a string', 'sessionId', sessionId);
  }
  if (!accountName || typeof accountName !== 'string') {
    throw new ValidationError('Account name is required and must be a string', 'accountName', accountName);
  }
  if (!recipientPublicKey || typeof recipientPublicKey !== 'string') {
    throw new ValidationError(
      'Recipient public key is required and must be a string',
      'recipientPublicKey',
      recipientPublicKey,
    );
  }
  if (!recipientData) {
    throw new ValidationError('Recipient data is required', 'recipientData', recipientData);
  }

  if (!credential.id || !credential.response || credential.type !== 'public-key') {
    throw new ValidationError('Invalid WebAuthn credential format', 'credential', {
      hasId: !!credential.id,
      hasResponse: !!credential.response,
      type: credential.type,
    });
  }

  try {
    const responseCallback = await internalApi<JoinCallbackResponse>(
      '/join/callback',
      'POST',
      {
        response: credential,
        accountName,
        recipientPublicKey,
        recipientData,
        mnemonic,
        password,
      },
      {
        Authorization: `Bearer ${accessToken.trim()}`,
        'X-Session-Id': sessionId.trim(),
      },
      false,
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

    if (
      !responseCallback.data ||
      !responseCallback.data.accessToken ||
      !responseCallback.data.refreshToken ||
      !responseCallback.data.recipientData
    ) {
      logger.error('Invalid response: missing required fields', { responseCallback });

      throw new WebAuthnError('Invalid response: missing authentication tokens', ErrorCode.PASSKEY_CREATION_FAILED, {
        tokenPrefix: accessToken.substring(0, 8),
        sessionId: sessionId.substring(0, 8),
      });
    }

    const {
      accessToken: newAccessToken,
      refreshToken,
      recipientData: newRecipientData,
      mnemonic: newMnemonic,
    } = responseCallback.data;

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
      refreshToken,
      recipientData: newRecipientData,
      mnemonic: newMnemonic,
    };
  } catch (error) {
    logger.error('** Unexpected error in joinCallback:', error);

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
