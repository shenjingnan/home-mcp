/**
 * Home-MCP Server Entry Point (stdio mode)
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ConfigManager } from '@/config';
import { Logger } from '@/utils/logger';
import { ConnectionTester } from '@/utils/connection-test';
import { HomeAssistantClient } from '@/clients/home-assistant';

async function handleGetStates(
  haClient: HomeAssistantClient,
  args: any
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    const response = await haClient.getStates();

    if (response.error) {
      throw new Error(`Home Assistant API error: ${response.error}`);
    }

    let states = response.data || [];

    // Apply filters
    if (args.entity_type) {
      states = states.filter(state =>
        state.entity_id.startsWith(`${args.entity_type}.`)
      );
    }

    if (args.area) {
      states = states.filter(state =>
        state.attributes?.['area'] === args.area
      );
    }

    // Apply limit
    const limit = args.limit || 100;
    const limitedStates = states.slice(0, limit);

    // Format response
    const formattedStates = limitedStates.map(state => ({
      entity_id: state.entity_id,
      state: state.state,
      attributes: state.attributes,
      last_changed: state.last_changed,
      friendly_name: state.attributes?.['friendly_name'],
      area: state.attributes?.['area'],
      device_class: state.attributes?.['device_class']
    }));

    const result = {
      entities: formattedStates,
      total_count: states.length,
      filtered_count: limitedStates.length,
      timestamp: new Date().toISOString()
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };

  } catch (error) {
    throw new Error(`Failed to get Home Assistant states: ${(error as Error).message}`);
  }
}

async function main(): Promise<void> {
  const logger = Logger.getInstance();

  try {
    logger.info('Starting Home-MCP Server (stdio mode)');

    // Initialize configuration
    const config = ConfigManager.getInstance();
    const serverConfig = config.getServerConfig();
    const haConfig = config.getHomeAssistantConfig();

    logger.info('Configuration loaded', {
      name: serverConfig.name,
      version: serverConfig.version,
    });

    // Validate Home Assistant configuration
    const connectionTester = new ConnectionTester();
    const configValidation = connectionTester.validateConfiguration();

    if (!configValidation.valid) {
      logger.error('Configuration validation failed', {
        errors: configValidation.errors,
      });
      process.exit(1);
    }

    logger.info('Configuration validation passed');

    // Test Home Assistant connection
    logger.info('Testing Home Assistant connection...');
    const connectionTest = await connectionTester.performFullTest();

    if (!connectionTest.success) {
      logger.warn('Home Assistant connection test failed', {
        message: connectionTest.message,
        error: connectionTest.error,
      });
      logger.warn('Server will start but Home Assistant features may not work');
    } else {
      logger.info('Home Assistant connection test successful', {
        details: connectionTest.details,
      });
    }

    // Create Home Assistant client
    const haClient = new HomeAssistantClient(haConfig);

    // Create MCP server
    const server = new Server(
      {
        name: serverConfig.name,
        version: serverConfig.version,
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Set up tool handlers
    server.setRequestHandler('tools/list', async () => {
      logger.debug('Received tools/list request');
      return {
        tools: [
          {
            name: 'get_homeassistant_states',
            description: 'Get all device states from Home Assistant',
            inputSchema: {
              type: 'object',
              properties: {
                entity_type: {
                  type: 'string',
                  description: 'Filter by entity type (e.g., light, switch, sensor)',
                  enum: ['light', 'switch', 'sensor', 'climate', 'cover', 'fan']
                },
                area: {
                  type: 'string',
                  description: 'Filter by area name'
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of entities to return',
                  minimum: 1,
                  maximum: 1000,
                  default: 100
                }
              }
            }
          }
        ]
      };
    });

    server.setRequestHandler('tools/call', async (request) => {
      const { name, arguments: args } = request.params;
      logger.debug('Received tools/call request', { name, args });

      switch (name) {
        case 'get_homeassistant_states':
          return await handleGetStates(haClient, args || {});
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });

    // Connect stdio transport
    const transport = new StdioServerTransport();
    await server.connect(transport);

    logger.info('Home-MCP Server started successfully (stdio mode)');

  } catch (error) {
    logger.error('Failed to start Home-MCP Server', {
      error: (error as Error).message,
      stack: (error as Error).stack,
    });
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  const logger = Logger.getInstance();
  logger.error('Uncaught exception', {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  const logger = Logger.getInstance();
  logger.error('Unhandled promise rejection', {
    reason: reason,
    promise: promise,
  });
  process.exit(1);
});

// Start the application
if (require.main === module) {
  main().catch((error) => {
    console.error('Failed to start application:', error);
    process.exit(1);
  });
}
