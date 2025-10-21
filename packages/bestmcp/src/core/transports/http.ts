import type { Server as HttpServer, IncomingMessage, ServerResponse } from "node:http";
import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  StreamableHTTPServerTransport,
  type StreamableHTTPServerTransportOptions,
} from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { BaseTransport, type HTTPTransportConfig, TransportType } from "./base.js";

/**
 * HTTP 传输层实现
 * 基于 MCP SDK 的 StreamableHTTPServerTransport
 */
export class HTTPTransport extends BaseTransport {
  readonly type = TransportType.HTTP;
  private config: HTTPTransportConfig;
  private transport: StreamableHTTPServerTransport | null = null;
  private httpServer: HttpServer | null = null; // HTTP 服务器实例
  private isRunning = false;

  constructor(config: HTTPTransportConfig) {
    super();
    this.config = config;
  }

  /**
   * 创建 HTTP 传输层实例
   * @param server MCP 服务器实例
   * @returns StreamableHTTPServerTransport 实例
   */
  async createTransport(_server: Server): Promise<StreamableHTTPServerTransport> {
    const options = this.config.options || {};

    // 设置默认的 HTTP 传输配置
    const httpOptions: StreamableHTTPServerTransportOptions = {
      sessionIdGenerator: undefined, // 无状态模式，简化实现
      enableJsonResponse: true, // 默认启用 JSON 响应模式
      ...options,
    };

    this.transport = new StreamableHTTPServerTransport(httpOptions);
    return this.transport!;
  }

  /**
   * 启动 HTTP 传输层
   * @param server MCP 服务器实例
   * @param transport HTTP 传输层实例
   */
  async start(server: Server, transport: Transport): Promise<void> {
    try {
      await server.connect(transport);
      this.isRunning = true;
      console.log("HTTP 传输层已启动");
    } catch (error) {
      this.isRunning = false;
      throw new Error(`启动 HTTP 传输层失败: ${error instanceof Error ? error.message : "未知错误"}`);
    }
  }

  /**
   * 停止 HTTP 传输层
   * @param transport HTTP 传输层实例
   */
  async stop(_transport: Transport): Promise<void> {
    try {
      // 关闭 HTTP 传输层
      if (this.transport) {
        await this.transport.close();
        this.transport = null;
      }

      // 关闭 HTTP 服务器
      if (this.httpServer) {
        this.httpServer.close();
        this.httpServer = null;
      }

      this.isRunning = false;
      console.log("HTTP 传输层已停止");
    } catch (error) {
      console.error(`停止 HTTP 传输层时出错: ${error instanceof Error ? error.message : "未知错误"}`);
    }
  }

  /**
   * 启动 HTTP 服务器
   * @param port 服务器端口
   * @param host 服务器主机地址
   * @param path MCP 请求路径
   */
  async startHTTPServer(port: number = 8000, host: string = "127.0.0.1", path: string = "/mcp"): Promise<void> {
    if (!this.transport) {
      throw new Error("HTTP 传输层未初始化，请先调用 createTransport");
    }

    const http = await import("node:http");

    const server = http.createServer(async (req, res) => {
      // 只处理 POST 请求到指定路径
      if (req.method === "POST" && req.url === path) {
        let body = "";
        req.on("data", (chunk) => {
          body += chunk.toString();
        });

        req.on("end", async () => {
          try {
            const parsedBody = JSON.parse(body);
            await this.handleRequest(req, res, parsedBody);
          } catch (_error) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                error: "Invalid JSON",
                message: "请求体包含无效的 JSON 数据",
              }),
            );
          }
        });
      } else {
        res.writeHead(404).end();
      }
    });

    // 启动服务器
    server.listen(port, host, () => {
      console.log(`MCP HTTP 服务器监听 http://${host}:${port}${path}`);
    });

    // 保存服务器实例
    this.httpServer = server;
  }

  /**
   * 处理 HTTP 请求
   * @param req HTTP 请求对象
   * @param res HTTP 响应对象
   * @param parsedBody 解析后的请求体
   */
  async handleRequest(req: IncomingMessage, res: ServerResponse, parsedBody?: unknown): Promise<void> {
    if (!this.transport) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          error: "Transport not initialized",
          message: "HTTP 传输层未正确初始化",
        }),
      );
      return;
    }

    try {
      await this.transport.handleRequest(req, res, parsedBody);
    } catch (error) {
      console.error("处理 HTTP 请求时出错:", error);
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            error: "Internal server error",
            message: error instanceof Error ? error.message : "未知错误",
          }),
        );
      } else {
        // 如果响应头已经发送，仍然需要结束响应
        res.end();
      }
    }
  }

  /**
   * 获取 HTTP 传输层状态
   * @returns 传输层状态信息
   */
  getStatus(): { type: TransportType; isRunning: boolean; details?: Record<string, unknown> } {
    return {
      type: this.type,
      isRunning: this.isRunning,
      details: {
        transportType: "http",
        description: "HTTP 传输层",
        config: this.config.options,
        hasHTTPServer: !!this.httpServer,
        hasTransport: !!this.transport,
      },
    };
  }

  /**
   * 获取 HTTP 服务器实例
   * @returns HTTP 服务器实例
   */
  getHTTPServer(): HttpServer | null {
    return this.httpServer;
  }

  /**
   * 获取传输层实例
   * @returns StreamableHTTPServerTransport 实例
   */
  getTransport(): StreamableHTTPServerTransport | null {
    return this.transport;
  }
}
