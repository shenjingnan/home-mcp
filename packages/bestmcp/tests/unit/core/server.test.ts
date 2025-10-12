import { describe, it, expect, beforeEach, vi } from "vitest";
import "reflect-metadata";
import { z } from "zod";
import { BestMCP } from "../../../src/core/server";
import { Tool, Param } from "../../../src/core/decorators";
import { ToolValidationError, ToolNotFoundError } from "../../../src/core/errors";

// Mock console methods to avoid noise in tests
const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

describe("BestMCP", () => {
  let mcp: BestMCP;

  beforeEach(() => {
    mcp = new BestMCP("test-server");
    consoleSpy.mockClear();
    consoleErrorSpy.mockClear();
  });

  describe("constructor", () => {
    it("should initialize with default version", () => {
      const server = new BestMCP("test");
      expect(server).toBeDefined();
    });

    it("should initialize with custom version", () => {
      const server = new BestMCP("test", "2.0.0");
      expect(server).toBeDefined();
    });
  });

  describe("register", () => {
    it("should register tools from service class", () => {
      class TestService {
        @Tool("测试加法")
        add(@Param(z.number(), "第一个数字") a: number, @Param(z.number(), "第二个数字") b: number): number {
          return a + b;
        }

        @Tool("测试乘法")
        multiply(@Param(z.number(), "第一个数字") a: number, @Param(z.number(), "第二个数字") b: number): number {
          return a * b;
        }
      }

      mcp.register(TestService);

      const tools = mcp.getTools();
      expect(tools).toHaveLength(2);
      expect(tools[0].name).toBe("add");
      expect(tools[0].description).toBe("测试加法");
      expect(tools[1].name).toBe("multiply");
      expect(tools[1].description).toBe("测试乘法");
    });

    it("should register tool with optional parameters", () => {
      class TestService {
        @Tool("测试可选参数")
        test(
          @Param(z.string(), "必填参数") required: string,
          @Param(z.number().optional(), "可选参数") optional?: number
        ): string {
          return `${required}:${optional || "default"}`;
        }
      }

      mcp.register(TestService);

      const tools = mcp.getTools();
      expect(tools).toHaveLength(1);
      expect(tools[0].parameters.required).toEqual(["required"]);
      expect(tools[0].parameters.properties).toHaveProperty("optional");
    });

    it("should handle service class with no tools", () => {
      class EmptyService {}

      mcp.register(EmptyService);

      const tools = mcp.getTools();
      expect(tools).toHaveLength(0);
    });
  });

  describe("getTools", () => {
    it("should return empty array when no tools are registered", () => {
      const tools = mcp.getTools();
      expect(tools).toEqual([]);
    });

    it("should return registered tools metadata", () => {
      class TestService {
        @Tool("测试工具")
        test(@Param(z.string(), "测试参数") param: string): string {
          return param;
        }
      }

      mcp.register(TestService);

      const tools = mcp.getTools();
      expect(tools).toHaveLength(1);
      expect(tools[0]).toMatchObject({
        name: "test",
        description: "测试工具",
        parameters: {
          type: "object",
          properties: {
            param: {
              type: "string",
              description: "测试参数"
            }
          },
          required: ["param"]
        }
      });
    });
  });

  describe("executeTool", () => {
    beforeEach(() => {
      class TestService {
        @Tool("加法运算")
        add(@Param(z.number(), "第一个数字") a: number, @Param(z.number(), "第二个数字") b: number): number {
          return a + b;
        }

        @Tool("字符串连接")
        concat(@Param(z.string(), "第一个字符串") a: string, @Param(z.string(), "第二个字符串") b: string): string {
          return a + b;
        }

        @Tool("对象参数测试")
        withObject(@Param(z.object({
          name: z.string(),
          age: z.number()
        }), "用户对象") user: { name: string; age: number }): string {
          return `${user.name} is ${user.age} years old`;
        }
      }

      mcp.register(TestService);
    });

    it("should execute tool with valid arguments", async () => {
      const result = await mcp.executeTool("add", { a: 2, b: 3 });
      expect(result).toBe(5);
    });

    it("should execute tool with string arguments", async () => {
      const result = await mcp.executeTool("concat", { a: "hello", b: " world" });
      expect(result).toBe("hello world");
    });

    it("should execute tool with object arguments", async () => {
      const result = await mcp.executeTool("withObject", {
        user: { name: "John", age: 30 }
      });
      expect(result).toBe("John is 30 years old");
    });

    it("should throw ToolNotFoundError for non-existent tool", async () => {
      await expect(mcp.executeTool("nonExistent", {})).rejects.toThrow(ToolNotFoundError);
    });

    it("should throw ToolValidationError for missing required parameters", async () => {
      await expect(mcp.executeTool("add", { a: 2 })).rejects.toThrow(ToolValidationError);
    });

    it("should throw ToolValidationError for invalid parameter types", async () => {
      await expect(mcp.executeTool("add", { a: "not-a-number", b: 3 })).rejects.toThrow(ToolValidationError);
    });

    it("should handle unknown parameters", async () => {
      await expect(mcp.executeTool("add", { a: 2, b: 3, unknown: "param" })).rejects.toThrow(ToolValidationError);
    });
  });

  describe("getToolList", () => {
    it("should return empty array when no tools are registered", () => {
      const toolList = mcp.getToolList();
      expect(toolList).toEqual([]);
    });

    it("should return list of registered tool names", () => {
      class TestService {
        @Tool("工具1")
        tool1(): void {}

        @Tool("工具2")
        tool2(): void {}
      }

      mcp.register(TestService);

      const toolList = mcp.getToolList();
      expect(toolList).toHaveLength(2);
      expect(toolList).toContain("tool1");
      expect(toolList).toContain("tool2");
    });
  });

  describe("getToolMetadata", () => {
    it("should return null for non-existent tool", () => {
      const metadata = mcp.getToolMetadata("nonExistent");
      expect(metadata).toBeNull();
    });

    it("should return metadata for existing tool", () => {
      class TestService {
        @Tool("测试工具")
        test(@Param(z.string(), "测试参数") param: string): string {
          return param;
        }
      }

      mcp.register(TestService);

      const metadata = mcp.getToolMetadata("test");
      expect(metadata).toMatchObject({
        name: "test",
        description: "测试工具"
      });
      expect(metadata?.parameters).toBeDefined();
    });
  });

  describe("validateTool", () => {
    beforeEach(() => {
      class TestService {
        @Tool("测试工具")
        test(@Param(z.string(), "测试参数") param: string): string {
          return param;
        }
      }

      mcp.register(TestService);
    });

    it("should validate valid arguments", () => {
      const result = mcp.validateTool("test", { param: "valid" });
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("should detect missing required parameters", () => {
      const result = mcp.validateTool("test", {});
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Missing required parameter: param");
    });

    it("should detect invalid parameter types", () => {
      const result = mcp.validateTool("test", { param: 123 });
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should handle non-existent tool", () => {
      const result = mcp.validateTool("nonExistent", {});
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Tool nonExistent not found");
    });
  });

  describe("getToolStats", () => {
    it("should return stats for empty server", () => {
      const stats = mcp.getToolStats();
      expect(stats).toEqual({
        totalTools: 0,
        toolNames: []
      });
    });

    it("should return stats for server with tools", () => {
      class TestService {
        @Tool("工具1")
        tool1(): void {}

        @Tool("工具2")
        tool2(): void {}
      }

      mcp.register(TestService);

      const stats = mcp.getToolStats();
      expect(stats.totalTools).toBe(2);
      expect(stats.toolNames).toContain("tool1");
      expect(stats.toolNames).toContain("tool2");
    });
  });

  describe("isServerRunning", () => {
    it("should return false initially", () => {
      expect(mcp.isServerRunning()).toBe(false);
    });
  });

  describe("startStdioServer", () => {
    it("should throw error when server not initialized", async () => {
      // Create a server without proper initialization
      const incompleteServer = new BestMCP("test");
      // Force server to be undefined by accessing private property
      (incompleteServer as any).server = undefined;

      await expect(incompleteServer.startStdioServer()).rejects.toThrow("MCP Server not initialized");
    });
  });

  describe("stopServer", () => {
    it("should handle stopping non-running server", async () => {
      await mcp.stopServer();
      expect(mcp.isServerRunning()).toBe(false);
    });
  });

  describe("run", () => {
    it("should log startup information", async () => {
      class TestService {
        @Tool("测试工具")
        test(): void {}
      }

      mcp.register(TestService);

      // Mock the async methods to avoid actual server startup
      const setupToolRequestHandlersSpy = vi.spyOn(mcp as any, "setupToolRequestHandlers").mockImplementation(() => {});
      const startStdioServerSpy = vi.spyOn(mcp, "startStdioServer").mockResolvedValue(undefined);

      // Clear previous console calls
      consoleSpy.mockClear();

      await mcp.run();

      expect(consoleSpy).toHaveBeenCalledWith("Starting test-server v1.0.0 in compatibility mode");
      expect(consoleSpy).toHaveBeenCalledWith("Registered 1 tools");
      expect(consoleSpy).toHaveBeenCalledWith('Use run({ transport: "stdio" }) for MCP protocol communication');

      setupToolRequestHandlersSpy.mockRestore();
      startStdioServerSpy.mockRestore();
    });
  });

  describe("complex parameter mapping", () => {
    beforeEach(() => {
      class ComplexService {
        @Tool("多参数测试")
        multiParam(
          @Param(z.string(), "字符串参数") str: string,
          @Param(z.number().optional(), "可选数字") num?: number,
          @Param(z.boolean(), "布尔参数") flag: boolean = true
        ): string {
          return `${str}:${num || "default"}:${flag}`;
        }

        @Tool("数组参数测试")
        arrayParam(@Param(z.array(z.string()), "字符串数组") arr: string[]): string {
          return arr.join(",");
        }

        @Tool("枚举参数测试")
        enumParam(@Param(z.enum(["red", "green", "blue"]), "颜色选择") color: "red" | "green" | "blue"): string {
          return `Selected color: ${color}`;
        }
      }

      mcp.register(ComplexService);
    });

    it("should handle multiple parameters with optional ones", async () => {
      const result = await mcp.executeTool("multiParam", {
        str: "test",
        flag: false
      });
      expect(result).toBe("test:default:false");
    });

    it("should handle array parameters", async () => {
      const result = await mcp.executeTool("arrayParam", {
        arr: ["a", "b", "c"]
      });
      expect(result).toBe("a,b,c");
    });

    it("should handle enum parameters", async () => {
      const result = await mcp.executeTool("enumParam", { color: "red" });
      expect(result).toBe("Selected color: red");
    });

    it("should validate enum constraints", async () => {
      await expect(mcp.executeTool("enumParam", { color: "invalid" })).rejects.toThrow(ToolValidationError);
    });
  });

  describe("error handling", () => {
    beforeEach(() => {
      class ErrorService {
        @Tool("抛出错误的工具")
        throwError(): never {
          throw new Error("Test error");
        }

        @Tool("返回错误的工具")
        returnError(): string {
          return "error result";
        }
      }

      mcp.register(ErrorService);
    });

    it("should handle tool execution errors gracefully", async () => {
      // The executeTool method should propagate the error
      await expect(mcp.executeTool("throwError", {})).rejects.toThrow("Test error");
    });
  });
});

// Cleanup mocks after all tests
vi.clearAllMocks();
consoleSpy.mockRestore();
consoleErrorSpy.mockRestore();