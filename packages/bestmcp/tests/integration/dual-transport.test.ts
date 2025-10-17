import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "reflect-metadata";
import { z } from "zod";
import { Param, Tool } from "../../src/core/decorators.js";
import { BestMCP } from "../../src/core/server.js";
import { TransportType } from "../../src/core/transports/base.js";

// Mock console methods to avoid noise in tests
const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

// 示例服务类
class TestService {
  @Tool("加法运算")
  add(@Param(z.number(), "第一个数字") a: number, @Param(z.number(), "第二个数字") b: number): number {
    return a + b;
  }

  @Tool("字符串连接")
  concat(@Param(z.string(), "第一个字符串") a: string, @Param(z.string(), "第二个字符串") b: string): string {
    return a + b;
  }

  @Tool("状态检查")
  checkStatus(): { status: string; timestamp: number } {
    return {
      status: "ok",
      timestamp: Date.now(),
    };
  }
}

describe("双传输层集成测试", () => {
  let mcp: BestMCP;

  beforeEach(() => {
    mcp = new BestMCP("dual-transport-test", "1.0.0");
    mcp.register(TestService);
    consoleSpy.mockClear();
    consoleErrorSpy.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("传输层切换", () => {
    it("应该能够在 stdio 和 HTTP 传输层之间切换", async () => {
      // 启动 stdio 传输层
      vi.spyOn(mcp as any, "setupToolRequestHandlers").mockImplementation(() => {});
      const stdioSpy = vi.spyOn(mcp as any, "initializeTransport").mockResolvedValue(undefined);
      const transportManagerSpy = vi
        .spyOn(mcp["transportManager"], "startCurrentTransport")
        .mockResolvedValue(undefined);

      await mcp.run({ transport: "stdio" });

      expect(stdioSpy).toHaveBeenCalledWith("stdio", {});
      expect(transportManagerSpy).toHaveBeenCalled();
      expect(mcp.getTransportStats().currentType).toBe(TransportType.STDIO);

      // 重置 mock
      stdioSpy.mockClear();
      transportManagerSpy.mockClear();

      // 切换到 HTTP 传输层
      const httpSpy = vi.spyOn(mcp as any, "initializeTransport").mockResolvedValue(undefined);
      const startHTTPServerSpy = vi.spyOn(mcp as any, "startHTTPServer").mockResolvedValue(undefined);

      await mcp.run({ transport: "http", port: 3000 });

      expect(httpSpy).toHaveBeenCalledWith("http", { port: 3000 });
      expect(startHTTPServerSpy).toHaveBeenCalled();
      expect(mcp.getTransportStats().currentType).toBe(TransportType.HTTP);
    });

    it("应该支持多次切换传输层", async () => {
      vi.spyOn(mcp as any, "setupToolRequestHandlers").mockImplementation(() => {});
      vi.spyOn(mcp["transportManager"], "startCurrentTransport").mockResolvedValue(undefined);
      vi.spyOn(mcp as any, "startHTTPServer").mockResolvedValue(undefined);

      // stdio -> HTTP -> stdio
      await mcp.run({ transport: "stdio" });
      expect(mcp.getTransportStats().currentType).toBe(TransportType.STDIO);

      await mcp.run({ transport: "http", port: 8000 });
      expect(mcp.getTransportStats().currentType).toBe(TransportType.HTTP);

      await mcp.run({ transport: "stdio" });
      expect(mcp.getTransportStats().currentType).toBe(TransportType.STDIO);
    });
  });

  describe("配置驱动的传输层选择", () => {
    it("应该支持环境变量驱动的配置", async () => {
      const originalEnv = process.env;

      // 模拟环境变量
      process.env = {
        ...originalEnv,
        MCP_TRANSPORT_TYPE: "http",
        MCP_PORT: "9000",
        MCP_HOST: "localhost",
      };

      vi.spyOn(mcp as any, "setupToolRequestHandlers").mockImplementation(() => {});
      vi.spyOn(mcp["transportManager"], "startCurrentTransport").mockResolvedValue(undefined);
      vi.spyOn(mcp as any, "startHTTPServer").mockResolvedValue(undefined);

      const transportType = process.env.MCP_TRANSPORT_TYPE || "stdio";
      const port = parseInt(process.env.MCP_PORT || "8000", 10);
      const host = process.env.MCP_HOST || "127.0.0.1";

      await mcp.run({
        transport: transportType as "stdio" | "http",
        port,
        host,
      });

      expect(mcp.getTransportStats().currentType).toBe(TransportType.HTTP);

      // 恢复原始环境变量
      process.env = originalEnv;
    });

    it("应该支持配置对象构造函数", async () => {
      const configMCP = new BestMCP({
        name: "config-test-server",
        version: "2.0.0",
        capabilities: { tools: { listChanged: true } },
        instructions: "测试配置服务器",
      });

      configMCP.register(TestService);

      vi.spyOn(configMCP as any, "setupToolRequestHandlers").mockImplementation(() => {});
      vi.spyOn(configMCP["transportManager"], "startCurrentTransport").mockResolvedValue(undefined);

      await configMCP.run({ transport: "stdio" });

      expect(configMCP.getTransportStats().currentType).toBe(TransportType.STDIO);
    });
  });

  describe("工具功能兼容性", () => {
    it("应该在两种传输层下都能正常执行工具", async () => {
      vi.spyOn(mcp as any, "setupToolRequestHandlers").mockImplementation(() => {});
      vi.spyOn(mcp["transportManager"], "startCurrentTransport").mockResolvedValue(undefined);

      // stdio 模式下测试工具执行
      await mcp.run({ transport: "stdio" });

      const result1 = await mcp.executeTool("add", { a: 2, b: 3 });
      expect(result1).toBe(5);

      const result2 = await mcp.executeTool("concat", { a: "hello", b: " world" });
      expect(result2).toBe("hello world");

      const result3 = await mcp.executeTool("checkStatus", {});
      expect(result3).toHaveProperty("status", "ok");
      expect(result3).toHaveProperty("timestamp");

      // 切换到 HTTP 模式
      await mcp.run({ transport: "http", port: 3000 });

      // HTTP 模式下工具执行应该仍然正常
      const result4 = await mcp.executeTool("add", { a: 10, b: 5 });
      expect(result4).toBe(15);
    });

    it("应该在两种传输层下都有相同的工具列表", async () => {
      vi.spyOn(mcp as any, "setupToolRequestHandlers").mockImplementation(() => {});
      vi.spyOn(mcp["transportManager"], "startCurrentTransport").mockResolvedValue(undefined);

      // stdio 模式
      await mcp.run({ transport: "stdio" });
      const stdioTools = mcp.getTools();

      // HTTP 模式
      await mcp.run({ transport: "http" });
      const httpTools = mcp.getTools();

      expect(stdioTools).toEqual(httpTools);
      expect(stdioTools).toHaveLength(3);
    });
  });

  describe("错误处理兼容性", () => {
    it("应该在两种传输层下有一致的错误处理", async () => {
      vi.spyOn(mcp as any, "setupToolRequestHandlers").mockImplementation(() => {});
      vi.spyOn(mcp["transportManager"], "startCurrentTransport").mockResolvedValue(undefined);

      // stdio 模式下的错误处理
      await mcp.run({ transport: "stdio" });

      await expect(mcp.executeTool("nonexistent", {})).rejects.toThrow("未找到工具 nonexistent");
      await expect(mcp.executeTool("add", { a: 2 })).rejects.toThrow("参数无效");
      await expect(mcp.executeTool("add", { a: "not-a-number", b: 3 })).rejects.toThrow("参数无效");

      // HTTP 模式下的错误处理
      await mcp.run({ transport: "http" });

      await expect(mcp.executeTool("nonexistent", {})).rejects.toThrow("未找到工具 nonexistent");
      await expect(mcp.executeTool("add", { a: 2 })).rejects.toThrow("参数无效");
      await expect(mcp.executeTool("add", { a: "not-a-number", b: 3 })).rejects.toThrow("参数无效");
    });
  });

  describe("状态管理", () => {
    it("应该正确跟踪传输层状态", async () => {
      vi.spyOn(mcp as any, "setupToolRequestHandlers").mockImplementation(() => {});
      vi.spyOn(mcp["transportManager"], "startCurrentTransport").mockResolvedValue(undefined);
      vi.spyOn(mcp as any, "startHTTPServer").mockResolvedValue(undefined);

      // 初始状态
      expect(mcp.isServerRunning()).toBe(false);
      expect(mcp.getTransportStatus()).toBeNull();

      // 启动 stdio
      await mcp.run({ transport: "stdio" });
      expect(mcp.isServerRunning()).toBe(true);
      expect(mcp.getTransportStatus()?.type).toBe(TransportType.STDIO);

      // 停止
      await mcp.stopServer();
      expect(mcp.isServerRunning()).toBe(false);

      // 启动 HTTP
      await mcp.run({ transport: "http", port: 3000 });
      expect(mcp.isServerRunning()).toBe(true);
      expect(mcp.getTransportStatus()?.type).toBe(TransportType.HTTP);

      // 停止
      await mcp.stopServer();
      expect(mcp.isServerRunning()).toBe(false);
    });

    it("应该提供正确的传输层统计信息", async () => {
      vi.spyOn(mcp as any, "setupToolRequestHandlers").mockImplementation(() => {});
      vi.spyOn(mcp["transportManager"], "startCurrentTransport").mockResolvedValue(undefined);

      const stats = mcp.getTransportStats();
      expect(stats.registeredTypes).toContain(TransportType.STDIO);
      expect(stats.registeredTypes).toContain(TransportType.HTTP);
      expect(stats.isRunning).toBe(false);
      expect(stats.currentType).toBeUndefined();

      await mcp.run({ transport: "stdio" });
      const runningStats = mcp.getTransportStats();
      expect(runningStats.currentType).toBe(TransportType.STDIO);
      expect(runningStats.isRunning).toBe(true);
    });
  });

  describe("参数验证兼容性", () => {
    it("应该在两种传输层下有一致的参数验证", async () => {
      vi.spyOn(mcp as any, "setupToolRequestHandlers").mockImplementation(() => {});
      vi.spyOn(mcp["transportManager"], "startCurrentTransport").mockResolvedValue(undefined);

      // stdio 模式下的验证
      await mcp.run({ transport: "stdio" });

      const stdioValidation1 = mcp.validateTool("add", { a: 2, b: 3 });
      expect(stdioValidation1.isValid).toBe(true);

      const stdioValidation2 = mcp.validateTool("add", { a: "invalid" });
      expect(stdioValidation2.isValid).toBe(false);

      // HTTP 模式下的验证
      await mcp.run({ transport: "http" });

      const httpValidation1 = mcp.validateTool("add", { a: 2, b: 3 });
      expect(httpValidation1.isValid).toBe(true);

      const httpValidation2 = mcp.validateTool("add", { a: "invalid" });
      expect(httpValidation2.isValid).toBe(false);

      // 验证结果应该一致
      expect(stdioValidation1.isValid).toEqual(httpValidation1.isValid);
      expect(stdioValidation2.isValid).toEqual(httpValidation2.isValid);
    });
  });

  describe("复杂场景集成测试", () => {
    it("应该支持动态传输层配置", async () => {
      vi.spyOn(mcp as any, "setupToolRequestHandlers").mockImplementation(() => {});
      vi.spyOn(mcp["transportManager"], "startCurrentTransport").mockResolvedValue(undefined);
      vi.spyOn(mcp as any, "startHTTPServer").mockResolvedValue(undefined);

      const configurations = [
        { transport: "stdio" as const },
        { transport: "http" as const, port: 3000 },
        { transport: "http" as const, port: 8000, host: "localhost" },
        { transport: "stdio" as const },
      ];

      for (const config of configurations) {
        await mcp.run(config);

        if (config.transport === "stdio") {
          expect(mcp.getTransportStats().currentType).toBe(TransportType.STDIO);
        } else {
          expect(mcp.getTransportStats().currentType).toBe(TransportType.HTTP);
        }

        // 工具应该在任何配置下都能正常工作
        const result = await mcp.executeTool("checkStatus", {});
        expect(result).toHaveProperty("status", "ok");
      }
    });

    it("应该处理传输层切换期间的错误", async () => {
      vi.spyOn(mcp as any, "setupToolRequestHandlers").mockImplementation(() => {});

      // 模拟传输层启动失败
      const errorSpy = vi
        .spyOn(mcp["transportManager"], "startCurrentTransport")
        .mockRejectedValueOnce(new Error("传输层启动失败"));

      await expect(mcp.run({ transport: "stdio" })).rejects.toThrow("传输层启动失败");

      // 重置 mock，后续启动应该成功
      errorSpy.mockResolvedValue(undefined);

      await mcp.run({ transport: "http" });
      expect(mcp.getTransportStats().currentType).toBe(TransportType.HTTP);
    });
  });
});
