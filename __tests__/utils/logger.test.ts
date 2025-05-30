import { logger, LogLevel } from '../../src/utils/logger';

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
  });

  afterEach(() => {
    Object.values(consoleSpy).forEach(spy => spy.mockRestore());
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
      expect(consoleSpy.warn).toHaveBeenCalledWith('[ease-sdk] [WARN]', 'warn message');
      expect(consoleSpy.error).toHaveBeenCalledWith('[ease-sdk] [ERROR]', 'error message');
    });

    it('should log all messages when level is DEBUG', () => {
      logger.configure({ level: LogLevel.DEBUG });

      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      expect(consoleSpy.debug).toHaveBeenCalledWith('[ease-sdk] [DEBUG]', 'debug message');
      expect(consoleSpy.info).toHaveBeenCalledWith('[ease-sdk] [INFO]', 'info message');
      expect(consoleSpy.warn).toHaveBeenCalledWith('[ease-sdk] [WARN]', 'warn message');
      expect(consoleSpy.error).toHaveBeenCalledWith('[ease-sdk] [ERROR]', 'error message');
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

      expect(consoleSpy.info).toHaveBeenCalledWith('[ease-sdk] [INFO]', 'test message');
    });

    it('should support custom prefix', () => {
      logger.configure({ prefix: '[custom]' });
      logger.info('test message');

      expect(consoleSpy.info).toHaveBeenCalledWith('[custom] [INFO]', 'test message');
    });

    it('should pass through additional arguments', () => {
      const obj = { test: 'data' };
      logger.error('error message', obj, 'additional arg');

      expect(consoleSpy.error).toHaveBeenCalledWith(
        '[ease-sdk] [ERROR]',
        'error message',
        obj,
        'additional arg'
      );
    });
  });

  describe('Configuration', () => {
    it('should update configuration partially', () => {
      logger.configure({ level: LogLevel.ERROR });

      logger.warn('should not log');
      logger.error('should log');

      expect(consoleSpy.warn).not.toHaveBeenCalled();
      expect(consoleSpy.error).toHaveBeenCalledWith('[ease-sdk] [ERROR]', 'should log');
    });

    it('should preserve existing config when partially updating', () => {
      logger.configure({ prefix: '[custom]' });
      logger.configure({ level: LogLevel.DEBUG });

      logger.debug('test message');

      expect(consoleSpy.debug).toHaveBeenCalledWith('[custom] [DEBUG]', 'test message');
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

      expect(consoleSpy.warn).toHaveBeenCalledWith('[ease-sdk] [WARN]', 'test message');
    });
  });

  describe('Edge cases', () => {
    beforeEach(() => {
      logger.configure({ level: LogLevel.DEBUG });
    });

    it('should handle empty message', () => {
      logger.info('');

      expect(consoleSpy.info).toHaveBeenCalledWith('[ease-sdk] [INFO]', '');
    });

    it('should handle no additional arguments', () => {
      logger.info('message');

      expect(consoleSpy.info).toHaveBeenCalledWith('[ease-sdk] [INFO]', 'message');
    });

    it('should handle complex objects', () => {
      const complexObj = {
        nested: { data: 'test' },
        array: [1, 2, 3],
        func: () => 'test',
      };

      logger.debug('complex', complexObj);

      expect(consoleSpy.debug).toHaveBeenCalledWith('[ease-sdk] [DEBUG]', 'complex', complexObj);
    });
  });
});