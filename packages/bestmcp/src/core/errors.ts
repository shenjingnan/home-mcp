import type { z } from "zod";

// 自定义错误类型
export class ToolValidationError extends Error {
  constructor(
    public toolName: string,
    public parameterName?: string,
    message?: string,
  ) {
    super(message || `工具 ${toolName} 验证失败`);
    this.name = "ToolValidationError";
  }
}

export class ToolNotFoundError extends Error {
  constructor(public toolName: string) {
    super(`未找到工具 ${toolName}`);
    this.name = "ToolNotFoundError";
  }
}

export class ZodValidationError extends Error {
  constructor(
    public parameterName: string,
    public zodErrors: z.ZodError,
  ) {
    const errorMessage = zodErrors.errors.map((err) => `参数 ${parameterName}: ${err.message}`).join("; ");
    super(errorMessage);
    this.name = "ZodValidationError";
  }
}
