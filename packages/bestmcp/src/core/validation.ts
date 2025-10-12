import { z } from "zod";
import { type JsonSchema, type ParamTypeMetadata, TOOL_PARAM_METADATA } from "./types";

// 参数名提取函数
// biome-ignore lint/complexity/noBannedTypes: 需要接受任何函数类型以提取参数名
export function getParamNames(func: Function): string[] {
  const funcStr = func.toString();
  const match = funcStr.match(/\(([^)]*)\)/);
  if (!match || !match[1]) return [];

  return match[1]
    .split(",")
    .map((param) => param.trim().split(/\s+/)[0]?.split(":")[0])
    .filter((name): name is string => !!name && name !== "");
}

// 检查 Zod Schema 是否为可选的
export function isZodSchemaOptional(zodSchema: z.ZodType<unknown>): boolean {
  try {
    // 检查是否为 ZodOptional 类型
    if (zodSchema instanceof z.ZodOptional) {
      return true;
    }

    // 检查是否有 isOptional 方法
    if (typeof zodSchema.isOptional === "function") {
      return zodSchema.isOptional();
    }

    // 检查 _def 结构判断是否为可选
    const def = (zodSchema as z.ZodType<unknown> & { _def?: { typeName?: string } })._def;
    if (def && def.typeName === "ZodOptional") {
      return true;
    }

    // 默认情况下，假设为必传
    return false;
  } catch (_error) {
    // 如果检查过程中出现错误，默认为必传以确保安全性
    return false;
  }
}

// Zod Schema 转 JSON Schema 的函数
export function zodSchemaToJsonSchema(zodSchema: z.ZodType<unknown>): JsonSchema {
  // 处理基本类型
  if (zodSchema instanceof z.ZodString) {
    const schema: JsonSchema = { type: "string" };

    // 获取字符串约束
    const checks =
      (zodSchema as z.ZodString & { _def?: { checks?: Array<{ kind: string; value?: unknown; regex?: RegExp }> } })._def
        ?.checks || [];
    checks.forEach((check) => {
      switch (check.kind) {
        case "min":
          schema.minLength = check.value;
          break;
        case "max":
          schema.maxLength = check.value;
          break;
        case "regex":
          schema.pattern = check.regex.source;
          break;
      }
    });

    return schema;
  }

  if (zodSchema instanceof z.ZodNumber) {
    const schema: JsonSchema = { type: "number" };

    // 获取数字约束
    const checks =
      (zodSchema as z.ZodNumber & { _def?: { checks?: Array<{ kind: string; value?: unknown }> } })._def?.checks || [];
    checks.forEach((check) => {
      switch (check.kind) {
        case "min":
          schema.minimum = check.value;
          break;
        case "max":
          schema.maximum = check.value;
          break;
      }
    });

    return schema;
  }

  if (zodSchema instanceof z.ZodBoolean) {
    return { type: "boolean" };
  }

  if (zodSchema instanceof z.ZodArray) {
    const itemType = zodSchemaToJsonSchema(zodSchema.element);
    return { type: "array", items: itemType };
  }

  if (zodSchema instanceof z.ZodObject) {
    const shape = zodSchema.shape;
    const properties: Record<string, JsonSchema> = {};
    const required: string[] = [];

    Object.entries(shape).forEach(([key, field]: [string, unknown]) => {
      const fieldSchema = zodSchemaToJsonSchema(field as z.ZodType<unknown>);

      // 提取 Zod 字段中的描述信息
      try {
        const zodField = field as z.ZodType<unknown> & { _def?: { description?: string } };
        if (zodField._def?.description) {
          fieldSchema.description = zodField._def.description;
        }
      } catch (_e) {
        // 如果无法提取描述信息，忽略错误
      }

      properties[key] = fieldSchema;

      // 检查是否为必填字段
      try {
        if (!(field as z.ZodType<unknown>).isOptional?.()) {
          required.push(key);
        }
      } catch (_e) {
        // 如果无法检查可选性，默认为必填
        required.push(key);
      }
    });

    return { type: "object", properties, required };
  }

  if (zodSchema instanceof z.ZodEnum) {
    // 使用类型断言来绕过 ZodEnum 的复杂类型约束
    const enumSchema = zodSchema as z.ZodEnum<[string, ...string[]]> & { _def?: { values?: unknown[] } };
    const enumValues = enumSchema._def?.values || [];
    // 确保至少有一个元素
    const validEnumValues =
      Array.isArray(enumValues) && enumValues.length > 0 ? ([...enumValues] as [string, ...string[]]) : ["default"];
    return {
      type: "string",
      enum: validEnumValues,
    };
  }

  if (zodSchema instanceof z.ZodUnion) {
    // 处理联合类型，返回第一个选项的类型
    const firstOption = (
      zodSchema as z.ZodUnion<[z.ZodType<unknown>, ...z.ZodType<unknown>[]]> & {
        _def?: { options?: z.ZodType<unknown>[] };
      }
    )._def?.options?.[0];
    if (firstOption) {
      return zodSchemaToJsonSchema(firstOption);
    }
    return { type: "string" }; // 默认返回字符串类型
  }

  if (zodSchema instanceof z.ZodOptional) {
    // 可选类型返回内部类型
    const innerSchema = (zodSchema as z.ZodOptional<z.ZodType<unknown>>)._def;
    if (innerSchema && typeof innerSchema === "object" && "type" in innerSchema) {
      return zodSchemaToJsonSchema(innerSchema.type as z.ZodType<unknown>);
    }
    return { type: "string" };
  }

  // 默认返回字符串类型
  return { type: "string" };
}

// 参数提取函数
export function extractParameters(
  target?: object,
  propertyKey?: string,
  paramTypes?: unknown[],
): {
  properties: Record<string, JsonSchema>;
  required: string[];
} {
  const properties: Record<string, JsonSchema> = {};
  const required: string[] = [];

  // 如果没有提供必要参数，返回空结果
  if (!target || !propertyKey || !paramTypes) {
    return { properties, required };
  }

  // 获取 @param 装饰器存储的参数元数据
  const paramMetadata = Reflect.getMetadata(TOOL_PARAM_METADATA, target, propertyKey) || [];

  // 处理每个装饰器提供的参数信息
  paramMetadata.forEach((param: ParamTypeMetadata, index: number) => {
    if (param) {
      // 使用装饰器提供的参数名，如果没有则使用默认名称
      const paramName = param.name || `param${index}`;

      // 优先使用 Zod schema 生成 JSON Schema
      let schema: JsonSchema;
      if (param.zodSchema) {
        schema = zodSchemaToJsonSchema(param.zodSchema);
      } else if (param.schema) {
        schema = param.schema;
      } else {
        const paramType = paramTypes[index];
        schema = inferTypeSchema(paramType as unknown);
      }

      // 添加描述信息
      if (param.description) {
        schema.description = param.description;
      }

      properties[paramName] = schema;

      // 自动推断参数必传性
      let isRequired = true; // 默认为必传

      // 1. 优先使用装饰器显式设置
      if (param.required !== undefined) {
        isRequired = param.required;
      } else {
        // 2. 如果是 Zod schema，检查是否为可选类型
        if (param.zodSchema?.isOptional?.()) {
          isRequired = false;
        } else {
          // 3. 如果装饰器没有设置，默认为必传
          isRequired = true;
        }
      }

      // 如果参数为必传，则添加到 required 数组
      if (isRequired) {
        required.push(paramName);
      }
    }
  });

  return { properties, required };
}

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
