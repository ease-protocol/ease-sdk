import { sendOtp, verifyOtp } from '../src/phone';
import { api } from '../src/api';
import { ValidationError, OTPError, ErrorCode } from '../src/utils/errors';

jest.mock('../src/api');
const mockApi = api as jest.MockedFunction<typeof api>;

describe('Phone Module', () => {
  beforeEach(() => {
    mockApi.mockClear();
  });

  describe('sendOtp', () => {
    it('should send OTP successfully', async () => {
      mockApi.mockResolvedValueOnce({
        success: true,
        data: { success: true },
      });

      const result = await sendOtp('+1', '1234567890');

      expect(result.success).toBe(true);
      expect(mockApi).toHaveBeenCalledWith('/phone/send-otp', 'POST', {
        countryCode: '+1',
        phone: '1234567890',
      }, undefined, false);
    });

    it('should validate country code', async () => {
      await expect(sendOtp('', '1234567890')).rejects.toThrow(ValidationError);
      await expect(sendOtp(null as any, '1234567890')).rejects.toThrow(ValidationError);
    });

    it('should validate phone number', async () => {
      await expect(sendOtp('+1', '')).rejects.toThrow(ValidationError);
      await expect(sendOtp('+1', null as any)).rejects.toThrow(ValidationError);
      await expect(sendOtp('+1', 'invalid-phone')).rejects.toThrow(ValidationError);
    });

    it('should handle API error responses', async () => {
      mockApi.mockResolvedValueOnce({
        success: false,
        error: 'Rate limit exceeded',
        statusCode: 429,
      });

      await expect(sendOtp('+1', '1234567890')).rejects.toThrow(OTPError);
    });

    it('should handle unexpected errors', async () => {
      mockApi.mockRejectedValueOnce(new Error('Network error'));

      await expect(sendOtp('+1', '1234567890')).rejects.toThrow();
    });

    it('should trim whitespace from inputs', async () => {
      mockApi.mockResolvedValueOnce({
        success: true,
        data: { success: true },
      });

      await sendOtp('  +1  ', '  1234567890  ');

      expect(mockApi).toHaveBeenCalledWith('/phone/send-otp', 'POST', {
        countryCode: '+1',
        phone: '1234567890',
      }, undefined, false);
    });
  });

  describe('verifyOtp', () => {
    it('should verify OTP successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          success: true,
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
        },
      };
      mockApi.mockResolvedValueOnce(mockResponse);

      const result = await verifyOtp('+1', '1234567890', '123456');

      expect(result.success).toBe(true);
      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(mockApi).toHaveBeenCalledWith('/phone/verify-otp', 'POST', {
        countryCode: '+1',
        phone: '1234567890',
        otpCode: '123456',
        chainID: '0001',
      }, undefined, false);
    });

    it('should validate all required inputs', async () => {
      await expect(verifyOtp('', '1234567890', '123456')).rejects.toThrow(ValidationError);
      await expect(verifyOtp('+1', '', '123456')).rejects.toThrow(ValidationError);
      await expect(verifyOtp('+1', '1234567890', '')).rejects.toThrow(ValidationError);
      await expect(verifyOtp('+1', '1234567890', '123456', '')).rejects.toThrow(ValidationError);
    });

    it('should validate OTP format', async () => {
      await expect(verifyOtp('+1', '1234567890', 'abc')).rejects.toThrow(ValidationError);
      await expect(verifyOtp('+1', '1234567890', '12')).rejects.toThrow(ValidationError);
      await expect(verifyOtp('+1', '1234567890', '123456789')).rejects.toThrow(ValidationError);
    });

    it('should handle invalid OTP error', async () => {
      mockApi.mockResolvedValueOnce({
        success: false,
        error: 'Invalid OTP',
        statusCode: 400,
      });

      await expect(verifyOtp('+1', '1234567890', '123456')).rejects.toThrow(OTPError);
    });

    it('should handle expired OTP error', async () => {
      mockApi.mockResolvedValueOnce({
        success: false,
        error: 'OTP expired',
        statusCode: 401,
      });

      const error = await verifyOtp('+1', '1234567890', '123456').catch((e) => e);
      expect(error).toBeInstanceOf(OTPError);
      expect(error.code).toBe(ErrorCode.OTP_EXPIRED);
    });

    it('should handle missing tokens in response', async () => {
      mockApi.mockResolvedValueOnce({
        success: true,
        data: {
          success: true,
          // Missing accessToken and refreshToken
        },
      });

      await expect(verifyOtp('+1', '1234567890', '123456')).rejects.toThrow(OTPError);
    });

    it('should use custom chain ID', async () => {
      mockApi.mockResolvedValueOnce({
        success: true,
        data: {
          success: true,
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
        },
      });

      await verifyOtp('+1', '1234567890', '123456', 'custom-chain');

      expect(mockApi).toHaveBeenCalledWith('/phone/verify-otp', 'POST', {
        countryCode: '+1',
        phone: '1234567890',
        otpCode: '123456',
        chainID: 'custom-chain',
      }, undefined, false);
    });

    it('should trim whitespace from all inputs', async () => {
      mockApi.mockResolvedValueOnce({
        success: true,
        data: {
          success: true,
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
        },
      });

      await verifyOtp('  +1  ', '  1234567890  ', '  123456  ', '  0001  ');

      expect(mockApi).toHaveBeenCalledWith('/phone/verify-otp', 'POST', {
        countryCode: '+1',
        phone: '1234567890',
        otpCode: '123456',
        chainID: '0001',
      }, undefined, false);
    });
  });
});
