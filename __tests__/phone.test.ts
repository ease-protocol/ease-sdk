import { sendOtp, verifyOtp, getCountries } from '../src/phone';
import { internalApi } from '../src/api';
import {
  ValidationError,
  OTPError,
  ErrorCode,
  handleUnknownError,
  AuthenticationError,
} from '../src/utils/errors';
import { logger, LogLevel } from '../src/utils/logger';

jest.mock('../src/api', () => ({
  internalApi: jest.fn(),
}));

const mockApi = internalApi as jest.MockedFunction<typeof internalApi>;

describe('Phone Service', () => {
  beforeEach(() => {
    mockApi.mockClear();
    logger.configure({ level: LogLevel.DEBUG });
  });

  describe('sendOtp', () => {
    const validPhone = '1234567890';
    const validCountryCode = '+1';

    it('should send OTP successfully', async () => {
      mockApi.mockResolvedValueOnce({ success: true, data: { success: true } });

      const result = await sendOtp(validCountryCode, validPhone);

      expect(result).toEqual({ success: true });
      expect(mockApi).toHaveBeenCalledWith(
        '/phone/send-otp',
        'POST',
        { phone: validPhone, countryCode: validCountryCode },
        undefined,
        false,
      );
    });

    it('should handle API errors', async () => {
      logger.configure({ level: LogLevel.SILENT });
      mockApi.mockResolvedValueOnce({
        success: false,
        error: 'Rate limit exceeded',
        statusCode: 429,
      });

      await expect(sendOtp(validCountryCode, validPhone)).rejects.toThrow(OTPError);
    });

    it('should handle unexpected errors', async () => {
      logger.configure({ level: LogLevel.SILENT });
      const error = new Error('Network error');
      mockApi.mockRejectedValueOnce(error);

      await expect(sendOtp(validCountryCode, validPhone)).rejects.toThrow(
        handleUnknownError(error, { operation: 'sendOtp' }),
      );
    });

    it('should validate phone and country code', async () => {
      logger.configure({ level: LogLevel.SILENT });
      await expect(sendOtp('', validCountryCode)).rejects.toThrow(ValidationError);
      await expect(sendOtp(validCountryCode, '')).rejects.toThrow(ValidationError);
    });
  });

  describe('verifyOtp', () => {
    const validPhone = '1234567890';
    const validCountryCode = '+1';
    const validOtp = '123456';
    const validChainID = '0001';

    it('should verify OTP successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
        },
      };
      mockApi.mockResolvedValueOnce(mockResponse);

      const result = await verifyOtp(validCountryCode, validPhone, validOtp, validChainID);

      expect(result.accessToken).toBe('access-token');
      expect(mockApi).toHaveBeenCalledWith(
        '/phone/verify-otp',
        'POST',
        {
          phone: validPhone,
          countryCode: validCountryCode,
          otpCode: validOtp,
          chainID: validChainID,
        },
        undefined,
        false,
      );
    });

    it('should handle invalid OTP error', async () => {
      logger.configure({ level: LogLevel.SILENT });
      mockApi.mockResolvedValueOnce({ success: false, error: 'Invalid OTP', statusCode: 400 });

      await expect(verifyOtp(validCountryCode, validPhone, validOtp, validChainID)).rejects.toThrow(OTPError);
    });

    it('should handle expired OTP error', async () => {
      logger.configure({ level: LogLevel.SILENT });
      mockApi.mockResolvedValueOnce({ success: false, error: 'OTP code has expired', statusCode: 401 });

      await expect(verifyOtp(validCountryCode, validPhone, validOtp, validChainID)).rejects.toThrow(OTPError);
    });

    it('should use default chainID if not provided', async () => {
      const mockResponse = {
        success: true,
        data: {
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
        },
      };
      mockApi.mockResolvedValueOnce(mockResponse);

      await verifyOtp(validCountryCode, validPhone, validOtp);

      expect(mockApi).toHaveBeenCalledWith(
        '/phone/verify-otp',
        'POST',
        {
          phone: validPhone,
          countryCode: validCountryCode,
          otpCode: validOtp,
          chainID: '0001',
        },
        undefined,
        false,
      );
    });

    it('should trim input parameters', async () => {
      const mockResponse = {
        success: true,
        data: {
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
        },
      };
      mockApi.mockResolvedValueOnce(mockResponse);

      await verifyOtp(`  ${validCountryCode}  `, `  ${validPhone}  `, `  ${validOtp}  `, `  ${validChainID}  `);

      expect(mockApi).toHaveBeenCalledWith(
        '/phone/verify-otp',
        'POST',
        {
          phone: validPhone,
          countryCode: validCountryCode,
          otpCode: validOtp,
          chainID: validChainID,
        },
        undefined,
        false,
      );
    });
  });

  describe('getCountries', () => {
    it('should return a list of countries', async () => {
      const mockCountries = [{ name: 'United States', code: 'US', dial_code: '+1' }];
      mockApi.mockResolvedValueOnce({ success: true, data: mockCountries });

      const result = await getCountries();

      expect(result).toEqual(mockCountries);
      expect(mockApi).toHaveBeenCalledWith('/phone/countries', 'GET', null, undefined, false);
    });

    it('should handle API errors', async () => {
      logger.configure({ level: LogLevel.SILENT });
      mockApi.mockResolvedValueOnce({ success: false, error: 'Failed to fetch countries' });

      await expect(getCountries()).rejects.toThrow(AuthenticationError);
    });
  });
});


