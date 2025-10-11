import { z } from "zod";

// 自定义错误类型
export class ToolValidationError extends Error {
  constructor(
    public toolName: string,
    public parameterName?: string,
    message?: string,
  ) {
    super(message || `Validation failed for tool ${toolName}`);
    this.name = "ToolValidationError";
  }
}

export class ToolNotFoundError extends Error {
  constructor(public toolName: string) {
    super(`Tool ${toolName} not found`);
    this.name = "ToolNotFoundError";
  }
}

export class ZodValidationError extends Error {
  constructor(
    public parameterName: string,
    public zodErrors: z.ZodError,
  ) {
    const errorMessage = zodErrors.errors.map((err) => `Parameter ${parameterName}: ${err.message}`).join("; ");
    super(errorMessage);
    this.name = "ZodValidationError";
  }
}