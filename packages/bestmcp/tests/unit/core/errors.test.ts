import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ToolNotFoundError, ToolValidationError, ZodValidationError } from "../../../src/core/errors";

describe("ToolValidationError", () => {
  it("应该使用工具名称和默认消息创建错误", () => {
    const error = new ToolValidationError("testTool");

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ToolValidationError);
    expect(error.name).toBe("ToolValidationError");
    expect(error.toolName).toBe("testTool");
    expect(error.parameterName).toBeUndefined();
    expect(error.message).toBe("工具 testTool 验证失败");
  });

  it("应该使用工具名称、参数名称和自定义消息创建错误", () => {
    const error = new ToolValidationError("testTool", "param1", "Custom validation error");

    expect(error.toolName).toBe("testTool");
    expect(error.parameterName).toBe("param1");
    expect(error.message).toBe("Custom validation error");
  });

  it("应该使用工具名称和参数名称并使用默认消息创建错误", () => {
    const error = new ToolValidationError("testTool", "param1");

    expect(error.toolName).toBe("testTool");
    expect(error.parameterName).toBe("param1");
    expect(error.message).toBe("工具 testTool 验证失败");
  });
});

describe("ToolNotFoundError", () => {
  it("应该使用工具名称创建错误", () => {
    const error = new ToolNotFoundError("missingTool");

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ToolNotFoundError);
    expect(error.name).toBe("ToolNotFoundError");
    expect(error.toolName).toBe("missingTool");
    expect(error.message).toBe("未找到工具 missingTool");
  });
});

describe("ZodValidationError", () => {
  it("应该使用参数名称和 Zod 错误创建错误", () => {
    const schema = z.string().min(5);
    const result = schema.safeParse("abc");

    if (!result.success) {
      const error = new ZodValidationError("testParam", result.error);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ZodValidationError);
      expect(error.name).toBe("ZodValidationError");
      expect(error.parameterName).toBe("testParam");
      expect(error.zodErrors).toBe(result.error);
      expect(error.message).toContain("参数 testParam:");
      expect(error.message).toContain("at least 5 character(s)");
    }
  });

  it("应该处理多个 Zod 验证错误", () => {
    const schema = z.string().min(5).email();
    const result = schema.safeParse("abc");

    if (!result.success) {
      const error = new ZodValidationError("emailParam", result.error);

      expect(error.parameterName).toBe("emailParam");
      expect(error.message).toContain("参数 emailParam:");
      // Should contain multiple error messages separated by "; "
      expect(error.message.split("; ").length).toBeGreaterThan(0);
    }
  });
});
