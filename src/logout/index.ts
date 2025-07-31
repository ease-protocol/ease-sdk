import { internalApi as api } from '../api';
import { logger } from '../utils/logger';

import { AuthenticationError, ValidationError, ErrorCode, handleUnknownError, isEaseSDKError } from '../utils/errors';

/**
 * Logs out the user by invalidating the provided access token.
 *
 * @param {string} accessToken The access token to invalidate.
 * @returns {Promise<void>} A promise that resolves when the logout request is successfully processed.
 * @throws {ValidationError} If the access token is missing or invalid.
 * @throws {AuthenticationError} If the access token is invalid or expired, or if logout otherwise fails.
 * @throws {EaseSDKError} For any unexpected errors during the operation.
 */
export async function logout(accessToken: string): Promise<void> {
  // Input validation
  if (!accessToken || typeof accessToken !== 'string') {
    throw new ValidationError('Access token is required and must be a string', 'accessToken', accessToken);
  }

  // Basic token format validation
  if (accessToken.trim().length < 10) {
    throw new ValidationError('Access token appears to be invalid', 'accessToken', 'token too short');
  }

  try {
    logger.debug('Initiating logout:', {
      tokenPrefix: accessToken.substring(0, 8) + '***',
    });

    const responseCallback = await api('/logout', 'POST', {}, { Authorization: `Bearer ${accessToken.trim()}` }, false);

    if (!responseCallback.success) {
      logger.error('Logout request failed:', {
        tokenPrefix: accessToken.substring(0, 8) + '***',
        error: responseCallback.error,
        statusCode: responseCallback.statusCode,
      });

      if (responseCallback.errorDetails && isEaseSDKError(responseCallback.errorDetails)) {
        throw responseCallback.errorDetails;
      }

      // Map common logout errors
      if (responseCallback.statusCode === 401) {
        throw new AuthenticationError('Invalid or expired access token', ErrorCode.UNAUTHORIZED, {
          tokenPrefix: accessToken.substring(0, 8),
        });
      }

      throw new AuthenticationError(responseCallback.error || 'Logout failed', ErrorCode.AUTHENTICATION_FAILED, {
        tokenPrefix: accessToken.substring(0, 8),
      });
    }
  } catch (error) {
    if (isEaseSDKError(error)) {
      throw error;
    }

    const enhancedError = handleUnknownError(error, {
      operation: 'logout',
      tokenPrefix: accessToken.substring(0, 8),
    });

    logger.error('Unexpected error in logout:', enhancedError);
    throw enhancedError;
  }
}
