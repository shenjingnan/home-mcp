/**
 * MCP Server implementation for Home-MCP
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ConfigManager } from '@/config';
import { Logger } from '@/utils/logger';
import { HealthStatus } from '@/types';

export class HomeMCPServer {
  private server: Server;
  private config: ConfigManager;
  private logger: Logger;
  private startTime: Date;

  constructor() {
    this.config = ConfigManager.getInstance();
    this.logger = Logger.getInstance();
    this.startTime = new Date();

    const serverConfig = this.config.getServerConfig();

    this.server = new Server(
      {
        name: serverConfig.name,
        version: serverConfig.version,
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
      }
    );

    this.setupHandlers();
    this.logger.info('MCP Server initialized', {
      name: serverConfig.name,
      version: serverConfig.version,
    });
  }

  private setupHandlers(): void {
    // Set up tool handlers
    this.server.setRequestHandler('tools/list', async () => {
      this.logger.debug('Received tools/list request');
      return {
        tools: [
          {
            name: 'health_check',
            description: 'Check the health status of the Home-MCP server',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
        ],
      };
    });

    this.server.setRequestHandler('tools/call', async request => {
      const { name, arguments: args } = request.params;
      this.logger.debug('Received tools/call request', { name, args });

      switch (name) {
        case 'health_check':
          return await this.handleHealthCheck();
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });

    // Set up resource handlers
    this.server.setRequestHandler('resources/list', async () => {
      this.logger.debug('Received resources/list request');
      return {
        resources: [
          {
            uri: 'health://status',
            name: 'Health Status',
            description: 'Current health status of the Home-MCP server',
            mimeType: 'application/json',
          },
        ],
      };
    });

    this.server.setRequestHandler('resources/read', async request => {
      const { uri } = request.params;
      this.logger.debug('Received resources/read request', { uri });

      switch (uri) {
        case 'health://status': {
          const healthStatus = await this.getHealthStatus();
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(healthStatus, null, 2),
              },
            ],
          };
        }
        default:
          throw new Error(`Unknown resource: ${uri}`);
      }
    });

    // Set up prompt handlers
    this.server.setRequestHandler('prompts/list', async () => {
      this.logger.debug('Received prompts/list request');
      return {
        prompts: [
          {
            name: 'system_status',
            description: 'Get system status information',
            arguments: [],
          },
        ],
      };
    });

    this.server.setRequestHandler('prompts/get', async request => {
      const { name } = request.params;
      this.logger.debug('Received prompts/get request', { name });

      switch (name) {
        case 'system_status': {
          const status = await this.getHealthStatus();
          return {
            description: 'System status information',
            messages: [
              {
                role: 'user',
                content: {
                  type: 'text',
                  text: `Current system status: ${JSON.stringify(status, null, 2)}`,
                },
              },
            ],
          };
        }
        default:
          throw new Error(`Unknown prompt: ${name}`);
      }
    });
  }

  private async handleHealthCheck(): Promise<{ content: Array<{ type: string; text: string }> }> {
    const healthStatus = await this.getHealthStatus();

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(healthStatus, null, 2),
        },
      ],
    };
  }

  private async getHealthStatus(): Promise<HealthStatus> {
    const uptime = Date.now() - this.startTime.getTime();

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        homeassistant: false, // Will be updated when HA client is implemented
        cache: true,
      },
      uptime: Math.floor(uptime / 1000),
      version: this.config.getServerConfig().version,
    };
  }

  public getServer(): Server {
    return this.server;
  }

  public async shutdown(): Promise<void> {
    this.logger.info('Shutting down MCP server');
    // Cleanup logic here
  }
}
