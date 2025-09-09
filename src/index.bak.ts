/**
 * Home-MCP Server Entry Point
 */

import { HTTPServer } from '@/server/http-server';
import { ConfigManager } from '@/config';
import { Logger } from '@/utils/logger';
import { ConnectionTester } from '@/utils/connection-test';

async function main(): Promise<void> {
  const logger = Logger.getInstance();
  
  try {
    logger.info('Starting Home-MCP Server');

    // Initialize configuration
    const config = ConfigManager.getInstance();
    const serverConfig = config.getServerConfig();
    
    logger.info('Configuration loaded', {
      name: serverConfig.name,
      version: serverConfig.version,
      port: serverConfig.port,
      host: serverConfig.host,
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

    // Start HTTP server
    const httpServer = new HTTPServer();
    await httpServer.start();

    logger.info('Home-MCP Server started successfully');

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
