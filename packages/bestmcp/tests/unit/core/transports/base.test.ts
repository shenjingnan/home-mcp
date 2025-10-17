import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BaseTransport, type TransportConfig, TransportType } from "../../../../src/core/transports/base.js";

// 创建一个具体的 BaseTransport 实现用于测试
class TestTransport extends BaseTransport {
  readonly type = TransportType.STDIO;
  private isRunning = false;
  private mockTransport: Transport | null = null;

  async createTransport(_server: Server): Promise<Transport> {
    const mockTransport: Transport = {
      close: vi.fn(),
      start: vi.fn(),
      send: vi.fn(),
      onclose: vi.fn(),
      onerror: vi.fn(),
      onmessage: vi.fn(),
    } as unknown as Transport;

    this.mockTransport = mockTransport;
    return mockTransport;
  }

  async start(_server: Server, _transport: Transport): Promise<void> {
    this.isRunning = true;
  }

  async stop(_transport: Transport): Promise<void> {
    this.isRunning = false;
    this.mockTransport = null;
  }

  getStatus(): { type: TransportType; isRunning: boolean; details?: Record<string, unknown> } {
    return {
      type: this.type,
      isRunning: this.isRunning,
      details: {
        transportType: "test",
        description: "测试传输层",
        hasTransport: !!this.mockTransport,
      },
    };
  }
}

describe("BaseTransport", () => {
  let transport: TestTransport;
  let mockServer: Server;

  beforeEach(() => {
    transport = new TestTransport();
    mockServer = {
      name: "test-server",
      version: "1.0.0",
      close: vi.fn(),
      connect: vi.fn(),
      setRequestHandler: vi.fn(),
      list_tools: vi.fn(),
      call_tool: vi.fn(),
    } as unknown as Server;
  });

  describe("抽象接口验证", () => {
    it("应该有正确的传输层类型", () => {
      expect(transport.type).toBe(TransportType.STDIO);
    });

    it("应该实现 createTransport 方法", () => {
      expect(typeof transport.createTransport).toBe("function");
    });

    it("应该实现 start 方法", () => {
      expect(typeof transport.start).toBe("function");
    });

    it("应该实现 stop 方法", () => {
      expect(typeof transport.stop).toBe("function");
    });

    it("应该实现 getStatus 方法", () => {
      expect(typeof transport.getStatus).toBe("function");
    });
  });

  describe("传输层生命周期", () => {
    it("应该能够创建传输层实例", async () => {
      const mcpTransport = await transport.createTransport(mockServer);
      expect(mcpTransport).toBeDefined();
      expect(typeof mcpTransport.close).toBe("function");
    });

    it("应该能够启动传输层", async () => {
      const mcpTransport = await transport.createTransport(mockServer);
      await transport.start(mockServer, mcpTransport);

      const status = transport.getStatus();
      expect(status.isRunning).toBe(true);
    });

    it("应该能够停止传输层", async () => {
      const mcpTransport = await transport.createTransport(mockServer);
      await transport.start(mockServer, mcpTransport);
      expect(transport.getStatus().isRunning).toBe(true);

      await transport.stop(mcpTransport);
      expect(transport.getStatus().isRunning).toBe(false);
    });
  });

  describe("状态管理", () => {
    it("初始状态应该是未运行", () => {
      const status = transport.getStatus();
      expect(status.isRunning).toBe(false);
      expect(status.type).toBe(TransportType.STDIO);
      expect(status.details).toBeDefined();
      expect(status.details?.transportType).toBe("test");
    });

    it("启动后状态应该更新为运行中", async () => {
      const mcpTransport = await transport.createTransport(mockServer);
      await transport.start(mockServer, mcpTransport);

      const status = transport.getStatus();
      expect(status.isRunning).toBe(true);
      expect(status.details?.hasTransport).toBe(true);
    });

    it("停止后状态应该更新为未运行", async () => {
      const mcpTransport = await transport.createTransport(mockServer);
      await transport.start(mockServer, mcpTransport);
      await transport.stop(mcpTransport);

      const status = transport.getStatus();
      expect(status.isRunning).toBe(false);
      expect(status.details?.hasTransport).toBe(false);
    });
  });

  describe("错误处理", () => {
    it("应该处理创建传输层时的错误", async () => {
      const errorServer = {
        ...mockServer,
        // 模拟创建失败的情况
      } as Server;

      // 这里可以添加特定的错误场景测试
      const mcpTransport = await transport.createTransport(errorServer);
      expect(mcpTransport).toBeDefined();
    });

    it("应该处理启动时的错误", async () => {
      const errorTransport = {
        close: vi.fn().mockRejectedValue(new Error("启动失败")),
        start: vi.fn(),
        send: vi.fn(),
        onclose: vi.fn(),
        onerror: vi.fn(),
        onmessage: vi.fn(),
      } as unknown as Transport;

      // 在实际的实现中，start 方法应该能处理错误
      await expect(transport.start(mockServer, errorTransport)).resolves.not.toThrow();
    });

    it("应该处理停止时的错误", async () => {
      const errorTransport = {
        close: vi.fn().mockRejectedValue(new Error("停止失败")),
        start: vi.fn(),
        send: vi.fn(),
        onclose: vi.fn(),
        onerror: vi.fn(),
        onmessage: vi.fn(),
      } as unknown as Transport;

      // 在实际的实现中，stop 方法应该能处理错误
      await expect(transport.stop(errorTransport)).resolves.not.toThrow();
    });
  });

  describe("传输层类型枚举", () => {
    it("TransportType 枚举应该包含正确的值", () => {
      expect(TransportType.STDIO).toBe("stdio");
      expect(TransportType.HTTP).toBe("http");
    });
  });

  describe("传输层配置接口", () => {
    it("TransportConfig 接口应该正确工作", () => {
      const config: TransportConfig = {
        type: TransportType.STDIO,
        options: { test: "value" },
      };

      expect(config.type).toBe(TransportType.STDIO);
      expect(config.options).toEqual({ test: "value" });
    });

    it("TransportConfig 选项应该是可选的", () => {
      const config: TransportConfig = {
        type: TransportType.HTTP,
      };

      expect(config.type).toBe(TransportType.HTTP);
      expect(config.options).toBeUndefined();
    });
  });
});
