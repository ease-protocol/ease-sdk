import { internalApi as api } from '../api';
import { logger } from '../utils/logger';
import { telemetry } from '../telemetry';
import { AuthenticationError, ErrorCode, ValidationError, handleUnknownError } from '../utils/errors';
import { APIDefaultResponse } from '../utils/type';

export async function refreshToken(refreshToken: string) {
  if (!refreshToken) {
    throw new ValidationError(ErrorCode.INVALID_INPUT, 'Refresh token is required.');
  }

  try {
    logger.debug('Attempting to refresh token...');
    const res = await api<APIDefaultResponse>(
      '/refresh',
      'POST',
      null,
      { Authorization: `Bearer ${refreshToken.trim()}` },
      false,
    );

    if (!res.success) {
      logger.error('Token refresh failed', res);
      throw new AuthenticationError(res.error || 'Token refresh failed', ErrorCode.TOKEN_REFRESH_FAILED);
    }

    if (!res.data?.accessToken || !res.data?.refreshToken) {
      logger.error('Token refresh response is missing tokens', res.data);
      throw new AuthenticationError('Invalid token response.', ErrorCode.TOKEN_REFRESH_FAILED);
    }

    telemetry.trackEvent('token_refresh_success');
    return res.data;
  } catch (error) {
    const enhancedError = handleUnknownError(error, { operation: 'refreshToken' });
    telemetry.trackError(enhancedError, { operation: 'refreshToken' });
    logger.error('An unexpected error occurred during token refresh:', enhancedError);
    if (enhancedError instanceof AuthenticationError) {
      throw enhancedError;
    }
    throw new AuthenticationError('An unexpected error occurred.', ErrorCode.TOKEN_REFRESH_FAILED);
  }
}
