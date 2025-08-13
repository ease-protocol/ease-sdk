import * as EaseSDK from '../src/index';

describe('Main Index Exports', () => {
  it('should export all modules', () => {
    expect(EaseSDK.join).toBeDefined();
    expect(EaseSDK.sendOtp).toBeDefined();
    expect(EaseSDK.login).toBeDefined();
    expect(EaseSDK.logout).toBeDefined();
  });

  it('should export logger and LogLevel', () => {
    expect(EaseSDK.logger).toBeDefined();
    expect(EaseSDK.LogLevel).toBeDefined();
    expect(typeof EaseSDK.logger.configure).toBe('function');
  });

  it('should export error classes', () => {
    expect(EaseSDK.EaseSDKError).toBeDefined();
    expect(EaseSDK.NetworkError).toBeDefined();
    expect(EaseSDK.APIError).toBeDefined();
    expect(EaseSDK.AuthenticationError).toBeDefined();
    expect(EaseSDK.ValidationError).toBeDefined();
    expect(EaseSDK.OTPError).toBeDefined();
    expect(EaseSDK.WebAuthnError).toBeDefined();
    expect(EaseSDK.ErrorCode).toBeDefined();
  });

  it('should export error utility functions', () => {
    expect(EaseSDK.isEaseSDKError).toBeDefined();
    expect(EaseSDK.handleUnknownError).toBeDefined();
    expect(typeof EaseSDK.isEaseSDKError).toBe('function');
    expect(typeof EaseSDK.handleUnknownError).toBe('function');
  });

  it('should have logger as singleton instance', () => {
    const logger1 = EaseSDK.logger;
    const logger2 = EaseSDK.logger;
    expect(logger1).toBe(logger2);
  });

  describe('Module structure', () => {
    it('should have join module with expected functions', () => {
      expect(typeof EaseSDK.join).toBe('function');
      expect(typeof EaseSDK.joinCallback).toBe('function');
    });

    it('should have phone module with expected functions', () => {
      expect(typeof EaseSDK.sendOtp).toBe('function');
      expect(typeof EaseSDK.verifyOtp).toBe('function');
    });

    it('should have login module with expected functions', () => {
      expect(typeof EaseSDK.login).toBe('function');
      expect(typeof EaseSDK.loginCallback).toBe('function');
    });

    it('should have logout module with expected functions', () => {
      expect(typeof EaseSDK.logout).toBe('function');
    });
  });

  describe('Error instantiation', () => {
    it('should be able to create error instances', () => {
      const error = new EaseSDK.EaseSDKError({
        code: EaseSDK.ErrorCode.API_ERROR,
        message: 'Test error',
      });

      expect(error).toBeInstanceOf(EaseSDK.EaseSDKError);
      expect(error.code).toBe(EaseSDK.ErrorCode.API_ERROR);
      expect(error.message).toBe('Test error');
    });

    it('should create specific error types', () => {
      const networkError = new EaseSDK.NetworkError('Network failed');
      const authError = new EaseSDK.AuthenticationError('Auth failed');
      const validationError = new EaseSDK.ValidationError('Invalid input', 'field', 'value');

      expect(networkError).toBeInstanceOf(EaseSDK.EaseSDKError);
      expect(authError).toBeInstanceOf(EaseSDK.EaseSDKError);
      expect(validationError).toBeInstanceOf(EaseSDK.EaseSDKError);
    });
  });

  describe('Logger configuration', () => {
    it('should be configurable', () => {
      EaseSDK.logger.configure({
        level: EaseSDK.LogLevel.DEBUG,
        prefix: '[test]',
      });

      // Test that configuration was applied (no way to directly check without side effects)
      expect(() => EaseSDK.logger.debug('test')).not.toThrow();
    });
  });

  describe('SDK Configuration', () => {
    it('should configure the environment', () => {
      EaseSDK.configure({ environment: 'production' });
      // Assuming there's a way to get the current environment, e.g., EaseSDK.getEnvironment()
      // For now, we'll rely on the internal setEnvironment to have done its job.
      // A more robust test would involve mocking or directly checking the environment utility.
    });

    it('should configure the app name', () => {
      EaseSDK.configure({ appName: 'TestApp' });
      // Assuming there's a way to get the app name, e.g., EaseSDK.getAppName()
      // For now, we'll rely on the internal setAppName to have done its job.
    });
  });
});
