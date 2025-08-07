import { internalApi as api } from '../api';
import { APIDefaultResponse, Country } from '../utils/type';
import { logger } from '../utils/logger';

import {
  OTPError,
  ValidationError,
  ErrorCode,
  handleUnknownError,
  isEaseSDKError,
  AuthenticationError,
} from '../utils/errors';

/**
 * Sends a One-Time Password (OTP) to the specified phone number.
 *
 * @param {string} countryCode The country dial code (e.g., '+1', '+44').
 * @param {string} phone The phone number to send the OTP to.
 * @returns {Promise<{ success: boolean }>} A promise that resolves with a success indicator.
 * @throws {ValidationError} If the country code or phone number are invalid or missing.
 * @throws {OTPError} If the API call fails to send the OTP.
 * @throws {EaseSDKError} For any unexpected errors during the operation.
 */
export async function sendOtp(countryCode: string, phone: string): Promise<{ success: boolean }> {
  // Input validation
  if (!countryCode || typeof countryCode !== 'string') {
    throw new ValidationError('Country code is required and must be a string', 'countryCode', countryCode);
  }

  if (!phone || typeof phone !== 'string') {
    throw new ValidationError('Phone number is required and must be a string', 'phone', phone);
  }

  // Basic phone number validation
  const phoneRegex = /^[\d\s\-\+\(\)]+$/;
  if (!phoneRegex.test(phone)) {
    throw new ValidationError('Invalid phone number format', 'phone', phone);
  }

  try {
    const response = await api(
      `/phone/send-otp`,
      'POST',
      {
        countryCode: countryCode.trim(),
        phone: phone.trim(),
      },
      undefined,
      false,
    );

    if (!response.success) {
      logger.error('OTP send failed:', {
        success: response.success,
        data: response.data,
        countryCode,
        phone: phone.substring(0, 3) + '***', // Mask phone for privacy
        error: response.error,
        statusCode: response.statusCode,
      });

      if (response.errorDetails && isEaseSDKError(response.errorDetails)) {
        throw response.errorDetails;
      }

      throw new OTPError(response.error || 'Failed to send OTP', ErrorCode.OTP_SEND_FAILED, {
        countryCode,
        phonePrefix: phone.substring(0, 3),
      });
    }

    return { success: true };
  } catch (error) {
    if (isEaseSDKError(error)) {
      throw error;
    }

    const enhancedError = handleUnknownError(error, {
      operation: 'sendOtp',
      countryCode,
      phonePrefix: phone.substring(0, 3),
    });

    logger.error('Unexpected error in sendOtp:', enhancedError);
    throw enhancedError;
  }
}

/**
 * Verifies a One-Time Password (OTP) for a given phone number.
 *
 * @param {string} countryCode The country dial code (e.g., '+1', '+44').
 * @param {string} phone The phone number associated with the OTP.
 * @param {string} otpCode The OTP received by the user.
 * @param {string} [chainID='0001'] The chain ID for the verification (defaults to '0001').
 * @returns {Promise<APIDefaultResponse>} A promise that resolves with an access token and refresh token upon successful verification.
 * @throws {ValidationError} If any of the input parameters are invalid or missing.
 * @throws {OTPError} If the OTP verification fails due to invalid code, expiration, or other API errors.
 * @throws {EaseSDKError} For any unexpected errors during the operation.
 */
