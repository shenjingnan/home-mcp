/**
 * Tests for Logger
 */

import { Logger } from './logger';
import { ConfigManager } from '@/config';

describe('Logger', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let consoleSpy: {
    log: jest.SpyInstance;
    warn: jest.SpyInstance;
    error: jest.SpyInstance;
  };

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };

    // Clear singleton instance
    (Logger as any).instance = undefined;

    // Mock console methods
    consoleSpy = {
      log: jest.spyOn(console, 'log').mockImplementation(),
      warn: jest.spyOn(console, 'warn').mockImplementation(),
      error: jest.spyOn(console, 'error').mockImplementation(),
    };

    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;

    // Restore console methods
    consoleSpy.log.mockRestore();
    consoleSpy.warn.mockRestore();
    consoleSpy.error.mockRestore();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = Logger.getInstance();
      const instance2 = Logger.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('log levels', () => {
    it('should log error messages', () => {
      process.env['LOG_LEVEL'] = 'error';

      const logger = Logger.getInstance();
      logger.error('Test error message');

      expect(consoleSpy.error).toHaveBeenCalledWith(expect.stringContaining('Test error message'));
    });

    it('should log warn messages when level is warn or higher', () => {
      process.env['LOG_LEVEL'] = 'warn';

      const logger = Logger.getInstance();
      logger.warn('Test warn message');
      logger.error('Test error message');

      expect(consoleSpy.warn).toHaveBeenCalledWith(expect.stringContaining('Test warn message'));
      expect(consoleSpy.error).toHaveBeenCalledWith(expect.stringContaining('Test error message'));
    });

    it('should log info messages when level is info or higher', () => {
      process.env['LOG_LEVEL'] = 'info';

      const logger = Logger.getInstance();
      logger.info('Test info message');
      logger.warn('Test warn message');
      logger.error('Test error message');

      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('Test info message'));
      expect(consoleSpy.warn).toHaveBeenCalledWith(expect.stringContaining('Test warn message'));
      expect(consoleSpy.error).toHaveBeenCalledWith(expect.stringContaining('Test error message'));
    });

    it('should log debug messages when level is debug', () => {
      process.env['LOG_LEVEL'] = 'debug';
      // Clear singletons to pick up new environment
      (Logger as any).instance = undefined;
      (ConfigManager as any).instance = undefined;

      const logger = Logger.getInstance();
      logger.debug('Test debug message');
      logger.info('Test info message');

      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('Test debug message'));
      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('Test info message'));
    });

    it('should not log messages below the configured level', () => {
      process.env['LOG_LEVEL'] = 'error';
      // Clear singletons to pick up new environment
      (Logger as any).instance = undefined;
      (ConfigManager as any).instance = undefined;

      const logger = Logger.getInstance();
      logger.debug('Test debug message');
      logger.info('Test info message');
      logger.warn('Test warn message');

      expect(consoleSpy.log).not.toHaveBeenCalled();
      expect(consoleSpy.warn).not.toHaveBeenCalled();
    });
  });

  describe('log formats', () => {
    it('should format messages as JSON when format is json', () => {
      process.env['LOG_FORMAT'] = 'json';
      process.env['LOG_LEVEL'] = 'info';
      // Clear singletons to pick up new environment
      (Logger as any).instance = undefined;
      (ConfigManager as any).instance = undefined;

      const logger = Logger.getInstance();
      logger.info('Test message', { key: 'value' });

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringMatching(/^\{.*"message":"Test message".*"key":"value".*\}$/)
      );
    });

    it('should format messages as text when format is text', () => {
      process.env['LOG_FORMAT'] = 'text';
      process.env['LOG_LEVEL'] = 'info';
      // Clear singletons to pick up new environment
      (Logger as any).instance = undefined;
      (ConfigManager as any).instance = undefined;

      const logger = Logger.getInstance();
      logger.info('Test message', { key: 'value' });

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringMatching(/^\[.*\] INFO: Test message.*\{"key":"value"\}$/)
      );
    });
  });

  describe('metadata handling', () => {
    it('should include metadata in log messages', () => {
      process.env['LOG_LEVEL'] = 'info';

      const logger = Logger.getInstance();
      const metadata = { userId: '123', action: 'test' };
      logger.info('Test message', metadata);

      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('userId'));
      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('action'));
    });

    it('should handle undefined metadata', () => {
      process.env['LOG_LEVEL'] = 'info';

      const logger = Logger.getInstance();
      logger.info('Test message');

      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('Test message'));
    });
  });
});
