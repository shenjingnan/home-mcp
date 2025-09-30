import { z } from "zod";
import "reflect-metadata";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  type CallToolRequest,
  CallToolRequestSchema,
  type CallToolResult,
  ListToolsRequestSchema,
  type Tool as MCPSDKTool,
} from "@modelcontextprotocol/sdk/types.js";

// 类型定义
interface ToolMetadata {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, JsonSchema>;
    required: string[];
  };
}

// 工具执行器的类型定义
interface ToolExecutor {
  metadata: ToolMetadata;
  handler: (...args: unknown[]) => unknown;
  paramZodSchemas?: Record<string, z.ZodType<unknown>>;
}

// 自定义错误类型
class ToolValidationError extends Error {
  constructor(
    public toolName: string,
    public parameterName?: string,
    message?: string,
  ) {
    super(message || `Validation failed for tool ${toolName}`);
    this.name = "ToolValidationError";
  }
}

class ToolNotFoundError extends Error {
  constructor(public toolName: string) {
    super(`Tool ${toolName} not found`);
    this.name = "ToolNotFoundError";
  }
}

class ZodValidationError extends Error {
  constructor(
    public parameterName: string,
    public zodErrors: z.ZodError,
  ) {
    const errorMessage = zodErrors.errors.map((err) => `Parameter ${parameterName}: ${err.message}`).join("; ");
    super(errorMessage);
    this.name = "ZodValidationError";
  }
}

// 参数类型定义
interface ParamTypeMetadata {
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
interface JsonSchema {
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
const TOOLS_METADATA = Symbol("tools");
const TOOL_PARAM_METADATA = Symbol("tool:params");

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

function getParamNames(func: (...args: unknown[]) => unknown): string[] {
  const funcStr = func.toString();
  const match = funcStr.match(/\(([^)]*)\)/);
  if (!match || !match[1]) return [];

