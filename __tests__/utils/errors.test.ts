import {
  EaseSDKError,
  NetworkError,
  APIError,
  AuthenticationError,
  ValidationError,
  OTPError,
  WebAuthnError,
  ErrorCode,
  mapHTTPStatusToErrorCode,
  createErrorFromAPIResponse,
  isEaseSDKError,
  handleUnknownError,
} from '../../src/utils/errors';

describe('Error Utils', () => {
  describe('EaseSDKError', () => {
    it('should create error with all properties', () => {
      const details = {
        code: ErrorCode.API_ERROR,
        message: 'Test error',
        statusCode: 400,
        cause: new Error('Original error'),
        context: { test: 'context' },
        timestamp: new Date(),
      };

      const error = new EaseSDKError(details);

      expect(error.code).toBe(ErrorCode.API_ERROR);
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.cause).toBeInstanceOf(Error);
      expect(error.context).toEqual({ test: 'context' });
      expect(error.timestamp).toBeInstanceOf(Date);
      expect(error.name).toBe('EaseSDKError');
    });

    it('should set timestamp if not provided', () => {
      const error = new EaseSDKError({
        code: ErrorCode.API_ERROR,
        message: 'Test error',
      });

      expect(error.timestamp).toBeInstanceOf(Date);
    });

    it('should serialize to JSON correctly', () => {
      const error = new EaseSDKError({
        code: ErrorCode.API_ERROR,
        message: 'Test error',
        statusCode: 400,
        context: { test: 'context' },
      });

      const json = error.toJSON();

      expect(json.name).toBe('EaseSDKError');
      expect(json.message).toBe('Test error');
      expect(json.code).toBe(ErrorCode.API_ERROR);
      expect(json.statusCode).toBe(400);
      expect(json.context).toEqual({ test: 'context' });
      expect(json.timestamp).toBeInstanceOf(Date);
      expect(json.stack).toBeDefined();
    });
  });

  describe('Specific Error Classes', () => {
    it('should create NetworkError correctly', () => {
      const error = new NetworkError('Network failed', new Error('Original'), { url: 'test' });

      expect(error).toBeInstanceOf(EaseSDKError);
      expect(error.name).toBe('NetworkError');
      expect(error.code).toBe(ErrorCode.NETWORK_ERROR);
      expect(error.message).toBe('Network failed');
      expect(error.cause).toBeInstanceOf(Error);
      expect(error.context).toEqual({ url: 'test' });
    });

    it('should create APIError correctly', () => {
      const error = new APIError('API failed', 500, new Error('Original'), { endpoint: 'test' });

      expect(error).toBeInstanceOf(EaseSDKError);
      expect(error.name).toBe('APIError');
      expect(error.code).toBe(ErrorCode.API_ERROR);
      expect(error.statusCode).toBe(500);
    });

    it('should create AuthenticationError correctly', () => {
      const error = new AuthenticationError('Auth failed', ErrorCode.INVALID_CREDENTIALS, { user: 'test' });

      expect(error).toBeInstanceOf(EaseSDKError);
      expect(error.name).toBe('AuthenticationError');
      expect(error.code).toBe(ErrorCode.INVALID_CREDENTIALS);
      expect(error.statusCode).toBe(401);
    });

    it('should create ValidationError correctly', () => {
      const error = new ValidationError('Invalid input', 'email', 'invalid-email');

      expect(error).toBeInstanceOf(EaseSDKError);
      expect(error.name).toBe('ValidationError');
      expect(error.code).toBe(ErrorCode.INVALID_INPUT);
      expect(error.statusCode).toBe(400);
      expect(error.context).toEqual({ field: 'email', value: 'invalid-email' });
    });

    it('should create OTPError correctly', () => {
      const error = new OTPError('OTP failed', ErrorCode.OTP_EXPIRED, { phone: 'masked' });

      expect(error).toBeInstanceOf(EaseSDKError);
      expect(error.name).toBe('OTPError');
      expect(error.code).toBe(ErrorCode.OTP_EXPIRED);
      expect(error.statusCode).toBe(400);
    });

    it('should create WebAuthnError correctly', () => {
      const error = new WebAuthnError('WebAuthn failed', ErrorCode.PASSKEY_CREATION_FAILED, { browser: 'Chrome' });

      expect(error).toBeInstanceOf(EaseSDKError);
      expect(error.name).toBe('WebAuthnError');
      expect(error.code).toBe(ErrorCode.PASSKEY_CREATION_FAILED);
      expect(error.statusCode).toBe(400);
    });
  });

  describe('mapHTTPStatusToErrorCode', () => {
    it('should map common HTTP status codes correctly', () => {
      expect(mapHTTPStatusToErrorCode(400)).toBe(ErrorCode.INVALID_INPUT);
      expect(mapHTTPStatusToErrorCode(401)).toBe(ErrorCode.UNAUTHORIZED);
      expect(mapHTTPStatusToErrorCode(403)).toBe(ErrorCode.AUTHENTICATION_FAILED);
      expect(mapHTTPStatusToErrorCode(404)).toBe(ErrorCode.API_ERROR);
      expect(mapHTTPStatusToErrorCode(408)).toBe(ErrorCode.TIMEOUT_ERROR);
      expect(mapHTTPStatusToErrorCode(429)).toBe(ErrorCode.RATE_LIMIT_ERROR);
      expect(mapHTTPStatusToErrorCode(500)).toBe(ErrorCode.SERVICE_UNAVAILABLE);
      expect(mapHTTPStatusToErrorCode(502)).toBe(ErrorCode.SERVICE_UNAVAILABLE);
      expect(mapHTTPStatusToErrorCode(503)).toBe(ErrorCode.SERVICE_UNAVAILABLE);
      expect(mapHTTPStatusToErrorCode(504)).toBe(ErrorCode.TIMEOUT_ERROR);
    });

    it('should return API_ERROR for unknown status codes', () => {
      expect(mapHTTPStatusToErrorCode(418)).toBe(ErrorCode.API_ERROR);
      expect(mapHTTPStatusToErrorCode(999)).toBe(ErrorCode.API_ERROR);
    });
  });

  describe('createErrorFromAPIResponse', () => {
    it('should create error from API response with error field', () => {
      const responseData = { error: 'Invalid request' };
      const error = createErrorFromAPIResponse(400, responseData, { url: 'test' });

      expect(error.code).toBe(ErrorCode.INVALID_INPUT);
      expect(error.message).toBe('Invalid request');
      expect(error.statusCode).toBe(400);
      expect(error.context).toEqual({
        url: 'test',
        responseData,
      });
    });

    it('should create error from API response with message field', () => {
      const responseData = { message: 'Something went wrong' };
      const error = createErrorFromAPIResponse(500, responseData);

      expect(error.message).toBe('Something went wrong');
    });

    it('should create error with default message when no error/message field', () => {
      const responseData = { other: 'data' };
      const error = createErrorFromAPIResponse(404, responseData);

      expect(error.message).toBe('HTTP 404 error');
    });
  });

  describe('isEaseSDKError', () => {
    it('should return true for EaseSDKError instances', () => {
      const error = new EaseSDKError({ code: ErrorCode.API_ERROR, message: 'Test' });
      expect(isEaseSDKError(error)).toBe(true);
    });

    it('should return true for specific error class instances', () => {
      const networkError = new NetworkError('Network failed');
      const authError = new AuthenticationError('Auth failed');
      
      expect(isEaseSDKError(networkError)).toBe(true);
      expect(isEaseSDKError(authError)).toBe(true);
    });

    it('should return false for regular Error instances', () => {
      const error = new Error('Regular error');
      expect(isEaseSDKError(error)).toBe(false);
    });

    it('should return false for non-error values', () => {
      expect(isEaseSDKError('string')).toBe(false);
      expect(isEaseSDKError(null)).toBe(false);
      expect(isEaseSDKError(undefined)).toBe(false);
      expect(isEaseSDKError({})).toBe(false);
    });
  });

  describe('handleUnknownError', () => {
    it('should return EaseSDKError as-is', () => {
      const originalError = new EaseSDKError({ code: ErrorCode.API_ERROR, message: 'Test' });
      const result = handleUnknownError(originalError);

      expect(result).toBe(originalError);
    });

    it('should wrap regular Error in EaseSDKError', () => {
      const originalError = new Error('Regular error');
      const result = handleUnknownError(originalError, { context: 'test' });

      expect(result).toBeInstanceOf(EaseSDKError);
      expect(result.code).toBe(ErrorCode.UNKNOWN_ERROR);
      expect(result.message).toBe('Regular error');
      expect(result.cause).toBe(originalError);
      expect(result.context).toEqual({ context: 'test' });
    });

    it('should handle non-Error values', () => {
      const result = handleUnknownError('string error', { context: 'test' });

      expect(result).toBeInstanceOf(EaseSDKError);
      expect(result.code).toBe(ErrorCode.UNKNOWN_ERROR);
      expect(result.message).toBe('An unknown error occurred');
      expect(result.context).toEqual({
        context: 'test',
        originalError: 'string error',
      });
    });

    it('should handle null/undefined', () => {
      const resultNull = handleUnknownError(null);
      const resultUndefined = handleUnknownError(undefined);

      expect(resultNull).toBeInstanceOf(EaseSDKError);
      expect(resultUndefined).toBeInstanceOf(EaseSDKError);
      expect(resultNull.code).toBe(ErrorCode.UNKNOWN_ERROR);
      expect(resultUndefined.code).toBe(ErrorCode.UNKNOWN_ERROR);
    });
  });
});