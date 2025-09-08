/**
 * Type definitions for Home-MCP
 */

export interface ServerConfig {
  name: string;
  version: string;
  port: number;
  host: string;
  timeout: number;
}

export interface HomeAssistantConfig {
  baseUrl: string;
  accessToken: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

export interface AppConfig {
  server: ServerConfig;
  homeAssistant: HomeAssistantConfig;
  logging: {
    level: string;
    format: string;
  };
  cache: {
    enabled: boolean;
    ttl: number;
    maxSize: number;
  };
}

export interface EntityState {
  entity_id: string;
  state: string;
  attributes: Record<string, any>;
  last_changed: string;
  last_updated: string;
  context: {
    id: string;
    parent_id?: string;
    user_id?: string;
  };
}

export interface ServiceCall {
  domain: string;
  service: string;
  service_data?: Record<string, any>;
  target?: {
    entity_id?: string | string[];
    device_id?: string | string[];
    area_id?: string | string[];
  };
}

export interface DeviceInfo {
  id: string;
  name: string;
  type: string;
  state: string;
  attributes: Record<string, any>;
  area?: string;
  platform: string;
}

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  services: {
    homeassistant: boolean;
    cache: boolean;
  };
  uptime: number;
  version: string;
}
