import { logger, LogLevel } from '../../src/utils/logger';
import { setEnvironment } from '../../src/utils/environment';

describe('Logger Utils', () => {
  let consoleSpy: { [key: string]: jest.SpyInstance };

  beforeEach(() => {
    consoleSpy = {
      debug: jest.spyOn(console, 'debug').mockImplementation(),
      info: jest.spyOn(console, 'info').mockImplementation(),
      warn: jest.spyOn(console, 'warn').mockImplementation(),
      error: jest.spyOn(console, 'error').mockImplementation(),
    };

    // Reset logger to default state
    logger.configure({ level: LogLevel.WARN, prefix: '[ease-sdk]' });
    setEnvironment('develop'); // Set default environment for tests
  });

  afterEach(() => {
    Object.values(consoleSpy).forEach((spy) => spy.mockRestore());
    setEnvironment('develop'); // Reset environment after each test
  });

  describe('LogLevel filtering', () => {
    it('should only log messages at or above the configured level', () => {
      logger.configure({ level: LogLevel.WARN });

      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      expect(consoleSpy.debug).not.toHaveBeenCalled();
      expect(consoleSpy.info).not.toHaveBeenCalled();
      expect(consoleSpy.warn).toHaveBeenCalledWith('[ease-sdk][develop] [WARN] warn message');
      expect(consoleSpy.error).toHaveBeenCalledWith('[ease-sdk][develop] [ERROR] error message');
    });

    it('should log all messages when level is DEBUG', () => {
      logger.configure({ level: LogLevel.DEBUG });

      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      expect(consoleSpy.debug).toHaveBeenCalledWith('[ease-sdk][develop] [DEBUG] debug message');
      expect(consoleSpy.info).toHaveBeenCalledWith('[ease-sdk][develop] [INFO] info message');
      expect(consoleSpy.warn).toHaveBeenCalledWith('[ease-sdk][develop] [WARN] warn message');
      expect(consoleSpy.error).toHaveBeenCalledWith('[ease-sdk][develop] [ERROR] error message');
    });

    it('should not log any messages when level is SILENT', () => {
      logger.configure({ level: LogLevel.SILENT });

      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      expect(consoleSpy.debug).not.toHaveBeenCalled();
      expect(consoleSpy.info).not.toHaveBeenCalled();
      expect(consoleSpy.warn).not.toHaveBeenCalled();
      expect(consoleSpy.error).not.toHaveBeenCalled();
    });
  });

  describe('Message formatting', () => {
    beforeEach(() => {
      logger.configure({ level: LogLevel.DEBUG });
    });

    it('should include prefix and level in messages', () => {
      logger.info('test message');

      expect(consoleSpy.info).toHaveBeenCalledWith('[ease-sdk][develop] [INFO] test message');
    });

    it('should support custom prefix', () => {
      logger.configure({ prefix: '[custom]' });
      logger.info('test message');

      expect(consoleSpy.info).toHaveBeenCalledWith('[custom][develop] [INFO] test message');
    });

    it('should pass through additional arguments', () => {
      const obj = { test: 'data' };
      logger.error('error message', obj, 'additional arg');

      expect(consoleSpy.error).toHaveBeenCalledWith('[ease-sdk][develop] [ERROR] error message', obj, 'additional arg');
    });
  });

  describe('Configuration', () => {
    it('should update configuration partially', () => {
      logger.configure({ level: LogLevel.ERROR });

      logger.warn('should not log');
      logger.error('should log');

      expect(consoleSpy.warn).not.toHaveBeenCalled();
      expect(consoleSpy.error).toHaveBeenCalledWith('[ease-sdk][develop] [ERROR] should log');
    });

    it('should preserve existing config when partially updating', () => {
      logger.configure({ prefix: '[custom]' });
      logger.configure({ level: LogLevel.DEBUG });

      logger.debug('test message');

      expect(consoleSpy.debug).toHaveBeenCalledWith('[custom][develop] [DEBUG] test message');
    });
  });

  describe('Default behavior', () => {
    it('should have WARN level as default', () => {
      // Logger is already configured with default in beforeEach
      logger.debug('should not log');
      logger.warn('should log');

      expect(consoleSpy.debug).not.toHaveBeenCalled();
      expect(consoleSpy.warn).toHaveBeenCalled();
    });

    it('should have [ease-sdk] as default prefix', () => {
      logger.warn('test message');

      expect(consoleSpy.warn).toHaveBeenCalledWith('[ease-sdk][develop] [WARN] test message');
    });
  });

  describe('Edge cases', () => {
    beforeEach(() => {
      logger.configure({ level: LogLevel.DEBUG });
    });

    it('should handle empty message', () => {
      logger.info('');

      expect(consoleSpy.info).toHaveBeenCalledWith('[ease-sdk][develop] [INFO] ');
    });

    it('should handle no additional arguments', () => {
      logger.info('message');

      expect(consoleSpy.info).toHaveBeenCalledWith('[ease-sdk][develop] [INFO] message');
    });

    it('should handle complex objects', () => {
      const complexObj = {
        nested: { data: 'test' },
        array: [1, 2, 3],
        func: () => 'test',
      };

      logger.debug('complex', complexObj);

      expect(consoleSpy.debug).toHaveBeenCalledWith('[ease-sdk][develop] [DEBUG] complex', complexObj);
    });
  });

  describe('Environment logging', () => {
    beforeEach(() => {
      // Reset logger to default state, which has environment 'develop'
      logger.configure({ level: LogLevel.DEBUG, prefix: '[ease-sdk]' });
      setEnvironment('develop');
    });

    it('should include environment in logs when configured', () => {
      setEnvironment('staging');
      logger.info('message with staging env');
      expect(consoleSpy.info).toHaveBeenCalledWith('[ease-sdk][staging] [INFO] message with staging env');
    });

    it('should update environment in logs after subsequent configuration', () => {
      setEnvironment('production');
      logger.debug('message with production env');
      expect(consoleSpy.debug).toHaveBeenCalledWith('[ease-sdk][production] [DEBUG] message with production env');

      setEnvironment('develop');
      logger.warn('message with develop env');
      expect(consoleSpy.warn).toHaveBeenCalledWith('[ease-sdk][develop] [WARN] message with develop env');
    });

    it('should use default environment if not explicitly configured', () => {
      // beforeEach sets environment to 'develop'
      logger.info('message with default env');
      expect(consoleSpy.info).toHaveBeenCalledWith('[ease-sdk][develop] [INFO] message with default env');
    });

    it('should combine custom prefix and environment', () => {
      logger.configure({ prefix: '[MySDK]' });
      setEnvironment('production');
      logger.error('error in testing env');
      expect(consoleSpy.error).toHaveBeenCalledWith('[MySDK][production] [ERROR] error in testing env');
    });
  });
});
