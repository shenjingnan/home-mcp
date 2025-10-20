import type { IncomingMessage, ServerResponse } from "node:http";
import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { HTTPTransportConfig } from "../../../../src/core/transports/base.js";
import { TransportType } from "../../../../src/core/transports/base.js";
import { HTTPTransport } from "../../../../src/core/transports/http.js";

// Mock node:http module
vi.mock("node:http", () => ({
  default: {
    createServer: vi.fn(),
  },
  createServer: vi.fn(),
  IncomingMessage: class MockIncomingMessage {},
  ServerResponse: class MockServerResponse {},
}));

// Mock StreamableHTTPServerTransport
vi.mock("@modelcontextprotocol/sdk/server/streamableHttp.js", () => ({
  StreamableHTTPServerTransport: vi.fn(),
}));

// Mock 类型定义
interface MockHTTPServer {
  listen: (port: number, host: string, callback: () => void) => void;
  close: () => void;
  address: () => { port: number; address: string };
}

interface MockStreamableTransport {
  close: () => Promise<void>;
  handleRequest: (req: IncomingMessage, res: ServerResponse, body?: unknown) => Promise<void>;
}

describe("HTTPTransport", () => {
  let transport: HTTPTransport;
  let mockServer: Server;
  let mockHTTPServer: MockHTTPServer;
  let mockStreamableTransport: MockStreamableTransport;
  let config: HTTPTransportConfig;
  let consoleSpy: ReturnType<typeof vi.spyOn> & { mockClear: () => void };
  let consoleErrorSpy: ReturnType<typeof vi.spyOn> & { mockClear: () => void };

  beforeEach(async () => {
    // Setup console mocks
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {}) as ReturnType<typeof vi.spyOn> & {
      mockClear: () => void;
    };
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {}) as ReturnType<typeof vi.spyOn> & {
      mockClear: () => void;
    };

    config = {
      type: TransportType.HTTP,
      options: {
        enableJsonResponse: true,
        port: 8000,
        host: "127.0.0.1",
      },
    };

    transport = new HTTPTransport(config);

    mockServer = {
      name: "test-server",
      version: "1.0.0",
      close: vi.fn(),
      connect: vi.fn().mockResolvedValue(undefined),
      setRequestHandler: vi.fn(),
      list_tools: vi.fn(),
      call_tool: vi.fn(),
    } as unknown as Server;

    mockHTTPServer = {
      listen: vi.fn((_port: number, _host: string, callback: () => void) => {
        callback();
      }),
      close: vi.fn(),
      address: () => ({ port: 8000, address: "127.0.0.1" }),
    };

    mockStreamableTransport = {
      close: vi.fn().mockResolvedValue(undefined),
      handleRequest: vi.fn().mockResolvedValue(undefined),
    };

    // Mock StreamableHTTPServerTransport constructor
    const { StreamableHTTPServerTransport } = await import("@modelcontextprotocol/sdk/server/streamableHttp.js");
    const mockConstructor = vi.mocked(StreamableHTTPServerTransport) as vi.MockedConstructor<
      typeof StreamableHTTPServerTransport
    >;
    mockConstructor.mockImplementation(() => {
      return mockStreamableTransport as unknown;
    });

    // Mock http.createServer
    const http = await import("node:http");
    vi.mocked(http.createServer).mockReturnValue(mockHTTPServer as unknown as ReturnType<typeof http.createServer>);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("构造函数", () => {
    it("应该正确初始化 HTTP 传输层", () => {
      expect(transport.type).toBe(TransportType.HTTP);
      expect(transport.getStatus().isRunning).toBe(false);
    });

    it("应该保存配置", () => {
      const transportWithConfig = new HTTPTransport(config);
      expect(transportWithConfig.getStatus().details?.["config"]).toEqual(config.options);
    });

    it("应该处理空配置", () => {
      const emptyConfig: HTTPTransportConfig = {
        type: TransportType.HTTP,
        options: {},
      };
      const transportWithEmptyConfig = new HTTPTransport(emptyConfig);
      expect(transportWithEmptyConfig.type).toBe(TransportType.HTTP);
    });
  });

  describe("createTransport", () => {
    it("应该创建 StreamableHTTPServerTransport 实例", async () => {
      const mcpTransport = await transport.createTransport(mockServer);
      expect(mcpTransport).toBe(mockStreamableTransport);
      expect(StreamableHTTPServerTransport).toHaveBeenCalledWith({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
        port: 8000,
        host: "127.0.0.1",
      });
    });

    it("应该使用默认配置", async () => {
      const defaultConfig: HTTPTransportConfig = {
        type: TransportType.HTTP,
      };
      const defaultTransport = new HTTPTransport(defaultConfig);

      await defaultTransport.createTransport(mockServer);

      expect(StreamableHTTPServerTransport).toHaveBeenCalledWith({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
      });
    });

    it("应该合并自定义配置", async () => {
      const customConfig: HTTPTransportConfig = {
        type: TransportType.HTTP,
        options: {
          enableJsonResponse: false,
          customOption: "test-value",
        },
      };
      const customTransport = new HTTPTransport(customConfig);

      await customTransport.createTransport(mockServer);

      expect(StreamableHTTPServerTransport).toHaveBeenCalledWith({
        sessionIdGenerator: undefined,
        enableJsonResponse: false,
        customOption: "test-value",
      });
    });
  });

  describe("start", () => {
    it("应该成功启动 HTTP 传输层", async () => {
      const mcpTransport = await transport.createTransport(mockServer);

      await transport.start(mockServer, mcpTransport);

      expect(mockServer.connect).toHaveBeenCalledWith(mcpTransport);
      expect(transport.getStatus().isRunning).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith("HTTP 传输层已启动");
    });

    it("应该处理服务器连接失败", async () => {
      const errorMessage = "Connection failed";
      mockServer.connect = vi.fn().mockRejectedValue(new Error(errorMessage));

      const mcpTransport = await transport.createTransport(mockServer);

      await expect(transport.start(mockServer, mcpTransport)).rejects.toThrow(`启动 HTTP 传输层失败: ${errorMessage}`);

      expect(transport.getStatus().isRunning).toBe(false);
    });

    it("应该处理未知启动错误", async () => {
      const unknownError = { code: "UNKNOWN_ERROR" };
      mockServer.connect = vi.fn().mockRejectedValue(unknownError);

      const mcpTransport = await transport.createTransport(mockServer);

      await expect(transport.start(mockServer, mcpTransport)).rejects.toThrow("启动 HTTP 传输层失败: 未知错误");
    });
  });

  describe("stop", () => {
    it("应该成功停止 HTTP 传输层", async () => {
      const mcpTransport = await transport.createTransport(mockServer);
      await transport.start(mockServer, mcpTransport);
      await transport.startHTTPServer();

      expect(transport.getStatus().isRunning).toBe(true);

      await transport.stop(mcpTransport);

      expect(mockStreamableTransport.close).toHaveBeenCalled();
      expect(mockHTTPServer.close).toHaveBeenCalled();
      expect(transport.getStatus().isRunning).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith("HTTP 传输层已停止");
    });

    it("应该处理停止时的错误", async () => {
      consoleErrorSpy.mockClear();
      const errorMessage = "Stop failed";
      mockStreamableTransport.close = vi.fn().mockRejectedValue(new Error(errorMessage));

      const mcpTransport = await transport.createTransport(mockServer);
      await transport.start(mockServer, mcpTransport);

      await transport.stop(mcpTransport);

      expect(consoleErrorSpy).toHaveBeenCalledWith("停止 HTTP 传输层时出错: Stop failed");
    });

    it("应该处理没有 HTTP 服务器的情况", async () => {
      const mcpTransport = await transport.createTransport(mockServer);
      await transport.start(mockServer, mcpTransport);

      // 不启动 HTTP 服务器，直接停止
      await transport.stop(mcpTransport);

      expect(mockStreamableTransport.close).toHaveBeenCalled();
      expect(transport.getStatus().isRunning).toBe(false);
    });
  });

  describe("startHTTPServer", () => {
    it("应该启动 HTTP 服务器", async () => {
      await transport.createTransport(mockServer);

      await transport.startHTTPServer(3000, "localhost", "/test");

      const http = await import("node:http");
      expect(http.createServer).toHaveBeenCalled();
      expect(mockHTTPServer.listen).toHaveBeenCalledWith(3000, "localhost", expect.any(Function));
      expect(consoleSpy).toHaveBeenCalledWith("MCP HTTP 服务器监听 http://localhost:3000/test");
    });

    it("应该使用默认参数", async () => {
      await transport.createTransport(mockServer);

      await transport.startHTTPServer();

      expect(mockHTTPServer.listen).toHaveBeenCalledWith(8000, "127.0.0.1", expect.any(Function));
    });

    it("应该在传输层未初始化时抛出错误", async () => {
      await expect(transport.startHTTPServer()).rejects.toThrow("HTTP 传输层未初始化，请先调用 createTransport");
    });
  });

  describe("handleRequest", () => {
    let mockReq: IncomingMessage;
    let mockRes: ServerResponse;

    beforeEach(async () => {
      mockReq = {
        method: "POST",
        url: "/mcp",
        headers: {},
      } as IncomingMessage;

      mockRes = {
        writeHead: vi.fn(),
        end: vi.fn(),
        get headersSent() {
          return false;
        },
        set headersSent(_value: boolean) {
          /* ignore */
        },
      } as unknown as ServerResponse;

      await transport.createTransport(mockServer);
    });

    it("应该处理有效的 HTTP 请求", async () => {
      const requestBody = { test: "data" };

      await transport.handleRequest(mockReq, mockRes, requestBody);

      expect(mockStreamableTransport.handleRequest).toHaveBeenCalledWith(mockReq, mockRes, requestBody);
    });

    it("应该在传输层未初始化时返回错误", async () => {
      const uninitializedTransport = new HTTPTransport(config);

      await uninitializedTransport.handleRequest(mockReq, mockRes, {});

      expect(mockRes.writeHead).toHaveBeenCalledWith(500, { "Content-Type": "application/json" });
      expect(mockRes.end).toHaveBeenCalledWith(
        JSON.stringify({
          error: "Transport not initialized",
          message: "HTTP 传输层未正确初始化",
        }),
      );
    });

    it("应该处理请求处理错误", async () => {
      const errorMessage = "Request handling failed";
      mockStreamableTransport.handleRequest = vi.fn().mockRejectedValue(new Error(errorMessage));

      await transport.handleRequest(mockReq, mockRes, {});

      expect(consoleErrorSpy).toHaveBeenCalledWith("处理 HTTP 请求时出错:", expect.any(Error));
      expect(mockRes.writeHead).toHaveBeenCalledWith(500, { "Content-Type": "application/json" });
      expect(mockRes.end).toHaveBeenCalledWith(
        JSON.stringify({
          error: "Internal server error",
          message: errorMessage,
        }),
      );
    });

    it("应该避免重复发送响应头", async () => {
      // 使用新的mock对象来模拟headersSent为true的情况
      mockRes = {
        writeHead: vi.fn(),
        end: vi.fn(),
        get headersSent() {
          return true;
        },
        set headersSent(_value: boolean) {
          /* ignore */
        },
      } as unknown as ServerResponse;

      const errorMessage = "Request failed";
      mockStreamableTransport.handleRequest = vi.fn().mockRejectedValue(new Error(errorMessage));

      await transport.handleRequest(mockReq, mockRes, {});

      expect(mockRes.writeHead).not.toHaveBeenCalled();
      expect(mockRes.end).toHaveBeenCalled();
    });
  });

  describe("getStatus", () => {
    it("应该返回正确的初始状态", () => {
      const status = transport.getStatus();

      expect(status).toEqual({
        type: TransportType.HTTP,
        isRunning: false,
        details: {
          transportType: "http",
          description: "HTTP 传输层",
          config: config.options,
          hasHTTPServer: false,
          hasTransport: false,
        },
      });
    });

    it("启动后应该返回运行状态", async () => {
      const mcpTransport = await transport.createTransport(mockServer);
      await transport.start(mockServer, mcpTransport);

      const status = transport.getStatus();

      expect(status.isRunning).toBe(true);
      expect(status.details?.["hasTransport"]).toBe(true);
    });

    it("启动 HTTP 服务器后应该更新状态", async () => {
      await transport.createTransport(mockServer);
      await transport.startHTTPServer();

      const status = transport.getStatus();

      expect(status.details?.["hasHTTPServer"]).toBe(true);
    });
  });

  describe("辅助方法", () => {
    describe("getHTTPServer", () => {
      it("应该返回 HTTP 服务器实例", async () => {
        await transport.createTransport(mockServer);
        await transport.startHTTPServer();

        const httpServer = transport.getHTTPServer();
        expect(httpServer).toBe(mockHTTPServer);
      });

      it("未启动时应该返回 null", () => {
        const httpServer = transport.getHTTPServer();
        expect(httpServer).toBeNull();
      });
    });

    describe("getTransport", () => {
      it("应该返回传输层实例", async () => {
        const mcpTransport = await transport.createTransport(mockServer);
        const transportInstance = transport.getTransport();
        expect(transportInstance).toBe(mcpTransport);
      });

      it("未创建时应该返回 null", () => {
        const transportInstance = transport.getTransport();
        expect(transportInstance).toBeNull();
      });
    });
  });

  describe("HTTPTransportConfig", () => {
    it("应该正确创建配置对象", () => {
      const config: HTTPTransportConfig = {
        type: TransportType.HTTP,
        options: {
          enableJsonResponse: false,
          port: 3000,
          host: "localhost",
        },
      };

      expect(config.type).toBe(TransportType.HTTP);
      expect(config.options?.enableJsonResponse).toBe(false);
      expect(config.options?.port).toBe(3000);
      expect(config.options?.host).toBe("localhost");
    });
  });

  describe("生命周期集成测试", () => {
    it("应该支持完整的启动-停止循环", async () => {
      // 初始状态
      expect(transport.getStatus().isRunning).toBe(false);

      // 创建传输层
      const mcpTransport = await transport.createTransport(mockServer);
      expect(transport.getTransport()).toBe(mcpTransport);

      // 启动传输层
      await transport.start(mockServer, mcpTransport);
      expect(transport.getStatus().isRunning).toBe(true);

      // 启动 HTTP 服务器
      await transport.startHTTPServer();
      expect(transport.getHTTPServer()).toBe(mockHTTPServer);

      // 停止传输层
      await transport.stop(mcpTransport);
      expect(transport.getStatus().isRunning).toBe(false);
      expect(transport.getTransport()).toBeNull();
      expect(transport.getHTTPServer()).toBeNull();
    });
  });
});
