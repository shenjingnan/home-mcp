/**
 * HTTP Server with Streamable HTTP Transport for Home-MCP
 */

import express, { Request, Response, Application } from 'express';
import cors from 'cors';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamable';
import { HomeMCPServer } from './mcp-server';
import { ConfigManager } from '@/config';
import { Logger } from '@/utils/logger';
import { HealthStatus } from '@/types';

export class HTTPServer {
  private app: Application;
  private mcpServer: HomeMCPServer;
  private config: ConfigManager;
  private logger: Logger;
  private transports: Map<string, StreamableHTTPServerTransport>;

  constructor() {
    this.app = express();
    this.mcpServer = new HomeMCPServer();
    this.config = ConfigManager.getInstance();
    this.logger = Logger.getInstance();
    this.transports = new Map();

    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    // CORS configuration
    this.app.use(
      cors({
        origin: true,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
      })
    );

    // JSON parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging
    this.app.use((_req: Request, _res: Response, next) => {
      this.logger.debug('HTTP Request', {
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
      });
      next();
    });
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', async (_req: Request, res: Response) => {
      try {
        const healthStatus = await this.getHealthStatus();
        res.json(healthStatus);
      } catch (error) {
        this.logger.error('Health check failed', { error: (error as Error).message });
        res.status(500).json({
          status: 'unhealthy',
          error: (error as Error).message,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // MCP endpoint with Streamable HTTP transport
    this.app.all('/mcp', async (req: Request, res: Response) => {
      try {
        this.logger.debug('MCP request received', {
          method: req.method,
          headers: req.headers,
          body: req.body,
        });

        const transport = new StreamableHTTPServerTransport(req, res);
        const transportId = this.generateTransportId();

        this.transports.set(transportId, transport);

        // Clean up transport on connection close
        res.on('close', () => {
          this.transports.delete(transportId);
          this.logger.debug('Transport connection closed', { transportId });
        });

        res.on('error', error => {
          this.transports.delete(transportId);
          this.logger.error('Transport connection error', { transportId, error: error.message });
        });

        await this.mcpServer.getServer().connect(transport);
      } catch (error) {
        this.logger.error('MCP request failed', {
          error: (error as Error).message,
          stack: (error as Error).stack,
        });

        if (!res.headersSent) {
          res.status(500).json({
            error: 'Internal server error',
            message: (error as Error).message,
            timestamp: new Date().toISOString(),
          });
        }
      }
    });

    // Root endpoint
    this.app.get('/', (_req: Request, res: Response) => {
      const serverConfig = this.config.getServerConfig();
      res.json({
        name: serverConfig.name,
        version: serverConfig.version,
        description: 'Home Assistant MCP Server',
        endpoints: {
          health: '/health',
          mcp: '/mcp',
        },
        timestamp: new Date().toISOString(),
      });
    });

    // 404 handler
    this.app.use('*', (req: Request, res: Response) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.originalUrl} not found`,
        timestamp: new Date().toISOString(),
      });
    });

    // Error handler
    this.app.use((error: Error, req: Request, res: Response, _next: unknown) => {
      this.logger.error('Unhandled error', {
        error: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
      });

      if (!res.headersSent) {
        res.status(500).json({
          error: 'Internal Server Error',
          message:
            process.env['NODE_ENV'] === 'development'
              ? (error as Error).message
              : 'Something went wrong',
          timestamp: new Date().toISOString(),
        });
      }
    });
  }

  private generateTransportId(): string {
    return `transport_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async getHealthStatus(): Promise<HealthStatus> {
    // This will be enhanced when HomeAssistant client is implemented
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        homeassistant: false, // Will be updated when HA client is implemented
        cache: true,
      },
      uptime: process.uptime(),
      version: this.config.getServerConfig().version,
    };
  }

  public async start(): Promise<void> {
    const serverConfig = this.config.getServerConfig();

    return new Promise((resolve, reject) => {
      const server = this.app.listen(serverConfig.port, serverConfig.host, () => {
        this.logger.info('HTTP Server started', {
          host: serverConfig.host,
          port: serverConfig.port,
          name: serverConfig.name,
          version: serverConfig.version,
        });
        resolve();
      });

      server.on('error', error => {
        this.logger.error('HTTP Server failed to start', { error: error.message });
        reject(error);
      });

      // Graceful shutdown
      process.on('SIGTERM', () => {
        this.logger.info('SIGTERM received, shutting down gracefully');
        server.close(() => {
          this.logger.info('HTTP Server closed');
          process.exit(0);
        });
      });

      process.on('SIGINT', () => {
        this.logger.info('SIGINT received, shutting down gracefully');
        server.close(() => {
          this.logger.info('HTTP Server closed');
          process.exit(0);
        });
      });
    });
  }

  public getApp(): Application {
    return this.app;
  }
}