  return match[1]
    .split(",")
    .map((param) => param.trim().split(/\s+/)[0]?.split(":")[0])
    .filter((name): name is string => !!name && name !== "");
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

// 检查 Zod Schema 是否为可选的
function isZodSchemaOptional(zodSchema: z.ZodType<unknown>): boolean {
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

export class BestMCP {
  private name: string;
  private version: string;
  private tools: Map<string, ToolExecutor> = new Map();
  private server?: Server;
  private transport: StdioServerTransport | undefined;

  constructor(name: string, version: string = "1.0.0") {
    this.name = name;
    this.version = version;
    this.initializeMCPServer();
  }

  private initializeMCPServer() {
    this.server = new Server(
      {
        name: this.name,
        version: this.version,
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );
  }

  private setupToolRequestHandlers() {
    if (!this.server) return;

    // 工具列表请求处理器
    console.log(JSON.stringify(this.getTools().map(this.convertToMCPTool), null, 2));
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: this.getTools().map(this.convertToMCPTool),
      };
    });

    // 工具调用请求处理器
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      return await this.handleToolCall(request);
    });
  }

  private convertToMCPTool(tool: ToolMetadata): MCPSDKTool {
    return {
      name: tool.name,
      description: tool.description,
      inputSchema: {
        type: "object",
        properties: tool.parameters.properties,
        required: tool.parameters.required,
      },
    };
  }

  private async handleToolCall(request: CallToolRequest): Promise<CallToolResult> {
    try {
      const { name, arguments: args } = request.params;

      // 参数验证
      if (!args) {
        throw new Error("Missing required arguments");
      }

      // 执行工具
      const result = await this.executeTool(name, args);

      return {
        content: [
          {
            type: "text",
            text: typeof result === "string" ? result : JSON.stringify(result),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
        isError: true,
      };
    }
  }

  // 注册服务类
  register<T>(serviceClass: new () => T) {
    const instance = new serviceClass();

    // 注册工具
    const tools = Reflect.getMetadata(TOOLS_METADATA, serviceClass) || [];
    tools.forEach((tool: { metadata: ToolMetadata; method: (...args: unknown[]) => unknown; propertyKey: string }) => {
      // 获取参数的 Zod schema 信息
      const paramZodSchemas = this.extractParamZodSchemas(serviceClass, tool.propertyKey);

      this.tools.set(tool.metadata.name, {
        metadata: tool.metadata,
        handler: tool.method.bind(instance),
        paramZodSchemas,
      });
    });
  }

  // 提取参数的 Zod schema 信息
  private extractParamZodSchemas<T>(
    serviceClass: new () => T,
    propertyKey: string,
  ): Record<string, z.ZodType<unknown>> {
    const paramMetadata = Reflect.getMetadata(TOOL_PARAM_METADATA, serviceClass.prototype, propertyKey) || [];
    const paramZodSchemas: Record<string, z.ZodType<unknown>> = {};

    paramMetadata.forEach((param: ParamTypeMetadata) => {
      if (param.zodSchema && param.name) {
        paramZodSchemas[param.name] = param.zodSchema;
      }
    });

    return paramZodSchemas;
  }

  // 获取所有工具定义
  getTools() {
    return Array.from(this.tools.values()).map((tool) => tool.metadata);
  }

  // 验证工具参数
  private validateToolArguments(
    toolName: string,
    args: Record<string, unknown>,
  ): { isValid: boolean; errors: string[] } {
    const tool = this.tools.get(toolName);
    if (!tool) {
      return { isValid: false, errors: [`Tool ${toolName} not found`] };
    }

    const errors: string[] = [];
    const { parameters } = tool.metadata;
    const { required, properties } = parameters;

    // 检查必需参数
    for (const paramName of required) {
      if (args[paramName] === undefined || args[paramName] === null) {
        errors.push(`Missing required parameter: ${paramName}`);
      }
    }

    // 检查未知参数
    const knownParams = Object.keys(properties);
    const providedParams = Object.keys(args);
    for (const paramName of providedParams) {
      if (!knownParams.includes(paramName)) {
        errors.push(`Unknown parameter: ${paramName}`);
      }
    }

    // 使用 Zod 进行参数验证
    const zodValidation = this.validateWithZodSchema(toolName, args);
    if (!zodValidation.isValid) {
      errors.push(...zodValidation.errors);
    }

    return { isValid: errors.length === 0, errors };
  }

  // 使用 Zod schema 进行参数验证
  private validateWithZodSchema(
    toolName: string,
    args: Record<string, unknown>,
  ): { isValid: boolean; errors: string[] } {
    const tool = this.tools.get(toolName);
    if (!tool) {
      return { isValid: false, errors: [`Tool ${toolName} not found`] };
    }

    const errors: string[] = [];

    // 获取工具的参数 Zod schema 信息
    const paramMetadata = this.getParamZodSchemas(toolName);

    for (const [paramName, paramInfo] of Object.entries(paramMetadata)) {
      if (args[paramName] !== undefined && args[paramName] !== null && paramInfo.zodSchema) {
        try {
          // 使用 Zod schema 验证参数
          const result = paramInfo.zodSchema.safeParse(args[paramName]);
          if (!result.success) {
            // 抛出 Zod 验证错误
            throw new ZodValidationError(paramName, result.error);
          }
        } catch (error) {
          if (error instanceof ZodValidationError) {
            errors.push(error.message);
          } else {
            errors.push(
              `Parameter ${paramName}: Zod validation failed - ${error instanceof Error ? error.message : "Unknown error"}`,
            );
          }
        }
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  // 获取工具参数的 Zod schema 信息
  private getParamZodSchemas(toolName: string): Record<string, { zodSchema?: z.ZodType<unknown>; required: boolean }> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      return {};
    }

    const paramSchemas: Record<string, { zodSchema?: z.ZodType<unknown>; required: boolean }> = {};

    // 从存储的 Zod schema 信息中获取
    const storedZodSchemas = tool.paramZodSchemas || {};

    // 从工具元数据中获取参数定义
    const { required, properties } = tool.metadata.parameters;

    for (const [paramName, _paramSchema] of Object.entries(properties)) {
      const isRequired = required.includes(paramName);
      paramSchemas[paramName] = {
        required: isRequired,
        zodSchema: storedZodSchemas[paramName]!,
      };
    }

    return paramSchemas;
  }

  // 执行工具
  async executeTool(name: string, args: Record<string, unknown>) {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new ToolNotFoundError(name);
    }

    // 参数验证
    const validation = this.validateToolArguments(name, args);
    if (!validation.isValid) {
      const errorMsg = `Invalid arguments for tool ${name}: ${validation.errors.join(", ")}`;
      console.error(errorMsg);
      throw new ToolValidationError(name, undefined, errorMsg);
    }

    // 智能参数映射：将对象参数转换为多参数调用
    const mappedArgs = this.mapArgumentsToObject(tool, args);

    // 如果是数组，使用展开运算符调用；否则直接传递
    if (Array.isArray(mappedArgs)) {
      return this.invokeMethodWithArguments(tool.handler, mappedArgs);
    } else {
      return tool.handler(mappedArgs);
    }
  }

  // 参数映射：将 MCP 协议的对象参数映射到方法的多参数形式
  private mapArgumentsToObject(tool: ToolExecutor, args: Record<string, unknown>): unknown[] | Record<string, unknown> {
    // 如果方法期望单个对象参数，直接返回
    if (this.expectsSingleObjectParameter(tool)) {
      return args;
    }

    // 将对象参数转换为按顺序的参数数组
    return this.convertObjectToOrderedArguments(tool, args);
  }

  // 检查方法是否期望单个对象参数
  private expectsSingleObjectParameter(tool: ToolExecutor): boolean {
    // 检查工具的参数定义
    const parameters = tool.metadata.parameters;
    if (!parameters || !parameters.properties) {
      return true; // 没有参数定义，默认传递单个对象
    }

    // 如果只有一个参数且类型为 object，则认为是单个对象参数
    const paramCount = Object.keys(parameters.properties).length;
    if (paramCount === 1) {
      const onlyParam = Object.values(parameters.properties)[0] as JsonSchema;
      return onlyParam.type === "object";
    }

    return false;
  }

  // 将对象参数转换为按顺序的参数数组
  private convertObjectToOrderedArguments(tool: ToolExecutor, args: Record<string, unknown>): unknown[] {
    const parameters = tool.metadata.parameters;
    if (!parameters || !parameters.properties) {
      return [args]; // 没有参数定义，返回原始对象
    }

    const orderedArgs: unknown[] = [];
    const paramNames = Object.keys(parameters.properties);

    // 按照参数定义的顺序构建参数数组
    for (const paramName of paramNames) {
      if (args[paramName] !== undefined) {
        orderedArgs.push(args[paramName]);
      } else {
        // 处理可选参数，使用默认值或 undefined
        const paramSchema = parameters.properties[paramName] as JsonSchema;
        if (paramSchema.default !== undefined) {
          orderedArgs.push(paramSchema.default);
        } else if (!parameters.required.includes(paramName)) {
          orderedArgs.push(undefined);
        } else {
          throw new Error(`Missing required parameter: ${paramName}`);
        }
      }
    }

    return orderedArgs;
  }

  // 使用展开运算符调用函数的方法
  private invokeMethodWithArguments(handler: (...args: unknown[]) => unknown, args: unknown[]): unknown {
    return handler.apply(handler, args);
  }

  // 获取工具列表（用于调试）
  getToolList(): string[] {
    return Array.from(this.tools.keys());
  }

  // 获取特定工具的元数据
  getToolMetadata(toolName: string) {
    const tool = this.tools.get(toolName);
    return tool ? tool.metadata : null;
  }

  // 验证工具参数（公开方法，用于调试）
  validateTool(toolName: string, args: Record<string, unknown>): { isValid: boolean; errors: string[] } {
    return this.validateToolArguments(toolName, args);
  }

  // 获取工具执行统计信息
  getToolStats(): { totalTools: number; toolNames: string[] } {
    return {
      totalTools: this.tools.size,
      toolNames: this.getToolList(),
    };
  }

  // 启动 stdio MCP 服务器
  async startStdioServer() {
    if (!this.server) {
      throw new Error("MCP Server not initialized");
    }

    try {
      // 创建 stdio 传输层
      this.transport = new StdioServerTransport();

      // 连接服务器到传输层
      await this.server.connect(this.transport);

      console.log(`${this.name} v${this.version} started with stdio transport`);
      console.log(`Registered ${this.tools.size} tools`);
      console.log("MCP server is ready to accept requests");
    } catch (error) {
      this.handleError(error, "Failed to start stdio server");
    }
  }

  // 停止服务器
  async stopServer() {
    if (this.transport) {
      // MCP SDK 会自动处理连接关闭
      this.transport = undefined;
      console.log("MCP server stopped");
    }
  }

  // 增强的 run 方法，支持 stdio 传输
  async run() {
    // 保持原有的兼容性模式
    console.log(`Starting ${this.name} v${this.version} in compatibility mode`);
    console.log(`Registered ${this.tools.size} tools`);
    console.log('Use run({ transport: "stdio" }) for MCP protocol communication');
    this.setupToolRequestHandlers();
    await this.startStdioServer();
  }

  // 检查服务器状态
  isServerRunning(): boolean {
    return this.transport !== undefined;
  }

  private handleError(error: unknown, context: string): never {
    const message = error instanceof Error ? error.message : "Unknown error";
    const timestamp = new Date().toISOString();

    console.error(`[${timestamp}] [${context}] Error: ${message}`);

    if (error instanceof Error) {
      console.error(`Stack: ${error.stack}`);
    }

    throw new Error(`[${context}] ${message}`);
  }
}

// 类型推断函数：从运行时类型推断 JSON Schema
function inferTypeSchema(type: unknown): JsonSchema {
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

// Zod Schema 转 JSON Schema 的函数
function zodSchemaToJsonSchema(zodSchema: z.ZodType<unknown>): JsonSchema {
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
      properties[key] = zodSchemaToJsonSchema(field as z.ZodType<unknown>);

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

// 简化的参数提取函数：只从 @param 装饰器元数据中提取参数信息
function extractParameters(
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
