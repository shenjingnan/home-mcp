/**
 * Home Assistant REST API Client
 */

import { HomeAssistantConfig, EntityState, ServiceCall } from '@/types';
import { Logger } from '@/utils/logger';

export interface HomeAssistantApiResponse<T = any> {
  data?: T;
  error?: string;
  status: number;
}

export class HomeAssistantClient {
  private config: HomeAssistantConfig;
  private logger: Logger;
  private baseHeaders: Record<string, string>;

  constructor(config: HomeAssistantConfig) {
    this.config = config;
    this.logger = Logger.getInstance();
    this.baseHeaders = {
      Authorization: `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Make HTTP request to Home Assistant API
   */
  private async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any
  ): Promise<HomeAssistantApiResponse<T>> {
    const url = `${this.config.baseUrl}/api${endpoint}`;
    let attempt = 0;

    while (attempt < this.config.retryAttempts) {
      try {
        this.logger.debug('Making request to Home Assistant', {
          url,
          method,
          attempt: attempt + 1,
        });

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const response = await fetch(url, {
          method,
          headers: this.baseHeaders,
          body: body ? JSON.stringify(body) : null,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        this.logger.debug('Home Assistant request successful', {
          url,
          method,
          status: response.status,
        });

        return {
          data: data as T,
          status: response.status,
        };
      } catch (_error) {
        attempt++;
        const isLastAttempt = attempt >= this.config.retryAttempts;

        this.logger.warn('Home Assistant request failed', {
          url,
          method,
          attempt,
          error: _error instanceof Error ? _error.message : String(_error),
          willRetry: !isLastAttempt,
        });

        if (isLastAttempt) {
          return {
            error: _error instanceof Error ? _error.message : String(_error),
            status: 0,
          };
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
      }
    }

    return {
      error: 'Max retry attempts exceeded',
      status: 0,
    };
  }

  /**
   * Test connection to Home Assistant
   */
  public async testConnection(): Promise<boolean> {
    try {
      const response = await this.makeRequest('/');
      return response.status === 200 && !response.error;
    } catch (error) {
      this.logger.error('Connection test failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Get Home Assistant configuration
   */
  public async getConfig(): Promise<HomeAssistantApiResponse<any>> {
    return this.makeRequest('/config');
  }

  /**
   * Get all entity states
   */
  public async getStates(): Promise<HomeAssistantApiResponse<EntityState[]>> {
    return this.makeRequest<EntityState[]>('/states');
  }

  /**
   * Get specific entity state
   */
  public async getEntityState(entityId: string): Promise<HomeAssistantApiResponse<EntityState>> {
    return this.makeRequest<EntityState>(`/states/${entityId}`);
  }

  /**
   * Call a service
   */
  public async callService(
    domain: string,
    service: string,
    serviceData?: any,
    target?: ServiceCall['target']
  ): Promise<HomeAssistantApiResponse<any>> {
    const body: any = {};

    if (serviceData) {
      body.service_data = serviceData;
    }

    if (target) {
      body.target = target;
    }

    return this.makeRequest(`/services/${domain}/${service}`, 'POST', body);
  }

  /**
   * Get available services
   */
  public async getServices(): Promise<HomeAssistantApiResponse<any>> {
    return this.makeRequest('/services');
  }

  /**
   * Get events
   */
  public async getEvents(): Promise<HomeAssistantApiResponse<any>> {
    return this.makeRequest('/events');
  }

  /**
   * Get error log
   */
  public async getErrorLog(): Promise<HomeAssistantApiResponse<string>> {
    return this.makeRequest<string>('/error_log');
  }

  /**
   * Check if Home Assistant is running
   */
  public async isRunning(): Promise<boolean> {
    try {
      const response = await this.makeRequest('/');
      return response.status === 200 && (response.data as any)?.message === 'API running.';
    } catch (_error) {
      return false;
    }
  }

  /**
   * Get Home Assistant version info
   */
  public async getVersion(): Promise<HomeAssistantApiResponse<any>> {
    const configResponse = await this.getConfig();
    if (configResponse.data) {
      return {
        data: {
          version: configResponse.data.version,
          installation_type: configResponse.data.installation_type,
          config_dir: configResponse.data.config_dir,
        },
        status: configResponse.status,
      };
    }
    return configResponse;
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<HomeAssistantConfig>): void {
    this.config = { ...this.config, ...newConfig };

    if (newConfig.accessToken) {
      this.baseHeaders['Authorization'] = `Bearer ${newConfig.accessToken}`;
    }

    this.logger.info('Home Assistant client configuration updated');
  }
}
