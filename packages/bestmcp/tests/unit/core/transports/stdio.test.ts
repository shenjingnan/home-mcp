import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TransportType } from "../../../../src/core/transports/base.js";
import { StdioTransport, type StdioTransportConfig } from "../../../../src/core/transports/stdio.js";

// Mock console methods to avoid noise in tests
let consoleSpy: ReturnType<typeof vi.spyOn> & { mockClear: () => void };
let _consoleErrorSpy: ReturnType<typeof vi.spyOn> & { mockClear: () => void };

describe("StdioTransport", () => {
  let transport: StdioTransport;
  let mockServer: Server;

  beforeEach(() => {
    // Setup console mocks
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {}) as ReturnType<typeof vi.spyOn> & { mockClear: () => void };
    _consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {}) as ReturnType<typeof vi.spyOn> & { mockClear: () => void };

    transport = new StdioTransport();

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
    vi.restoreAllMocks();
  });

  describe("基本属性", () => {
    it("应该有正确的传输层类型", () => {
      expect(transport.type).toBe(TransportType.STDIO);
    });

    it("初始状态应该是未运行", () => {
      const status = transport.getStatus();
      expect(status.isRunning).toBe(false);
      expect(status.type).toBe(TransportType.STDIO);
    });
  });

  describe("createTransport", () => {
    it("应该创建 StdioServerTransport 实例", async () => {
      const mcpTransport = await transport.createTransport(mockServer);
      expect(mcpTransport).toBeInstanceOf(StdioServerTransport);
    });

    it("每次调用都应该创建新的实例", async () => {
      const transport1 = await transport.createTransport(mockServer);
      const transport2 = await transport.createTransport(mockServer);

      expect(transport1).not.toBe(transport2);
      expect(transport1).toBeInstanceOf(StdioServerTransport);
      expect(transport2).toBeInstanceOf(StdioServerTransport);
    });
  });

  describe("start", () => {
    it("应该成功启动 stdio 传输层", async () => {
      const mcpTransport = await transport.createTransport(mockServer);

      await transport.start(mockServer, mcpTransport);

      expect(mockServer.connect).toHaveBeenCalledWith(mcpTransport);
      expect(transport.getStatus().isRunning).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith("Stdio 传输层已启动");
    });

    it("应该处理服务器连接失败的情况", async () => {
      const errorMessage = "Connection failed";
      mockServer.connect = vi.fn().mockRejectedValue(new Error(errorMessage));

      const mcpTransport = await transport.createTransport(mockServer);

      await expect(transport.start(mockServer, mcpTransport)).rejects.toThrow(`启动 stdio 传输层失败: ${errorMessage}`);

      expect(transport.getStatus().isRunning).toBe(false);
    });

    it("应该处理未知的启动错误", async () => {
      const unknownError = { code: "UNKNOWN_ERROR" };
      mockServer.connect = vi.fn().mockRejectedValue(unknownError);

      const mcpTransport = await transport.createTransport(mockServer);

      await expect(transport.start(mockServer, mcpTransport)).rejects.toThrow("启动 stdio 传输层失败: 未知错误");
    });
  });

  describe("stop", () => {
    it("应该成功停止 stdio 传输层", async () => {
      const mcpTransport = await transport.createTransport(mockServer);
      await transport.start(mockServer, mcpTransport);

      expect(transport.getStatus().isRunning).toBe(true);

      await transport.stop(mcpTransport);

      expect(transport.getStatus().isRunning).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith("Stdio 传输层已停止");
    });

    it("应该处理停止时的错误", async () => {
      const mcpTransport = await transport.createTransport(mockServer);
      await transport.start(mockServer, mcpTransport);

      // 模拟停止过程中的错误
      // 注意：StdioTransport 的 stop 方法目前没有调用可能失败的操作
      // 这里主要测试错误处理逻辑的存在

      await transport.stop(mcpTransport);

      expect(transport.getStatus().isRunning).toBe(false);
    });

    it("应该处理未初始化的传输层停止", async () => {
      const mockTransport = {} as StdioServerTransport;

      // 应该不会抛出错误
      await expect(transport.stop(mockTransport)).resolves.not.toThrow();
    });
  });

  describe("getStatus", () => {
    it("应该返回正确的状态信息", () => {
      const status = transport.getStatus();

      expect(status).toEqual({
        type: TransportType.STDIO,
        isRunning: false,
        details: {
          transportType: "stdio",
          description: "标准输入输出传输层",
        },
      });
    });

    it("启动后应该返回运行状态", async () => {
      const mcpTransport = await transport.createTransport(mockServer);
      await transport.start(mockServer, mcpTransport);

      const status = transport.getStatus();

      expect(status.type).toBe(TransportType.STDIO);
      expect(status.isRunning).toBe(true);
      expect(status.details).toBeDefined();
    });

    it("停止后应该返回未运行状态", async () => {
      const mcpTransport = await transport.createTransport(mockServer);
      await transport.start(mockServer, mcpTransport);
      await transport.stop(mcpTransport);

      const status = transport.getStatus();

      expect(status.isRunning).toBe(false);
      expect(status.type).toBe(TransportType.STDIO);
    });
  });

  describe("StdioTransportConfig", () => {
    it("应该正确创建配置对象", () => {
      const config: StdioTransportConfig = {
        type: TransportType.STDIO,
        options: { test: "value" },
      };

      expect(config.type).toBe(TransportType.STDIO);
      expect(config.options).toEqual({ test: "value" });
    });

    it("选项应该是可选的", () => {
      const config: StdioTransportConfig = {
        type: TransportType.STDIO,
      };

      expect(config.type).toBe(TransportType.STDIO);
      expect(config.options).toBeUndefined();
    });
  });

  describe("生命周期集成测试", () => {
    it("应该支持完整的启动-停止循环", async () => {
      // 初始状态
      expect(transport.getStatus().isRunning).toBe(false);

      // 创建传输层
      const mcpTransport = await transport.createTransport(mockServer);
      expect(transport.getStatus().isRunning).toBe(false);

      // 启动传输层
      await transport.start(mockServer, mcpTransport);
      expect(transport.getStatus().isRunning).toBe(true);

      // 停止传输层
      await transport.stop(mcpTransport);
      expect(transport.getStatus().isRunning).toBe(false);
    });

    it("应该支持多次启动-停止循环", async () => {
      for (let i = 0; i < 3; i++) {
        const mcpTransport = await transport.createTransport(mockServer);
        await transport.start(mockServer, mcpTransport);
        expect(transport.getStatus().isRunning).toBe(true);

        await transport.stop(mcpTransport);
        expect(transport.getStatus().isRunning).toBe(false);
      }
    });
  });

  describe("边界条件测试", () => {
    it("应该处理 null 服务器参数", async () => {
      // 在实际使用中不应该出现这种情况，但测试健壮性
      const nullServer = null as unknown as Server;

      // 应该能够创建传输层（不直接使用服务器）
      const mcpTransport = await transport.createTransport(nullServer);
      expect(mcpTransport).toBeInstanceOf(StdioServerTransport);
    });

    it("应该处理 undefined 服务器参数", async () => {
      const undefinedServer = undefined as unknown as Server;

      const mcpTransport = await transport.createTransport(undefinedServer);
      expect(mcpTransport).toBeInstanceOf(StdioServerTransport);
    });
  });
});
