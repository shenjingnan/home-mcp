/**
 * Configuration management for Home-MCP
 */

import { AppConfig } from '@/types';

export class ConfigManager {
  private static instance: ConfigManager;
  private config: AppConfig;

  private constructor() {
    this.config = this.loadConfig();
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  private loadConfig(): AppConfig {
    const config: AppConfig = {
      server: {
        name: 'home-mcp',
        version: '0.0.1',
        timeout: parseInt(process.env['SERVER_TIMEOUT'] || '30000', 10),
      },
      homeAssistant: {
        baseUrl: process.env['HOME_ASSISTANT_URL'] || 'http://localhost:8123',
        accessToken: process.env['HOME_ASSISTANT_TOKEN'] || '',
        timeout: parseInt(process.env['HOME_ASSISTANT_TIMEOUT'] || '10000', 10),
        retryAttempts: parseInt(process.env['HOME_ASSISTANT_RETRY_ATTEMPTS'] || '3', 10),
        retryDelay: parseInt(process.env['HOME_ASSISTANT_RETRY_DELAY'] || '1000', 10),
      },
      logging: {
        level: process.env['LOG_LEVEL'] || 'info',
        format: process.env['LOG_FORMAT'] || 'json',
        file: process.env['LOG_FILE'] || '/tmp/home-mcp.log',
      },
      cache: {
        enabled: process.env['CACHE_ENABLED'] !== 'false',
        ttl: parseInt(process.env['CACHE_TTL'] || '300', 10), // 5 minutes
        maxSize: parseInt(process.env['CACHE_MAX_SIZE'] || '1000', 10),
      },
    };

    this.validateConfig(config);
    return config;
  }

  private validateConfig(config: AppConfig): void {
    if (!process.env['HOME_ASSISTANT_URL']) {
      throw new Error('HOME_ASSISTANT_URL is required');
    }

    if (!process.env['HOME_ASSISTANT_TOKEN']) {
      throw new Error('HOME_ASSISTANT_TOKEN is required');
    }
  }

  public getConfig(): AppConfig {
    return { ...this.config };
  }

  public getServerConfig() {
    return { ...this.config.server };
  }

  public getHomeAssistantConfig() {
    return { ...this.config.homeAssistant };
  }

  public getCacheConfig() {
    return { ...this.config.cache };
  }

  public getLoggingConfig() {
    return { ...this.config.logging };
  }
}
