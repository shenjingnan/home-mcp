import type { ServerCapabilities } from "@modelcontextprotocol/sdk/types.js";
import type { z } from "zod";

// 类型定义
export interface ToolMetadata {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, JsonSchema>;
    required: string[];
  };
}

// 工具执行器的类型定义
export interface ToolExecutor {
  metadata: ToolMetadata;
  handler: (...args: unknown[]) => unknown;
  paramZodSchemas?: Record<string, z.ZodType<unknown>>;
}

// 参数类型定义
export interface ParamTypeMetadata {
  name?: string;
  required: boolean;
  index: number;
  type?: string;
  schema?: JsonSchema;
  zodSchema?: z.ZodType<unknown>;
  description?: string;
  enum?: unknown[];
  items?: JsonSchema;
  properties?: Record<string, JsonSchema>;
}

// JSON Schema 类型定义
export interface JsonSchema {
  type: string;
  description?: string;
  enum?: unknown[];
  items?: JsonSchema;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  default?: unknown;
}

// 元数据存储
export const TOOLS_METADATA = Symbol("tools");
export const TOOL_PARAM_METADATA = Symbol("tool:params");

// 类型推断函数：从运行时类型推断 JSON Schema
export function inferTypeSchema(type: unknown): JsonSchema {
  if (!type) {
    return { type: "string" };
  }

  // 基本类型映射
  if (type === Number) return { type: "number" };
  if (type === String) return { type: "string" };
  if (type === Boolean) return { type: "boolean" };
  if (type === Object) return { type: "object" };
  if (type === Array) return { type: "array", items: { type: "string" } };

  // 特殊对象类型检查
  if (type && typeof type === "function" && type.name) {
    switch (type.name) {
      case "String":
        return { type: "string" };
      case "Number":
        return { type: "number" };
      case "Boolean":
        return { type: "boolean" };
      case "Object":
        return { type: "object" };
      case "Array":
        return { type: "array", items: { type: "string" } };
      default:
        return { type: "string" };
    }
  }

  // 默认回退
  return { type: "string" };
}

// 运行时配置接口
export interface RunOptions {
  transport?: "stdio" | "http";
  port?: number;
  host?: string;
}

// BestMCP 配置接口
export interface BestMCPConfig {
  name?: string;
  version?: string;
  capabilities?: ServerCapabilities;
  instructions?: string;
}