export async function verifyOtp(
  countryCode: string,
  phone: string,
  otpCode: string,
  chainID: string = '0001', // hardcoded for now since we haven't implemented chain selection neither chainIds in the backend.
): Promise<APIDefaultResponse> {
  // Input validation
  if (!countryCode || typeof countryCode !== 'string') {
    throw new ValidationError('Country code is required and must be a string', 'countryCode', countryCode);
  }

  if (!phone || typeof phone !== 'string') {
    throw new ValidationError('Phone number is required and must be a string', 'phone', phone);
  }

  if (!otpCode || typeof otpCode !== 'string') {
    throw new ValidationError('OTP code is required and must be a string', 'otpCode', otpCode);
  }

  // Basic OTP validation
  const otpRegex = /^\d{4,8}$/; // 4-8 digits
  if (!otpRegex.test(otpCode.trim())) {
    throw new ValidationError('OTP code must be 4-8 digits', 'otpCode', otpCode);
  }

  if (!chainID || typeof chainID !== 'string') {
    throw new ValidationError('Chain ID is required and must be a string', 'chainID', chainID);
  }

  logger.debug('Verifying OTP:', {
    countryCode,
    phonePrefix: phone.substring(0, 3) + '***',
    otpLength: otpCode.length,
    chainID,
  });

  try {
    const response = await api<APIDefaultResponse>(
      '/phone/verify-otp',
      'POST',
      {
        countryCode: countryCode.trim(),
        phone: phone.trim(),
        otpCode: otpCode.trim(),
        chainID: chainID.trim(),
      },
      undefined,
      false,
    );

    if (!response.success) {
      logger.error('OTP verification failed:', {
        countryCode,
        phonePrefix: phone.substring(0, 3) + '***',
        otpLength: otpCode.length,
        chainID,
        error: response.error,
        statusCode: response.statusCode,
      });

      if (response.errorDetails && isEaseSDKError(response.errorDetails)) {
        throw response.errorDetails;
      }

      // Map common OTP verification errors
      if (response.statusCode === 400) {
        throw new OTPError(response.error || 'Invalid OTP code', ErrorCode.INVALID_OTP, {
          countryCode,
          phonePrefix: phone.substring(0, 3),
        });
      }

      if (response.statusCode === 401) {
        throw new OTPError('OTP code has expired', ErrorCode.OTP_EXPIRED, {
          countryCode,
          phonePrefix: phone.substring(0, 3),
        });
      }

      throw new OTPError(response.error || 'OTP verification failed', ErrorCode.OTP_VERIFY_FAILED, {
        countryCode,
        phonePrefix: phone.substring(0, 3),
      });
    }

    if (!response.data || !response.data.accessToken || !response.data.refreshToken) {
      throw new OTPError('Invalid response: missing authentication tokens', ErrorCode.OTP_VERIFY_FAILED, {
        countryCode,
        phonePrefix: phone.substring(0, 3),
      });
    }

    const { accessToken, refreshToken } = response.data;

    return {
      accessToken,
      refreshToken,
    };
  } catch (error) {
    if (isEaseSDKError(error)) {
      throw error;
    }

    const enhancedError = handleUnknownError(error, {
      operation: 'verifyOtp',
      countryCode,
      phonePrefix: phone.substring(0, 3),
      otpLength: otpCode.length,
      chainID,
    });

    logger.error('Unexpected error in verifyOtp:', enhancedError);
    throw enhancedError;
  }
}

/**
 * Retrieves a list of supported countries for phone number operations.
 *
 * @returns {Promise<Country[]>} A promise that resolves with an array of country objects.
 * @throws {AuthenticationError} If the API call fails to fetch countries or returns an invalid response.
 * @throws {EaseSDKError} For any unexpected errors during the operation.
 */
export async function getCountries(): Promise<Country[]> {
  try {
    const response = await api<Country[]>('/phone/countries', 'GET', null, undefined, false);

    if (!response.success) {
      logger.error('Failed to fetch countries:', {
        error: response.error,
        statusCode: response.statusCode,
      });

      if (response.errorDetails && isEaseSDKError(response.errorDetails)) {
        throw response.errorDetails;
      }

      throw new AuthenticationError(response.error || 'Failed to fetch countries', ErrorCode.AUTHENTICATION_FAILED);
    }

    if (!response.data) {
      throw new AuthenticationError('Invalid response: missing countries data', ErrorCode.AUTHENTICATION_FAILED);
    }

    return response.data;
  } catch (error) {
    if (isEaseSDKError(error)) {
      throw error;
    }

    const enhancedError = handleUnknownError(error, { operation: 'getCountries' });

    logger.error('Unexpected error in getCountries:', enhancedError);
    throw enhancedError;
  }
}
