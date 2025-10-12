import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ToolNotFoundError, ToolValidationError, ZodValidationError } from "../../../src/core/errors";

describe("ToolValidationError", () => {
  it("should create error with tool name and default message", () => {
    const error = new ToolValidationError("testTool");

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ToolValidationError);
    expect(error.name).toBe("ToolValidationError");
    expect(error.toolName).toBe("testTool");
    expect(error.parameterName).toBeUndefined();
    expect(error.message).toBe("Validation failed for tool testTool");
  });

  it("should create error with tool name, parameter name and custom message", () => {
    const error = new ToolValidationError("testTool", "param1", "Custom validation error");

    expect(error.toolName).toBe("testTool");
    expect(error.parameterName).toBe("param1");
    expect(error.message).toBe("Custom validation error");
  });

  it("should create error with tool name and parameter name using default message", () => {
    const error = new ToolValidationError("testTool", "param1");

    expect(error.toolName).toBe("testTool");
    expect(error.parameterName).toBe("param1");
    expect(error.message).toBe("Validation failed for tool testTool");
  });
});

describe("ToolNotFoundError", () => {
  it("should create error with tool name", () => {
    const error = new ToolNotFoundError("missingTool");

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ToolNotFoundError);
    expect(error.name).toBe("ToolNotFoundError");
    expect(error.toolName).toBe("missingTool");
    expect(error.message).toBe("Tool missingTool not found");
  });
});

describe("ZodValidationError", () => {
  it("should create error with parameter name and Zod errors", () => {
    const schema = z.string().min(5);
    const result = schema.safeParse("abc");

    if (!result.success) {
      const error = new ZodValidationError("testParam", result.error);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ZodValidationError);
      expect(error.name).toBe("ZodValidationError");
      expect(error.parameterName).toBe("testParam");
      expect(error.zodErrors).toBe(result.error);
      expect(error.message).toContain("Parameter testParam:");
      expect(error.message).toContain("at least 5 character(s)");
    }
  });

  it("should handle multiple Zod validation errors", () => {
    const schema = z.string().min(5).email();
    const result = schema.safeParse("abc");

    if (!result.success) {
      const error = new ZodValidationError("emailParam", result.error);

      expect(error.parameterName).toBe("emailParam");
      expect(error.message).toContain("Parameter emailParam:");
      // Should contain multiple error messages separated by "; "
      expect(error.message.split("; ").length).toBeGreaterThan(0);
    }
  });
});
