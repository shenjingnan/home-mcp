import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";

/**
 * 传输层类型枚举
 */
export enum TransportType {
  STDIO = "stdio",
  HTTP = "http",
}

/**
 * 传输层配置接口
 */
export interface TransportConfig {
  type: TransportType;
  options?: Record<string, unknown>;
}

/**
 * HTTP 传输层配置接口
 */
export interface HTTPTransportConfig extends TransportConfig {
  type: TransportType.HTTP;
  options?: {
    enableJsonResponse?: boolean;
    port?: number;
    host?: string;
    path?: string;
    [key: string]: unknown;
  };
}

/**
 * 传输层抽象基类
 * 定义了所有传输层必须实现的通用接口
 */
export abstract class BaseTransport {
  /**
   * 传输层类型
   */
  abstract readonly type: TransportType;

  /**
   * 创建 MCP 传输层实例
   * @param server MCP 服务器实例
   * @returns MCP 传输层实例
   */
  abstract createTransport(server: Server): Promise<Transport>;

  /**
   * 启动传输层
   * @param server MCP 服务器实例
   * @param transport MCP 传输层实例
   */
  abstract start(server: Server, transport: Transport): Promise<void>;

  /**
   * 停止传输层
   * @param transport MCP 传输层实例
   */
  abstract stop(transport: Transport): Promise<void>;

  /**
   * 获取传输层状态信息
   */
  abstract getStatus(): { type: TransportType; isRunning: boolean; details?: Record<string, unknown> };
}
