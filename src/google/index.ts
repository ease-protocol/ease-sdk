import { internalApi as api } from '../api';
import { logger } from '../utils/logger';
import { AuthenticationError, ErrorCode, handleUnknownError, isEaseSDKError } from '../utils/errors';
import { GoogleOAuthURLResponse, GoogleOAuthCallbackRequest, GoogleOAuthCallbackResponse } from '../utils/type';

export async function getGoogleOAuthURL(): Promise<GoogleOAuthURLResponse> {
  try {
    const response = await api<GoogleOAuthURLResponse>('/oauth/google', 'GET');

    if (!response.success) {
      logger.error('Google OAuth URL request failed:', {
        error: response.error,
        statusCode: response.statusCode,
      });

      if (response.errorDetails && isEaseSDKError(response.errorDetails)) {
        throw response.errorDetails;
      }

      throw new AuthenticationError(
        response.error || 'Failed to get Google OAuth URL',
        ErrorCode.AUTHENTICATION_FAILED,
      );
    }

    if (!response.data) {
      throw new AuthenticationError('Invalid response: missing authURL', ErrorCode.AUTHENTICATION_FAILED);
    }

    return response.data;
  } catch (error) {
    if (isEaseSDKError(error)) {
      throw error;
    }

    const enhancedError = handleUnknownError(error, {
      operation: 'getGoogleOAuthURL',
    });

    logger.error('Unexpected error in getGoogleOAuthURL:', enhancedError);
    throw enhancedError;
  }
}

export async function verifyGoogleOAuthCallback(
  callbackData: GoogleOAuthCallbackRequest,
): Promise<GoogleOAuthCallbackResponse> {
  try {
    const response = await api<GoogleOAuthCallbackResponse>(
      '/oauth/google/callback',
      'POST',
      callbackData,
      undefined,
      false,
    );

    if (!response.success) {
      logger.error('Google OAuth callback failed:', {
        error: response.error,
        statusCode: response.statusCode,
      });

      if (response.errorDetails && isEaseSDKError(response.errorDetails)) {
        throw response.errorDetails;
      }

      throw new AuthenticationError(response.error || 'Google OAuth callback failed', ErrorCode.AUTHENTICATION_FAILED);
    }

    if (!response.data) {
      throw new AuthenticationError('Invalid response: missing tokens', ErrorCode.AUTHENTICATION_FAILED);
    }

    return response.data;
  } catch (error) {
    if (isEaseSDKError(error)) {
      throw error;
    }

    const enhancedError = handleUnknownError(error, {
      operation: 'verifyGoogleOAuthCallback',
    });

    logger.error('Unexpected error in verifyGoogleOAuthCallback:', enhancedError);
    throw enhancedError;
  }
}
