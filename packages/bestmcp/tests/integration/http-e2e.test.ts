import { beforeEach, describe, expect, it, vi } from "vitest";
import "reflect-metadata";
import { z } from "zod";
import { Param, Tool } from "../../src/core/decorators.js";
import { BestMCP } from "../../src/core/server.js";

// Mock console methods to avoid noise in tests
const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

// 示例服务类
class CalculatorService {
  @Tool("加法运算")
  add(@Param(z.number(), "第一个数字") a: number, @Param(z.number(), "第二个数字") b: number): number {
    return a + b;
  }

  @Tool("乘法运算")
  multiply(@Param(z.number(), "第一个数字") a: number, @Param(z.number(), "第二个数字") b: number): number {
    return a * b;
  }

  @Tool("幂运算")
  power(@Param(z.number(), "基数") base: number, @Param(z.number(), "指数") exponent: number): number {
    return base ** exponent;
  }
}

class TextService {
  @Tool("转换为大写")
  toUpperCase(@Param(z.string(), "输入文本") text: string): string {
    return text.toUpperCase();
  }

  @Tool("计算长度")
  length(@Param(z.string(), "输入文本") text: string): number {
    return text.length;
  }

  @Tool("反转文本")
  reverse(@Param(z.string(), "输入文本") text: string): string {
    return text.split("").reverse().join("");
  }
}

// Mock classes
class MockIncomingMessage {
  method?: string;
  url?: string;
  headers: Record<string, string> = {};
  on = vi.fn();
}

class MockServerResponse {
  headersSent = false;
  statusCode = 200;
  headers: Record<string, string> = {};
  _responseData: string[] = [];

  writeHead = vi.fn(function (this: MockServerResponse, statusCode: number, headers?: Record<string, string>) {
    this.statusCode = statusCode;
    if (headers) {
      Object.assign(this.headers, headers);
    }
  });

  end = vi.fn(function (this: MockServerResponse, data?: string) {
    if (data !== undefined) {
      this._responseData.push(data);
    }
  });
}

