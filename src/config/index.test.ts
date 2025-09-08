/**
 * Tests for ConfigManager
 */

import { ConfigManager } from './index';

describe('ConfigManager', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };

    // Clear singleton instance
    (ConfigManager as any).instance = undefined;
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = ConfigManager.getInstance();
      const instance2 = ConfigManager.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('configuration loading', () => {
    it('should load default configuration', () => {
      process.env['HOME_ASSISTANT_URL'] = 'http://test:8123';
      process.env['HOME_ASSISTANT_TOKEN'] = 'test-token';

      const config = ConfigManager.getInstance();
      const appConfig = config.getConfig();

      expect(appConfig.server.name).toBe('home-mcp');
      expect(appConfig.server.version).toBe('0.0.1');
      expect(appConfig.server.port).toBe(3000);
      expect(appConfig.homeAssistant.baseUrl).toBe('http://test:8123');
      expect(appConfig.homeAssistant.accessToken).toBe('test-token');
    });

    it('should use environment variables', () => {
      process.env['PORT'] = '4000';
      process.env['HOST'] = '127.0.0.1';
      process.env['HOME_ASSISTANT_URL'] = 'http://ha:8123';
      process.env['HOME_ASSISTANT_TOKEN'] = 'secret-token';
      process.env['LOG_LEVEL'] = 'debug';

      const config = ConfigManager.getInstance();
      const appConfig = config.getConfig();

      expect(appConfig.server.port).toBe(4000);
      expect(appConfig.server.host).toBe('127.0.0.1');
      expect(appConfig.homeAssistant.baseUrl).toBe('http://ha:8123');
      expect(appConfig.homeAssistant.accessToken).toBe('secret-token');
      expect(appConfig.logging.level).toBe('debug');
    });
  });

  describe('configuration validation', () => {
    it('should throw error when HOME_ASSISTANT_URL is missing', () => {
      delete process.env['HOME_ASSISTANT_URL'];
      process.env['HOME_ASSISTANT_TOKEN'] = 'test-token';

      expect(() => {
        ConfigManager.getInstance();
      }).toThrow('HOME_ASSISTANT_URL is required');
    });

    it('should throw error when HOME_ASSISTANT_TOKEN is missing', () => {
      process.env['HOME_ASSISTANT_URL'] = 'http://test:8123';
      delete process.env['HOME_ASSISTANT_TOKEN'];

      expect(() => {
        ConfigManager.getInstance();
      }).toThrow('HOME_ASSISTANT_TOKEN is required');
    });

    it('should throw error for invalid port', () => {
      process.env['PORT'] = '70000';
      process.env['HOME_ASSISTANT_URL'] = 'http://test:8123';
      process.env['HOME_ASSISTANT_TOKEN'] = 'test-token';

      expect(() => {
        ConfigManager.getInstance();
      }).toThrow('Invalid port number');
    });
  });

  describe('getter methods', () => {
    beforeEach(() => {
      process.env['HOME_ASSISTANT_URL'] = 'http://test:8123';
      process.env['HOME_ASSISTANT_TOKEN'] = 'test-token';
    });

    it('should return server config', () => {
      const config = ConfigManager.getInstance();
      const serverConfig = config.getServerConfig();

      expect(serverConfig).toHaveProperty('name');
      expect(serverConfig).toHaveProperty('version');
      expect(serverConfig).toHaveProperty('port');
      expect(serverConfig).toHaveProperty('host');
    });

    it('should return Home Assistant config', () => {
      const config = ConfigManager.getInstance();
      const haConfig = config.getHomeAssistantConfig();

      expect(haConfig).toHaveProperty('baseUrl');
      expect(haConfig).toHaveProperty('accessToken');
      expect(haConfig).toHaveProperty('timeout');
      expect(haConfig).toHaveProperty('retryAttempts');
    });

    it('should return cache config', () => {
      const config = ConfigManager.getInstance();
      const cacheConfig = config.getCacheConfig();

      expect(cacheConfig).toHaveProperty('enabled');
      expect(cacheConfig).toHaveProperty('ttl');
      expect(cacheConfig).toHaveProperty('maxSize');
    });

    it('should return logging config', () => {
      const config = ConfigManager.getInstance();
      const loggingConfig = config.getLoggingConfig();

      expect(loggingConfig).toHaveProperty('level');
      expect(loggingConfig).toHaveProperty('format');
    });
  });
});
