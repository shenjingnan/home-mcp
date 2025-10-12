import { z } from "zod";
import "reflect-metadata";
import {
  ToolMetadata,
  TOOLS_METADATA,
  TOOL_PARAM_METADATA
} from './types';
import {
  extractParameters,
  isZodSchemaOptional,
  getParamNames
} from './validation';

// 工具装饰器
export function Tool(description?: string): MethodDecorator {
  return (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    if (!descriptor || !target) {
      console.warn(`Tool decorator: descriptor or target is undefined for ${String(propertyKey)}`);
      return;
    }

    const existingTools = Reflect.getMetadata(TOOLS_METADATA, target.constructor) || [];

    // 获取参数类型信息
    const _paramTypes = (Reflect.getMetadata("design:paramtypes", target, propertyKey) as unknown[]) || [];

    const params = extractParameters(target, propertyKey as string | undefined, _paramTypes);

    const toolMetadata: ToolMetadata = {
      name: String(propertyKey),
      description: description || "",
      parameters: {
        type: "object",
        properties: params.properties,
        required: params.required,
      },
    };

    existingTools.push({
      metadata: toolMetadata,
      method: descriptor.value,
      propertyKey,
    });

    Reflect.defineMetadata(TOOLS_METADATA, existingTools, target.constructor);
  };
}

// 参数装饰器
export function Param(zodSchema: z.ZodType<unknown>, description?: string): ParameterDecorator {
  return (target: object, propertyKey: string | symbol | undefined, parameterIndex: number) => {
    // Type guard to ensure propertyKey is string | symbol (excluding undefined)
    if (propertyKey === undefined) {
      return;
    }

    const actualPropertyKey = propertyKey as string | symbol;

    const existingParams = Reflect.getMetadata(TOOL_PARAM_METADATA, target, actualPropertyKey) || [];

    // 获取参数的运行时类型信息
    const paramTypes = Reflect.getMetadata("design:paramtypes", target, actualPropertyKey) || [];
    const paramType = paramTypes[parameterIndex];

    const method = (target as Record<string | symbol, (...args: unknown[]) => unknown>)[actualPropertyKey];
    if (!method) {
      throw new Error(`Method ${String(actualPropertyKey)} not found on target`);
    }

    const name = getParamNames(method)[parameterIndex];

    // 根据 zodSchema 自动判断参数是否为必传
    const required: boolean = !isZodSchemaOptional(zodSchema);

    existingParams[parameterIndex] = {
      name,
      required,
      index: parameterIndex,
      type: paramType?.name || paramType?.type,
      schema: paramType,
      zodSchema,
      description,
    };

    Reflect.defineMetadata(TOOL_PARAM_METADATA, existingParams, target, actualPropertyKey);
  };
}