describe("HTTP 端到端集成测试", () => {
  let mcp: BestMCP;
  let _mockHTTPServer: any;

  beforeEach(() => {
    consoleSpy.mockClear();
    consoleErrorSpy.mockClear();

    // Mock HTTP server
    _mockHTTPServer = {
      listen: vi.fn((_port: number, _host: string, callback: () => void) => {
        callback();
      }),
      close: vi.fn(),
      address: () => ({ port: 8000, address: "127.0.0.1" }),
    };

    mcp = new BestMCP("http-e2e-test", "1.0.0");
    mcp.register(CalculatorService);
    mcp.register(TextService);
  });

  describe("HTTP 服务器启动和停止", () => {
    it("应该能够启动 HTTP 服务器", async () => {
      vi.spyOn(mcp as any, "setupToolRequestHandlers").mockImplementation(() => {});
      vi.spyOn(mcp["transportManager"], "startCurrentTransport").mockResolvedValue(undefined);

      await mcp.run({ transport: "http", port: 3000, host: "127.0.0.1" });

      expect(mcp.getTransportStats().currentType).toBe("http");
      expect(mcp.isServerRunning()).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith("MCP Server listening on http://127.0.0.1:3000/mcp");
    });

    it("应该能够停止 HTTP 服务器", async () => {
      vi.spyOn(mcp as any, "setupToolRequestHandlers").mockImplementation(() => {});
      vi.spyOn(mcp["transportManager"], "startCurrentTransport").mockResolvedValue(undefined);

      await mcp.run({ transport: "http", port: 3000 });
      expect(mcp.isServerRunning()).toBe(true);

      await mcp.stopServer();
      expect(mcp.isServerRunning()).toBe(false);
    });
  });

  describe("工具功能兼容性", () => {
    beforeEach(async () => {
      vi.spyOn(mcp as any, "setupToolRequestHandlers").mockImplementation(() => {});
      vi.spyOn(mcp["transportManager"], "startCurrentTransport").mockResolvedValue(undefined);

      await mcp.run({ transport: "http", port: 3000 });
    });

    it("应该在 HTTP 模式下正常执行工具", async () => {
      const result1 = await mcp.executeTool("add", { a: 2, b: 3 });
      expect(result1).toBe(5);

      const result2 = await mcp.executeTool("multiply", { a: 4, b: 5 });
      expect(result2).toBe(20);

      const result3 = await mcp.executeTool("toUpperCase", { text: "hello" });
      expect(result3).toBe("HELLO");

      const result4 = await mcp.executeTool("length", { text: "testing" });
      expect(result4).toBe(7);
    });

    it("应该有正确的工具列表", async () => {
      const tools = mcp.getTools();
      expect(tools).toHaveLength(6);

      const toolNames = tools.map((tool) => tool.name);
      expect(toolNames).toContain("add");
      expect(toolNames).toContain("multiply");
      expect(toolNames).toContain("power");
      expect(toolNames).toContain("toUpperCase");
      expect(toolNames).toContain("length");
      expect(toolNames).toContain("reverse");
    });
  });

  describe("错误处理", () => {
    beforeEach(async () => {
      vi.spyOn(mcp as any, "setupToolRequestHandlers").mockImplementation(() => {});
      vi.spyOn(mcp["transportManager"], "startCurrentTransport").mockResolvedValue(undefined);

      await mcp.run({ transport: "http", port: 3000 });
    });

    it("应该处理不存在的工具调用", async () => {
      await expect(mcp.executeTool("nonexistentTool", {})).rejects.toThrow("未找到工具 nonexistentTool");
    });

    it("应该处理无效参数", async () => {
      await expect(mcp.executeTool("add", { a: "not-a-number", b: 3 })).rejects.toThrow("参数无效");
    });

    it("应该处理缺失的必需参数", async () => {
      await expect(mcp.executeTool("add", { a: 5 })).rejects.toThrow("参数无效");
    });
  });

  describe("状态管理", () => {
    beforeEach(async () => {
      vi.spyOn(mcp as any, "setupToolRequestHandlers").mockImplementation(() => {});
      vi.spyOn(mcp["transportManager"], "startCurrentTransport").mockResolvedValue(undefined);
    });

    it("应该正确跟踪 HTTP 传输层状态", async () => {
      // 初始状态
      expect(mcp.isServerRunning()).toBe(false);
      expect(mcp.getTransportStatus()).toBeNull();

      // 启动 HTTP
      await mcp.run({ transport: "http", port: 3000 });
      expect(mcp.isServerRunning()).toBe(true);
      expect(mcp.getTransportStatus()?.type).toBe("http");

      // 停止
      await mcp.stopServer();
      expect(mcp.isServerRunning()).toBe(false);
    });

    it("应该提供正确的传输层统计信息", async () => {
      await mcp.run({ transport: "http", port: 3000 });

      const stats = mcp.getTransportStats();
      expect(stats.registeredTypes).toContain("stdio");
      expect(stats.registeredTypes).toContain("http");
      expect(stats.currentType).toBe("http");
      expect(stats.isRunning).toBe(true);
    });
  });

  describe("配置灵活性", () => {
    it("应该支持不同的端口配置", async () => {
      vi.spyOn(mcp as any, "setupToolRequestHandlers").mockImplementation(() => {});
      vi.spyOn(mcp["transportManager"], "startCurrentTransport").mockResolvedValue(undefined);

      await mcp.run({ transport: "http", port: 9000, host: "localhost" });

      expect(mcp.getTransportStats().currentType).toBe("http");
      expect(consoleSpy).toHaveBeenCalledWith("MCP Server listening on http://localhost:9000/mcp");
    });

    it("应该支持默认配置", async () => {
      vi.spyOn(mcp as any, "setupToolRequestHandlers").mockImplementation(() => {});
      vi.spyOn(mcp["transportManager"], "startCurrentTransport").mockResolvedValue(undefined);

      await mcp.run({ transport: "http" });

      expect(mcp.getTransportStats().currentType).toBe("http");
      expect(consoleSpy).toHaveBeenCalledWith("MCP Server listening on http://127.0.0.1:8000/mcp");
    });
  });

  describe("复杂场景集成测试", () => {
    it("应该支持传输层动态切换", async () => {
      vi.spyOn(mcp as any, "setupToolRequestHandlers").mockImplementation(() => {});
      vi.spyOn(mcp["transportManager"], "startCurrentTransport").mockResolvedValue(undefined);

      // stdio -> HTTP
      await mcp.run({ transport: "stdio" });
      expect(mcp.getTransportStats().currentType).toBe("stdio");

      await mcp.run({ transport: "http", port: 3000 });
      expect(mcp.getTransportStats().currentType).toBe("http");

      // 工具在任何传输层下都应该正常工作
      const result = await mcp.executeTool("add", { a: 10, b: 5 });
      expect(result).toBe(15);
    });

    it("应该处理复杂的数学运算", async () => {
      vi.spyOn(mcp as any, "setupToolRequestHandlers").mockImplementation(() => {});
      vi.spyOn(mcp["transportManager"], "startCurrentTransport").mockResolvedValue(undefined);

      await mcp.run({ transport: "http", port: 3000 });

      const result = await mcp.executeTool("power", { base: 2, exponent: 8 });
      expect(result).toBe(256);
    });

    it("应该处理复杂的文本操作", async () => {
      vi.spyOn(mcp as any, "setupToolRequestHandlers").mockImplementation(() => {});
      vi.spyOn(mcp["transportManager"], "startCurrentTransport").mockResolvedValue(undefined);

      await mcp.run({ transport: "http", port: 3000 });

      const result1 = await mcp.executeTool("toUpperCase", { text: "Hello World" });
      expect(result1).toBe("HELLO WORLD");

      const result2 = await mcp.executeTool("reverse", { text: "abcde" });
      expect(result2).toBe("edcba");
    });
  });
});
