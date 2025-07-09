import { internalApi as api } from '../api';
import { APIDefaultResponse, SendOtpResp } from '../utils/type';
import { logger } from '../utils/logger';

import { OTPError, ValidationError, ErrorCode, handleUnknownError, isEaseSDKError } from '../utils/errors';

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
    const response = await api<SendOtpResp>(
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

    return { success: response.data!.success };
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
      success: true,
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
