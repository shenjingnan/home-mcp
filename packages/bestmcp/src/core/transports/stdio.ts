import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { BaseTransport, type TransportConfig, TransportType } from "./base.js";

/**
 * Stdio 传输层配置
 */
export interface StdioTransportConfig extends TransportConfig {
  type: TransportType.STDIO;
  options?: Record<string, unknown>;
}

/**
 * Stdio 传输层实现
 * 封装了 MCP SDK 的 StdioServerTransport
 */
export class StdioTransport extends BaseTransport {
  readonly type = TransportType.STDIO;
  private isRunning = false;

  /**
   * 创建 stdio 传输层实例
   * @param server MCP 服务器实例
   * @returns StdioServerTransport 实例
   */
  async createTransport(_server: Server): Promise<StdioServerTransport> {
    return new StdioServerTransport();
  }

  /**
   * 启动 stdio 传输层
   * @param server MCP 服务器实例
   * @param transport stdio 传输层实例
   */
  async start(server: Server, transport: Transport): Promise<void> {
    try {
      await server.connect(transport);
      this.isRunning = true;
      console.log("Stdio 传输层已启动");
    } catch (error) {
      this.isRunning = false;
      throw new Error(`启动 stdio 传输层失败: ${error instanceof Error ? error.message : "未知错误"}`);
    }
  }

  /**
   * 停止 stdio 传输层
   * @param transport stdio 传输层实例
   */
  async stop(_transport: Transport): Promise<void> {
    try {
      // MCP SDK 会自动处理 stdio 连接的清理
      this.isRunning = false;
      console.log("Stdio 传输层已停止");
    } catch (error) {
      console.error(`停止 stdio 传输层时出错: ${error instanceof Error ? error.message : "未知错误"}`);
    }
  }

  /**
   * 获取 stdio 传输层状态
   * @returns 传输层状态信息
   */
  getStatus(): { type: TransportType; isRunning: boolean; details?: Record<string, unknown> } {
    return {
      type: this.type,
      isRunning: this.isRunning,
      details: {
        transportType: "stdio",
        description: "标准输入输出传输层",
      },
    };
  }
}
