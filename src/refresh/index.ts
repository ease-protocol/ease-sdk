import { api } from '../api';
import { logger } from '../utils/logger';
import { AuthenticationError, ErrorCode, ValidationError } from '../utils/errors';
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

    logger.debug('Token refreshed successfully.');
    return res.data;
  } catch (error) {
    logger.error('An unexpected error occurred during token refresh:', error);
    if (error instanceof AuthenticationError) {
      throw error;
    }
    throw new AuthenticationError('An unexpected error occurred.', ErrorCode.TOKEN_REFRESH_FAILED);
  }
}