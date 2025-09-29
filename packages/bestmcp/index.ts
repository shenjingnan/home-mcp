import "reflect-metadata";
import fs from "node:fs";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  type CallToolRequest,
  CallToolRequestSchema,
  type CallToolResult,
  ListToolsRequestSchema,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";

// 类型定义
interface ToolMetadata {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, any>;
    required: string[];
  };
}

interface ResourceMetadata {
  uri: string;
  description: string;
  mimeType?: string;
}

interface PromptMetadata {
  name: string;
  description: string;
  arguments?: Record<string, any>;
}

// 参数类型定义
interface ParamTypeMetadata {
  name?: string;
  required: boolean;
  index: number;
  type?: string;
  schema?: any;
  description?: string;
  enum?: any[];
  items?: any;
  properties?: Record<string, any>;
}

// JSON Schema 类型定义
interface JsonSchema {
  type: string;
  description?: string;
  enum?: any[];
  items?: JsonSchema;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  default?: any;
}

// 元数据存储
const TOOLS_METADATA = Symbol("tools");
const RESOURCES_METADATA = Symbol("resources");
const PROMPTS_METADATA = Symbol("prompts");

// 工具装饰器
export function tool(options?: { name?: string; description?: string }) {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    if (!descriptor || !target) {
      console.warn(`Tool decorator: descriptor or target is undefined for ${propertyKey}`);
      return;
    }

    const existingTools = Reflect.getMetadata(TOOLS_METADATA, target.constructor) || [];

    // 获取参数类型信息
    const _paramTypes = Reflect.getMetadata("design:paramtypes", target, propertyKey) || [];
    console.log('_paramTypes', _paramTypes);
    const _returnType = Reflect.getMetadata("design:returntype", target, propertyKey);

    // 从函数签名和 JSDoc 提取参数信息，优先使用 @param 装饰器元数据
    const funcString = descriptor.value ? descriptor.value.toString() : "";
    const params = extractParameters(funcString, target, propertyKey, _paramTypes);

    const toolMetadata: ToolMetadata = {
      name: options?.name || propertyKey,
      description: options?.description || extractDescription(funcString),
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

// 参数装饰器 - 增强版本，支持类型信息
export function param(
  nameOrType?: string | JsonSchema,
  requiredOrDescription?: boolean | string,
  description?: string
) {
  return (target: any, propertyKey: string | symbol, parameterIndex: number) => {
    const existingParams = Reflect.getMetadata("tool:params", target, propertyKey) || [];
    
    // 解析参数
    let name: string | undefined;
    let required = true;
    let typeSchema: JsonSchema | undefined;
    let paramDescription: string | undefined;
    
    if (typeof nameOrType === 'string') {
      name = nameOrType;
      required = typeof requiredOrDescription === 'boolean' ? requiredOrDescription : true;
      paramDescription = typeof requiredOrDescription === 'string' ? requiredOrDescription : description;
    } else if (typeof nameOrType === 'object') {
      typeSchema = nameOrType;
      required = typeof requiredOrDescription === 'boolean' ? requiredOrDescription : true;
      paramDescription = description;
    } else {
      required = typeof requiredOrDescription === 'boolean' ? requiredOrDescription : true;
      paramDescription = description;
    }
    
    // 获取参数的运行时类型信息
    const paramTypes = Reflect.getMetadata("design:paramtypes", target, propertyKey) || [];
    const paramType = paramTypes[parameterIndex];
    console.log('param paramType', paramType, nameOrType, name, required);
    
    // 如果没有提供类型schema，则从运行时类型推断
    if (!typeSchema) {
      typeSchema = inferTypeSchema(paramType);
    }
    
    existingParams[parameterIndex] = {
      name,
      required,
      index: parameterIndex,
      type: typeSchema.type,
      schema: typeSchema,
      description: paramDescription,
    };
    
    Reflect.defineMetadata("tool:params", existingParams, target, propertyKey);
  };
}

// 便捷的类型装饰器工厂函数
export function paramType<T>(type: JsonSchema) {
  return param(type);
}

// 字符串参数装饰器
export function paramString(name?: string, required?: boolean, description?: string) {
  return param({ ...inferTypeSchema(String), description }, required, name);
}

// 数字参数装饰器
export function paramNumber(name?: string, required?: boolean, description?: string) {
  return param({ ...inferTypeSchema(Number), description }, required, name);
}

// 布尔参数装饰器
export function paramBoolean(name?: string, required?: boolean, description?: string) {
  return param({ ...inferTypeSchema(Boolean), description }, required, name);
}

// 对象参数装饰器
export function paramObject(name?: string, required?: boolean, properties?: Record<string, JsonSchema>, description?: string) {
  return param({ 
    type: "object", 
    properties, 
    required: properties ? Object.keys(properties) : [],
    description 
  }, required, name);
}

// 数组参数装饰器
export function paramArray(name?: string, required?: boolean, items?: JsonSchema, description?: string) {
  return param({ 
    type: "array", 
    items: items || { type: "string" }, 
    description 
  }, required, name);
}

// 枚举参数装饰器
export function paramEnum<T>(name: string, values: T[], required?: boolean, description?: string) {
  return param({ 
    type: "string", 
    enum: values, 
    description 
  }, required, name);
}

// 资源装饰器
export function resource(uri: string, options?: { mimeType?: string; description?: string }) {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    if (!descriptor || !target) {
      console.warn(`Resource decorator: descriptor or target is undefined for ${propertyKey}`);
      return;
    }

    const existingResources = Reflect.getMetadata(RESOURCES_METADATA, target.constructor) || [];

    const funcString = descriptor.value ? descriptor.value.toString() : "";
    const resourceMetadata: ResourceMetadata = {
      uri,
      description: options?.description || extractDescription(funcString),
      mimeType: options?.mimeType,
    };

    existingResources.push({
      metadata: resourceMetadata,
      method: descriptor.value,
      propertyKey,
    });

    Reflect.defineMetadata(RESOURCES_METADATA, existingResources, target.constructor);
  };
}

// 提示装饰器
export function prompt(options?: { name?: string; description?: string }) {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    if (!descriptor || !target) {
      console.warn(`Prompt decorator: descriptor or target is undefined for ${propertyKey}`);
      return;
    }

    const existingPrompts = Reflect.getMetadata(PROMPTS_METADATA, target.constructor) || [];

    const funcString = descriptor.value ? descriptor.value.toString() : "";
    const params = extractParameters(funcString);

    const promptMetadata: PromptMetadata = {
      name: options?.name || propertyKey,
      description: options?.description || extractDescription(funcString),
      arguments: params.properties,
    };

    existingPrompts.push({
      metadata: promptMetadata,
      method: descriptor.value,
      propertyKey,
    });

    Reflect.defineMetadata(PROMPTS_METADATA, existingPrompts, target.constructor);
  };
}

