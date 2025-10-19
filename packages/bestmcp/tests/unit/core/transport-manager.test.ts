import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TransportManager } from "../../../src/core/transport-manager.js";
import { type HTTPTransportConfig, type TransportConfig, TransportType } from "../../../src/core/transports/base.js";
import { HTTPTransport } from "../../../src/core/transports/http.js";
import { StdioTransport } from "../../../src/core/transports/stdio.js";

// Mock console methods to avoid noise in tests
const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

describe("TransportManager", () => {
  let manager: TransportManager;
  let mockServer: Server;

  beforeEach(() => {
    manager = new TransportManager();
    consoleSpy.mockClear();
    consoleErrorSpy.mockClear();

    mockServer = {
      name: "test-server",
      version: "1.0.0",
      close: vi.fn(),
      connect: vi.fn().mockResolvedValue(undefined),
      setRequestHandler: vi.fn(),
      list_tools: vi.fn(),
      call_tool: vi.fn(),
    } as unknown as Server;
  });

  afterEach(() => {
    // 清理传输层管理器状态以避免跨测试影响
    if (manager.getCurrentTransport()) {
      manager.reset();
    }
    // 清理 console mock，但不恢复 spy
    consoleSpy.mockClear();
    consoleErrorSpy.mockClear();
  });

  describe("初始化", () => {
    it("应该正确初始化传输层管理器", () => {
      expect(manager).toBeDefined();
      expect(manager.getRegisteredTransportTypes()).toContain(TransportType.STDIO);
      expect(manager.getRegisteredTransportTypes()).toContain(TransportType.HTTP);
    });

    it("应该注册内置传输层", () => {
      const registeredTypes = manager.getRegisteredTransportTypes();
      expect(registeredTypes).toHaveLength(2);
      expect(registeredTypes).toContain(TransportType.STDIO);
      expect(registeredTypes).toContain(TransportType.HTTP);
    });
  });

  describe("createTransport", () => {
    describe("HTTP 传输层", () => {
      it("应该创建 HTTP 传输层", async () => {
        const config: HTTPTransportConfig = {
          type: TransportType.HTTP,
          options: {
            enableJsonResponse: true,
            port: 3000,
          },
        };

        const transport = await manager.createTransport(config);

        expect(transport).toBeInstanceOf(HTTPTransport);
        expect(transport.type).toBe(TransportType.HTTP);
      });
    });

    describe("Stdio 传输层", () => {
      it("应该创建 stdio 传输层", async () => {
        const config: TransportConfig = {
          type: TransportType.STDIO,
        };

        const transport = await manager.createTransport(config);

        expect(transport).toBeInstanceOf(StdioTransport);
        expect(transport.type).toBe(TransportType.STDIO);
      });
    });

    describe("错误处理", () => {
      it("应该为不支持的传输层类型抛出错误", async () => {
        const config = {
          type: "unsupported" as TransportType,
        };

        await expect(manager.createTransport(config)).rejects.toThrow("不支持的传输层类型: unsupported");
      });
    });
  });

  describe("setCurrentTransport 和 getCurrentTransport", () => {
    let transport: StdioTransport;

    beforeEach(() => {
      transport = new StdioTransport();
    });

    it("应该设置当前传输层", async () => {
      await manager.setCurrentTransport(transport);

      expect(manager.getCurrentTransport()).toBe(transport);
      expect(consoleSpy).toHaveBeenCalledWith("已设置当前传输层: stdio");
    });

    it("应该覆盖当前传输层", async () => {
      const transport1 = new StdioTransport();
      const transport2 = new StdioTransport();

      await manager.setCurrentTransport(transport1);
      expect(manager.getCurrentTransport()).toBe(transport1);

      await manager.setCurrentTransport(transport2);
      expect(manager.getCurrentTransport()).toBe(transport2);
    });
  });

  describe("setCurrentMCPTransport 和 getCurrentMCPTransport", () => {
    let mockMCPTransport: Transport;

    beforeEach(() => {
      mockMCPTransport = {
        close: vi.fn(),
        start: vi.fn(),
        send: vi.fn(),
        onclose: vi.fn(),
        onerror: vi.fn(),
        onmessage: vi.fn(),
      } as unknown as Transport;
    });

    it("应该设置和获取当前 MCP 传输层", () => {
      manager.setCurrentMCPTransport(mockMCPTransport);
      expect(manager.getCurrentMCPTransport()).toBe(mockMCPTransport);
    });
  });

  describe("startCurrentTransport", () => {
    let _transport: StdioTransport;

    beforeEach(() => {
      _transport = new StdioTransport();
    });

    it("应该在未设置传输层时抛出错误", async () => {
      await expect(manager.startCurrentTransport(mockServer)).rejects.toThrow("未设置当前传输层");
    });
  });

  describe("getCurrentTransportStatus", () => {
    it("应该在没有当前传输层时返回 null", () => {
      const status = manager.getCurrentTransportStatus();
      expect(status).toBeNull();
    });

    it("应该返回当前传输层状态", async () => {
      const transport = new StdioTransport();
      await manager.setCurrentTransport(transport);

      const status = manager.getCurrentTransportStatus();

      expect(status).toEqual({
        type: TransportType.STDIO,
        isRunning: false,
        details: expect.objectContaining({
          transportType: "stdio",
          description: "标准输入输出传输层",
        }),
      });
    });
  });

  describe("getStats", () => {
    it("应该返回正确的统计信息", () => {
      const stats = manager.getStats();

      expect(stats).toEqual({
        registeredTypes: [TransportType.STDIO, TransportType.HTTP],
        isRunning: false,
      });
      expect(stats.currentType).toBeUndefined();
    });

    it("应该包含当前传输层信息", async () => {
      const transport = new StdioTransport();
      await manager.setCurrentTransport(transport);

      const stats = manager.getStats();

      expect(stats.registeredTypes).toContain(TransportType.STDIO);
      expect(stats.currentType).toBe(TransportType.STDIO);
      expect(stats.isRunning).toBe(false);
    });
  });

  describe("reset", () => {
    it("应该重置传输层管理器", async () => {
      const transport = new StdioTransport();
      const mockMCPTransport = {} as Transport;

      await manager.setCurrentTransport(transport);
      manager.setCurrentMCPTransport(mockMCPTransport);

      manager.reset();

      expect(manager.getCurrentTransport()).toBeNull();
      expect(manager.getCurrentMCPTransport()).toBeNull();
    });
  });

  describe("边界条件和集成测试", () => {
    it("应该处理注册的传输层类型查询", () => {
      expect(manager.isTransportTypeRegistered(TransportType.STDIO)).toBe(true);
      expect(manager.isTransportTypeRegistered(TransportType.HTTP)).toBe(true);
      expect(manager.isTransportTypeRegistered("unsupported" as TransportType)).toBe(false);
    });
  });
});
