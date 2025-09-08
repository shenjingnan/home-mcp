/**
 * Connection test utilities for Home Assistant
 */

import { HomeAssistantClient } from '@/clients/home-assistant';
import { ConfigManager } from '@/config';
import { Logger } from '@/utils/logger';

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  details?: {
    version?: string;
    installationType?: string;
    configDir?: string;
    entityCount?: number;
    serviceCount?: number;
  };
  error?: string;
  timestamp: string;
}

export class ConnectionTester {
  private client: HomeAssistantClient;
  private logger: Logger;

  constructor() {
    const config = ConfigManager.getInstance().getHomeAssistantConfig();
    this.client = new HomeAssistantClient(config);
    this.logger = Logger.getInstance();
  }

  /**
   * Perform comprehensive connection test
   */
  public async performFullTest(): Promise<ConnectionTestResult> {
    const timestamp = new Date().toISOString();

    try {
      this.logger.info('Starting Home Assistant connection test');

      // Test 1: Basic connectivity
      const isConnected = await this.client.testConnection();
      if (!isConnected) {
        return {
          success: false,
          message: 'Failed to connect to Home Assistant',
          error: 'Connection test failed',
          timestamp,
        };
      }

      // Test 2: Check if API is running
      const isRunning = await this.client.isRunning();
      if (!isRunning) {
        return {
          success: false,
          message: 'Home Assistant API is not running',
          error: 'API not running',
          timestamp,
        };
      }

      // Test 3: Get version information
      const versionResponse = await this.client.getVersion();
      if (versionResponse.error) {
        return {
          success: false,
          message: 'Failed to get Home Assistant version',
          error: versionResponse.error,
          timestamp,
        };
      }

      // Test 4: Get states (to test authentication)
      const statesResponse = await this.client.getStates();
      if (statesResponse.error) {
        return {
          success: false,
          message: 'Failed to get entity states - check authentication',
          error: statesResponse.error,
          timestamp,
        };
      }

      // Test 5: Get services
      const servicesResponse = await this.client.getServices();
      if (servicesResponse.error) {
        this.logger.warn('Failed to get services, but connection is working', {
          error: servicesResponse.error,
        });
      }

      // Compile success details
      const details = {
        version: versionResponse.data?.version,
        installationType: versionResponse.data?.installation_type,
        configDir: versionResponse.data?.config_dir,
        entityCount: statesResponse.data?.length || 0,
        serviceCount: servicesResponse.data ? Object.keys(servicesResponse.data).length : 0,
      };

      this.logger.info('Home Assistant connection test successful', details);

      return {
        success: true,
        message: 'Successfully connected to Home Assistant',
        details,
        timestamp,
      };
    } catch (error) {
      this.logger.error('Connection test failed with exception', {
        error: (error as Error).message,
        stack: (error as Error).stack,
      });

      return {
        success: false,
        message: 'Connection test failed with exception',
        error: (error as Error).message,
        timestamp,
      };
    }
  }

  /**
   * Quick connection test
   */
  public async performQuickTest(): Promise<boolean> {
    try {
      return await this.client.testConnection();
    } catch (error) {
      this.logger.error('Quick connection test failed', { error: (error as Error).message });
      return false;
    }
  }

  /**
   * Test specific entity access
   */
  public async testEntityAccess(entityId: string): Promise<ConnectionTestResult> {
    const timestamp = new Date().toISOString();

    try {
      const response = await this.client.getEntityState(entityId);

      if (response.error) {
        return {
          success: false,
          message: `Failed to access entity: ${entityId}`,
          error: response.error,
          timestamp,
        };
      }

      return {
        success: true,
        message: `Successfully accessed entity: ${entityId}`,
        details: {
          entityCount: 1,
        },
        timestamp,
      };
    } catch (error) {
      return {
        success: false,
        message: `Exception while testing entity access: ${entityId}`,
        error: (error as Error).message,
        timestamp,
      };
    }
  }

  /**
   * Test service call capability
   */
  public async testServiceCall(domain: string, service: string): Promise<ConnectionTestResult> {
    const timestamp = new Date().toISOString();

    try {
      // First check if the service exists
      const servicesResponse = await this.client.getServices();

      if (servicesResponse.error) {
        return {
          success: false,
          message: 'Failed to get services list',
          error: servicesResponse.error,
          timestamp,
        };
      }

      const domainServices = servicesResponse.data?.[domain];
      if (!domainServices || !domainServices[service]) {
        return {
          success: false,
          message: `Service ${domain}.${service} not found`,
          error: 'Service not available',
          timestamp,
        };
      }

      return {
        success: true,
        message: `Service ${domain}.${service} is available`,
        timestamp,
      };
    } catch (error) {
      return {
        success: false,
        message: `Exception while testing service: ${domain}.${service}`,
        error: (error as Error).message,
        timestamp,
      };
    }
  }

  /**
   * Validate configuration
   */
  public validateConfiguration(): { valid: boolean; errors: string[] } {
    const config = ConfigManager.getInstance().getHomeAssistantConfig();
    const errors: string[] = [];

    if (!config.baseUrl) {
      errors.push('Home Assistant base URL is required');
    } else {
      try {
        new URL(config.baseUrl);
      } catch {
        errors.push('Home Assistant base URL is not a valid URL');
      }
    }

    if (!config.accessToken) {
      errors.push('Home Assistant access token is required');
    } else if (config.accessToken.length < 10) {
      errors.push('Home Assistant access token appears to be too short');
    }

    if (config.timeout < 1000) {
      errors.push('Timeout should be at least 1000ms');
    }

    if (config.retryAttempts < 1) {
      errors.push('Retry attempts should be at least 1');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