export class BestMCP {
  private name: string;
  private version: string;
  private tools: Map<string, any> = new Map();
  private resources: Map<string, any> = new Map();
  private prompts: Map<string, any> = new Map();
  private server?: Server;
  private transport?: StdioServerTransport;

  constructor(name: string, version: string = "1.0.0") {
    this.name = name;
    this.version = version;
    this.initializeMCPServer();
  }

  private initializeMCPServer() {
    console.log("initializeMCPServer");
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
    fs.writeFileSync(
      "/Users/nemo/github/shenjingnan/home-mcp/list-tools-request.json",
      JSON.stringify(this.getTools().map(this.convertToMCPTool), null, 2),
    );

    // 工具列表请求处理器
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

  private convertToMCPTool(tool: any): Tool {
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
  register(serviceClass: new () => any) {
    const instance = new serviceClass();

    // 注册工具
    const tools = Reflect.getMetadata(TOOLS_METADATA, serviceClass) || [];
    tools.forEach((tool: any) => {
      this.tools.set(tool.metadata.name, {
        metadata: tool.metadata,
        handler: tool.method.bind(instance),
      });
    });

    // 注册资源
    const resources = Reflect.getMetadata(RESOURCES_METADATA, serviceClass) || [];
    resources.forEach((resource: any) => {
      this.resources.set(resource.metadata.uri, {
        metadata: resource.metadata,
        handler: resource.method.bind(instance),
      });
    });

    // 注册提示
    const prompts = Reflect.getMetadata(PROMPTS_METADATA, serviceClass) || [];
    prompts.forEach((prompt: any) => {
      this.prompts.set(prompt.metadata.name, {
        metadata: prompt.metadata,
        handler: prompt.method.bind(instance),
      });
    });
  }

  // 获取所有工具定义
  getTools() {
    return Array.from(this.tools.values()).map((tool) => tool.metadata);
  }

  // 验证工具参数
  private validateToolArguments(toolName: string, args: any): { isValid: boolean; errors: string[] } {
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

    // 检查参数类型
    for (const [paramName, paramSchema] of Object.entries(properties)) {
      if (args[paramName] !== undefined && args[paramName] !== null) {
        const expectedType = (paramSchema as any).type;
        const actualType = typeof args[paramName];

        // 如果类型是 'any'，则跳过类型检查
        if (expectedType && expectedType !== "any" && actualType !== expectedType) {
          errors.push(`Parameter ${paramName} should be ${expectedType}, got ${actualType}`);
        }
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

    return { isValid: errors.length === 0, errors };
  }

  // 执行工具
  async executeTool(name: string, args: any) {
    const tool = this.tools.get(name);
    fs.writeFileSync(
      "/Users/nemo/github/shenjingnan/home-mcp/execute-tool-request.json",
      JSON.stringify({ tool, name, args }, null, 2),
    );
    console.log("call tool", tool, name, args);
    if (!tool) {
      throw new Error(`Tool ${name} not found`);
    }

    // 参数验证
    const validation = this.validateToolArguments(name, args);
    if (!validation.isValid) {
      const errorMsg = `Invalid arguments for tool ${name}: ${validation.errors.join(", ")}`;
      console.error(errorMsg);
      throw new Error(errorMsg);
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
  private mapArgumentsToObject(tool: any, args: any): any {
    // 如果方法期望单个对象参数，直接返回
    if (this.expectsSingleObjectParameter(tool)) {
      return args;
    }

    // 将对象参数转换为按顺序的参数数组
    return this.convertObjectToOrderedArguments(tool, args);
  }

  // 检查方法是否期望单个对象参数
  private expectsSingleObjectParameter(tool: any): boolean {
    // 检查工具的参数定义
    const parameters = tool.metadata.parameters;
    if (!parameters || !parameters.properties) {
      return true; // 没有参数定义，默认传递单个对象
    }

    // 如果只有一个参数且类型为 object，则认为是单个对象参数
    const paramCount = Object.keys(parameters.properties).length;
    if (paramCount === 1) {
      const onlyParam = Object.values(parameters.properties)[0] as any;
      return onlyParam.type === "object";
    }

    return false;
  }

  // 将对象参数转换为按顺序的参数数组
  private convertObjectToOrderedArguments(tool: any, args: any): any[] {
    const parameters = tool.metadata.parameters;
    if (!parameters || !parameters.properties) {
      return [args]; // 没有参数定义，返回原始对象
    }

    const orderedArgs: any[] = [];
    const paramNames = Object.keys(parameters.properties);

    // 按照参数定义的顺序构建参数数组
    for (const paramName of paramNames) {
      if (args[paramName] !== undefined) {
        orderedArgs.push(args[paramName]);
      } else {
        // 处理可选参数，使用默认值或 undefined
        const paramSchema = parameters.properties[paramName] as any;
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
  private invokeMethodWithArguments(handler: Function, args: any[]): any {
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
  validateTool(toolName: string, args: any): { isValid: boolean; errors: string[] } {
    return this.validateToolArguments(toolName, args);
  }

  // 获取工具执行统计信息
  getToolStats(): { totalTools: number; toolNames: string[] } {
    return {
      totalTools: this.tools.size,
      toolNames: this.getToolList(),
    };
  }

  // 获取资源
  async getResource(uri: string) {
    const resource = this.resources.get(uri);
    if (!resource) {
      throw new Error(`Resource ${uri} not found`);
    }
    return await resource.handler();
  }

  // 获取提示
  async getPrompt(name: string, args?: any) {
    const prompt = this.prompts.get(name);
    if (!prompt) {
      throw new Error(`Prompt ${name} not found`);
    }
    return await prompt.handler(args);
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
    console.log(`Registered ${this.resources.size} resources`);
    console.log(`Registered ${this.prompts.size} prompts`);
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

// 辅助函数：提取函数描述
function extractDescription(funcString: string): string {
  const match = funcString.match(/\/\*\*([\s\S]*?)\*\//);
  if (match) {
    return match[1]
      .split("\n")
      .map((line) => line.replace(/^\s*\*\s?/, "").trim())
      .filter((line) => line && !line.startsWith("@"))
      .join(" ")
      .trim();
  }
  return "";
}

// 类型推断函数：从运行时类型推断 JSON Schema
function inferTypeSchema(type: any): JsonSchema {
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
  if (type.name) {
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

// 辅助函数：从装饰器元数据中提取参数信息
function extractParametersFromMetadata(
  target: any,
  propertyKey: string,
  paramTypes: any[],
): {
  properties: Record<string, any>;
  required: string[];
} {
  const properties: Record<string, any> = {};
  const required: string[] = [];

  // 获取 @param 装饰器存储的参数元数据
  const paramMetadata = Reflect.getMetadata("tool:params", target, propertyKey) || [];

  // 如果有 @param 装饰器元数据，优先使用它
  if (paramMetadata.length > 0) {
    paramMetadata.forEach((param: ParamTypeMetadata, index: number) => {
      if (param) {
        // 尝试从函数签名中获取参数名作为后备
        let paramName = param.name;
        if (!paramName) {
          // 从目标对象的函数签名中获取参数名
          const descriptor = Object.getOwnPropertyDescriptor(target, propertyKey);
          if (descriptor?.value) {
            const funcString = descriptor.value.toString();
            const paramMatch = funcString.match(/\(([^)]*)\)/);
            if (paramMatch) {
              const params = paramMatch[1]
                .split(",")
                .map((p: string) => p.trim())
                .filter((p: string) => p);

              if (params[index]) {
                const paramParts = params[index].split(":");
                const namePart = paramParts[0].trim();
                paramName = namePart
                  .replace(/@param\([^)]*\)\s*/g, "")
                  .replace(/\?/g, "")
                  .replace(/=.*/, "")
                  .trim();
              }
            }
          }
        }

        // 如果仍然没有获取到参数名，使用默认名称
        if (!paramName) {
          paramName = `param${index}`;
        }

        // 优先使用装饰器提供的 schema，否则从运行时类型推断
        let schema: JsonSchema;
        if (param.schema) {
          schema = param.schema;
        } else {
          const paramType = paramTypes[index];
          schema = inferTypeSchema(paramType);
        }

        // 添加描述信息
        if (param.description) {
          schema.description = param.description;
        }

        properties[paramName] = schema;

        // 如果参数标记为必需，则添加到 required 数组
        if (param.required !== false) {
          required.push(paramName);
        }
      }
    });
  }

  return { properties, required };
}

// 辅助函数：提取参数信息
function extractParameters(
  funcString: string,
  target?: any,
  propertyKey?: string,
  paramTypes?: any[],
): {
  properties: Record<string, any>;
  required: string[];
} {
  // 优先尝试从 @param 装饰器元数据中提取参数信息
  if (target && propertyKey && paramTypes) {
    const metadataResult = extractParametersFromMetadata(target, propertyKey, paramTypes);
    if (Object.keys(metadataResult.properties).length > 0) {
      return metadataResult;
    }
  }

  // 回退到原有的函数签名解析逻辑
  const properties: Record<string, any> = {};
  const required: string[] = [];

  // 改进的参数提取逻辑，从函数签名中解析参数
  const paramMatch = funcString.match(/\(([^)]*)\)/);
  if (paramMatch) {
    const params = paramMatch[1]
      .split(",")
      .map((p) => p.trim())
      .filter((p) => p);

    params.forEach((param, _index) => {
      // 提取参数名和类型
      const paramParts = param.split(":");
      const namePart = paramParts[0].trim();
      const typePart = paramParts[1] ? paramParts[1].trim() : "any";

      // 处理参数名（移除装饰器语法和可选标记）
      const cleanName = namePart
        .replace(/@param\([^)]*\)\s*/g, "") // 移除 @param 装饰器
        .replace(/\?/g, "") // 移除可选标记
        .replace(/=.*/, "") // 移除默认值
        .trim();

      // 处理类型
      const cleanType = typePart
        .replace(/=.*/, "") // 移除默认值
        .trim();

      const isOptional = namePart.includes("?") || param.includes("=");

      if (cleanName) {
        properties[cleanName] = {
          type: mapTypeScriptTypeToJsonSchema(cleanType),
        };

        if (!isOptional) {
          required.push(cleanName);
        }
      }
    });
  }

  return { properties, required };
}

// 类型映射
function mapTypeScriptTypeToJsonSchema(tsType: string): string {
  const typeMap: Record<string, string> = {
    string: "string",
    number: "number",
    boolean: "boolean",
    object: "object",
    array: "array",
    any: "any",
  };

  return typeMap[tsType.toLowerCase()] || "string";
}
