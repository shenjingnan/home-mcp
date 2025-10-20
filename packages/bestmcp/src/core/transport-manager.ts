import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import {
  type BaseTransport,
  type HTTPTransportConfig,
  type TransportConfig,
  TransportType,
} from "./transports/base.js";
import { HTTPTransport } from "./transports/http.js";
import { StdioTransport } from "./transports/stdio.js";

/**
 * 传输层管理器
 * 负责传输层的注册、创建、管理和生命周期控制
 */
export class TransportManager {
  private transports = new Map<TransportType, () => BaseTransport>();
  private currentTransport: BaseTransport | null = null;
  private currentMCPTransport: Transport | null = null;

  constructor() {
    // 注册内置传输层
    this.registerBuiltinTransports();
  }

  /**
   * 注册内置传输层
   */
  private registerBuiltinTransports(): void {
    // 注册 stdio 传输层工厂函数
    this.transports.set(TransportType.STDIO, () => new StdioTransport());

    // 注册 http 传输层工厂函数
    this.transports.set(TransportType.HTTP, () => {
      return new HTTPTransport({
        type: TransportType.HTTP,
        options: {},
      } as HTTPTransportConfig);
    });
  }

  /**
   * 注册自定义传输层
   * @param type 传输层类型
   * @param transportFactory 传输层工厂函数
   */
  registerTransport(type: TransportType, transportFactory: () => BaseTransport): void {
    this.transports.set(type, transportFactory);
  }

  /**
   * 创建传输层实例
   * @param config 传输层配置
   * @returns 传输层实例
   */
  async createTransport(config: TransportConfig): Promise<BaseTransport> {
    if (config.type === TransportType.HTTP) {
      // 对于 HTTP 传输层，直接使用配置创建
      return new HTTPTransport(config as HTTPTransportConfig);
    }

    const transportFactory = this.transports.get(config.type);
    if (!transportFactory) {
      throw new Error(`不支持的传输层类型: ${config.type}`);
    }

    try {
      const transport = transportFactory();
      return transport;
    } catch (error) {
      throw new Error(`创建传输层失败 [${config.type}]: ${error instanceof Error ? error.message : "未知错误"}`);
    }
  }

  /**
   * 设置当前传输层
   * @param transport 传输层实例
   */
  async setCurrentTransport(transport: BaseTransport): Promise<void> {
    this.currentTransport = transport;
    console.log(`已设置当前传输层: ${transport.type}`);
  }

  /**
   * 获取当前传输层
   * @returns 当前传输层实例
   */
  getCurrentTransport(): BaseTransport | null {
    return this.currentTransport;
  }

  /**
   * 获取当前 MCP 传输层
   * @returns 当前 MCP 传输层实例
   */
  getCurrentMCPTransport(): Transport | null {
    return this.currentMCPTransport;
  }

  /**
   * 设置当前 MCP 传输层
   * @param transport MCP 传输层实例
   */
  setCurrentMCPTransport(transport: Transport): void {
    this.currentMCPTransport = transport;
  }

  /**
   * 启动当前传输层
   * @param server MCP 服务器实例
   */
  async startCurrentTransport(server: Server): Promise<void> {
    if (!this.currentTransport) {
      throw new Error("未设置当前传输层");
    }

    try {
      // 创建 MCP 传输层实例
      const mcpTransport = await this.currentTransport.createTransport(server);
      this.currentMCPTransport = mcpTransport;

      // 启动传输层
      await this.currentTransport.start(server, mcpTransport);

      console.log(`传输层 ${this.currentTransport.type} 启动成功`);
    } catch (error) {
      this.currentMCPTransport = null;
      throw new Error(
        `启动传输层失败 [${this.currentTransport.type}]: ${error instanceof Error ? error.message : "未知错误"}`,
      );
    }
  }

  /**
   * 停止当前传输层
   */
  async stopCurrentTransport(): Promise<void> {
    if (!this.currentTransport || !this.currentMCPTransport) {
      return; // 没有运行的传输层
    }

    const transportType = this.currentTransport.type; // 保存类型信息

    try {
      await this.currentTransport.stop(this.currentMCPTransport);
      console.log(`传输层 ${transportType} 已停止`);
    } catch (error) {
      console.error(`停止传输层时出错 [${transportType}]:`, error);
    } finally {
      this.currentTransport = null;
      this.currentMCPTransport = null;
    }
  }

  /**
   * 获取所有已注册的传输层类型
   * @returns 传输层类型列表
   */
  getRegisteredTransportTypes(): TransportType[] {
    return Array.from(this.transports.keys());
  }

  /**
   * 检查传输层类型是否已注册
   * @param type 传输层类型
   * @returns 是否已注册
   */
  isTransportTypeRegistered(type: TransportType): boolean {
    return this.transports.has(type);
  }

  /**
   * 获取当前传输层状态
   * @returns 传输层状态信息
   */
  getCurrentTransportStatus(): { type: TransportType; isRunning: boolean; details?: Record<string, unknown> } | null {
    if (!this.currentTransport) {
      return null;
    }

    return this.currentTransport.getStatus();
  }

  /**
   * 重置传输层管理器
   */
  reset(): void {
    // 停止当前传输层
    if (this.currentTransport && this.currentMCPTransport) {
      void this.stopCurrentTransport();
    }

    // 清理状态
    this.currentTransport = null;
    this.currentMCPTransport = null;
  }

  /**
   * 获取传输层统计信息
   * @returns 统计信息
   */
  getStats(): {
    registeredTypes: TransportType[];
    currentType?: TransportType;
    isRunning: boolean;
  } {
    const currentTransport = this.getCurrentTransport();
    return {
      registeredTypes: this.getRegisteredTransportTypes(),
      ...(currentTransport && { currentType: currentTransport.type }),
      isRunning: !!currentTransport?.getStatus().isRunning,
    };
  }
}
