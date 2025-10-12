import { beforeEach, describe, expect, it, vi } from "vitest";
import "reflect-metadata";
import { z } from "zod";
import { Param, Tool } from "../../../src/core/decorators";
import { ToolNotFoundError, ToolValidationError } from "../../../src/core/errors";
import { BestMCP } from "../../../src/core/server";

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

  describe("构造函数", () => {
    it("应该使用默认版本初始化", () => {
      const server = new BestMCP("test");
      expect(server).toBeDefined();
    });

    it("应该使用自定义版本初始化", () => {
      const server = new BestMCP("test", "2.0.0");
      expect(server).toBeDefined();
    });
  });

  describe("注册", () => {
    it("应该从服务类注册工具", () => {
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
      expect(tools[0]?.name).toBe("add");
      expect(tools[0]?.description).toBe("测试加法");
      expect(tools[1]?.name).toBe("multiply");
      expect(tools[1]?.description).toBe("测试乘法");
    });

    it("应该注册带有可选参数的工具", () => {
      class TestService {
        @Tool("测试可选参数")
        test(
          @Param(z.string(), "必填参数") required: string,
          @Param(z.number().optional(), "可选参数") optional?: number,
        ): string {
          return `${required}:${optional || "default"}`;
        }
      }

      mcp.register(TestService);

      const tools = mcp.getTools();
      expect(tools).toHaveLength(1);
      expect(tools[0]?.parameters.required).toEqual(["required"]);
      expect(tools[0]?.parameters.properties).toHaveProperty("optional");
    });

    it("应该处理没有工具的服务类", () => {
      class EmptyService {}

      mcp.register(EmptyService);

      const tools = mcp.getTools();
      expect(tools).toHaveLength(0);
    });
  });

  describe("获取工具", () => {
    it("应该在没有注册工具时返回空数组", () => {
      const tools = mcp.getTools();
      expect(tools).toEqual([]);
    });

    it("应该返回已注册工具的元数据", () => {
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
              description: "测试参数",
            },
          },
          required: ["param"],
        },
      });
    });
  });

  describe("执行工具", () => {
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
        withObject(
          @Param(
            z.object({
              name: z.string(),
              age: z.number(),
            }),
            "用户对象",
          )
          user: { name: string; age: number },
        ): string {
          return `${user.name} is ${user.age} years old`;
        }
      }

      mcp.register(TestService);
    });

    it("应该使用有效参数执行工具", async () => {
      const result = await mcp.executeTool("add", { a: 2, b: 3 });
      expect(result).toBe(5);
    });

    it("应该使用字符串参数执行工具", async () => {
      const result = await mcp.executeTool("concat", { a: "hello", b: " world" });
      expect(result).toBe("hello world");
    });

    it("应该使用对象参数执行工具", async () => {
      const result = await mcp.executeTool("withObject", {
        user: { name: "John", age: 30 },
      });
      expect(result).toBe("John is 30 years old");
    });

    it("应该为不存在的工具抛出 ToolNotFoundError", async () => {
      await expect(mcp.executeTool("nonExistent", {})).rejects.toThrow(ToolNotFoundError);
    });

    it("应该为缺失必需参数抛出 ToolValidationError", async () => {
      await expect(mcp.executeTool("add", { a: 2 })).rejects.toThrow(ToolValidationError);
    });

    it("应该为无效参数类型抛出 ToolValidationError", async () => {
      await expect(mcp.executeTool("add", { a: "not-a-number", b: 3 })).rejects.toThrow(ToolValidationError);
    });

    it("应该处理未知参数", async () => {
      await expect(mcp.executeTool("add", { a: 2, b: 3, unknown: "param" })).rejects.toThrow(ToolValidationError);
    });
  });

  describe("获取工具列表", () => {
    it("应该在没有注册工具时返回空数组", () => {
      const toolList = mcp.getToolList();
      expect(toolList).toEqual([]);
    });

    it("应该返回已注册工具名称的列表", () => {
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

  describe("获取工具元数据", () => {
    it("应该为不存在的工具返回 null", () => {
      const metadata = mcp.getToolMetadata("nonExistent");
      expect(metadata).toBeNull();
    });

    it("应该为现有工具返回元数据", () => {
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
        description: "测试工具",
      });
      expect(metadata?.parameters).toBeDefined();
    });
  });

  describe("验证工具", () => {
    beforeEach(() => {
      class TestService {
        @Tool("测试工具")
        test(@Param(z.string(), "测试参数") param: string): string {
          return param;
        }
      }

      mcp.register(TestService);
    });

    it("应该验证有效参数", () => {
      const result = mcp.validateTool("test", { param: "valid" });
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("应该检测缺失必需参数", () => {
      const result = mcp.validateTool("test", {});
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("缺少必需参数: param");
    });

    it("应该检测无效参数类型", () => {
      const result = mcp.validateTool("test", { param: 123 });
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("应该处理不存在的工具", () => {
      const result = mcp.validateTool("nonExistent", {});
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("未找到工具 nonExistent");
    });
  });

  describe("获取工具统计", () => {
    it("应该返回空服务器的统计信息", () => {
      const stats = mcp.getToolStats();
      expect(stats).toEqual({
        totalTools: 0,
        toolNames: [],
      });
    });

    it("应该返回有工具的服务器的统计信息", () => {
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

  describe("服务器是否运行", () => {
    it("应该初始返回 false", () => {
      expect(mcp.isServerRunning()).toBe(false);
    });
  });

  describe("启动标准输入输出服务器", () => {
    it("应该在服务器未初始化时抛出错误", async () => {
      // Create a server without proper initialization
      const incompleteServer = new BestMCP("test");
      // Force server to be undefined by accessing private property
      (incompleteServer as unknown as { server: undefined }).server = undefined;

      await expect(incompleteServer.startStdioServer()).rejects.toThrow("MCP 服务器未初始化");
    });
  });

  describe("停止服务器", () => {
    it("应该处理停止非运行服务器", async () => {
      await mcp.stopServer();
      expect(mcp.isServerRunning()).toBe(false);
    });
  });

  describe("运行", () => {
    it("应该记录启动信息", async () => {
      class TestService {
        @Tool("测试工具")
        test(): void {}
      }

      mcp.register(TestService);

      // Mock the async methods to avoid actual server startup
      const setupToolRequestHandlersSpy = vi
        .spyOn(mcp as unknown as { setupToolRequestHandlers: () => void }, "setupToolRequestHandlers")
        .mockImplementation(() => {});
      const startStdioServerSpy = vi.spyOn(mcp, "startStdioServer").mockResolvedValue(undefined);

      // Test that run method completes without throwing an error
      await expect(mcp.run()).resolves.not.toThrow();

      setupToolRequestHandlersSpy.mockRestore();
      startStdioServerSpy.mockRestore();
    });
  });

  describe("复杂参数映射", () => {
    beforeEach(() => {
      class ComplexService {
        @Tool("多参数测试")
        multiParam(
          @Param(z.string(), "字符串参数") str: string,
          @Param(z.number().optional(), "可选数字") num?: number,
          @Param(z.boolean(), "布尔参数") flag: boolean = true,
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

    it("应该处理带有可选参数的多个参数", async () => {
      const result = await mcp.executeTool("multiParam", {
        str: "test",
        flag: false,
      });
      expect(result).toBe("test:default:false");
    });

    it("应该处理数组参数", async () => {
      const result = await mcp.executeTool("arrayParam", {
        arr: ["a", "b", "c"],
      });
      expect(result).toBe("a,b,c");
    });

    it("应该处理枚举参数", async () => {
      const result = await mcp.executeTool("enumParam", { color: "red" });
      expect(result).toBe("Selected color: red");
    });

    it("应该验证枚举约束", async () => {
      await expect(mcp.executeTool("enumParam", { color: "invalid" })).rejects.toThrow(ToolValidationError);
    });
  });

  describe("错误处理", () => {
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

    it("应该优雅地处理工具执行错误", async () => {
      // The executeTool method should propagate the error
      await expect(mcp.executeTool("throwError", {})).rejects.toThrow("Test error");
    });
  });
});

// Cleanup mocks after all tests
vi.clearAllMocks();
consoleSpy.mockRestore();
consoleErrorSpy.mockRestore();
