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
const TOOL_PARAM_METADATA = Symbol("tool:params");

// 工具装饰器
export function tool(options?: { name?: string; description?: string }) {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    if (!descriptor || !target) {
      console.warn(
        `Tool decorator: descriptor or target is undefined for ${propertyKey}`
      );
      return;
    }

    const existingTools =
      Reflect.getMetadata(TOOLS_METADATA, target.constructor) || [];

    // 获取参数类型信息
    const _paramTypes =
      Reflect.getMetadata("design:paramtypes", target, propertyKey) || [];

    const params = extractParameters(
      target,
      propertyKey,
      _paramTypes
    );

    const toolMetadata: ToolMetadata = {
      name: options?.name || propertyKey,
      description: options?.description || '',
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
export function param(options: {
  name?: string,
  required: boolean,
  description?: string
} = { required: true }
) {
  return (
    target: any,
    propertyKey: string | symbol,
    parameterIndex: number
  ) => {
    const { name, required, description } = options;

    const existingParams =
      Reflect.getMetadata(TOOL_PARAM_METADATA, target, propertyKey) || [];

    // 获取参数的运行时类型信息
    const paramTypes =
      Reflect.getMetadata("design:paramtypes", target, propertyKey) || [];
    const paramType = paramTypes[parameterIndex];

    existingParams[parameterIndex] = {
      name,
      required,
      index: parameterIndex,
      type: paramType?.type,
      schema: paramType,
      description,
    };

    Reflect.defineMetadata(TOOL_PARAM_METADATA, existingParams, target, propertyKey);
  };
}

export class BestMCP {
  private name: string;
  private version: string;
  private tools: Map<string, any> = new Map();
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
      }
    );
  }

  private setupToolRequestHandlers() {
    if (!this.server) return;
    fs.writeFileSync(
      "/Users/nemo/github/shenjingnan/home-mcp/list-tools-request.json",
      JSON.stringify(this.getTools().map(this.convertToMCPTool), null, 2)
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

  private async handleToolCall(
    request: CallToolRequest
  ): Promise<CallToolResult> {
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
            text: `Error: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
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
  }

  // 获取所有工具定义
  getTools() {
    return Array.from(this.tools.values()).map((tool) => tool.metadata);
  }

  // 验证工具参数
  private validateToolArguments(
    toolName: string,
    args: any
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

    // 检查参数类型
    for (const [paramName, paramSchema] of Object.entries(properties)) {
      if (args[paramName] !== undefined && args[paramName] !== null) {
        const expectedType = (paramSchema as any).type;
        const actualType = typeof args[paramName];

        // 如果类型是 'any'，则跳过类型检查
        if (
          expectedType &&
          expectedType !== "any" &&
          actualType !== expectedType
        ) {
          errors.push(
            `Parameter ${paramName} should be ${expectedType}, got ${actualType}`
          );
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
      JSON.stringify({ tool, name, args }, null, 2)
    );
    console.log("call tool", tool, name, args);
    if (!tool) {
      throw new Error(`Tool ${name} not found`);
    }

    // 参数验证
    const validation = this.validateToolArguments(name, args);
    if (!validation.isValid) {
      const errorMsg = `Invalid arguments for tool ${name}: ${validation.errors.join(
        ", "
      )}`;
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
  validateTool(
    toolName: string,
    args: any
  ): { isValid: boolean; errors: string[] } {
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
    console.log(
      'Use run({ transport: "stdio" }) for MCP protocol communication'
    );
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

// 简化的参数提取函数：只从 @param 装饰器元数据中提取参数信息
function extractParameters(
  target?: any,
  propertyKey?: string,
  paramTypes?: any[]
): {
  properties: Record<string, any>;
  required: string[];
} {
  const properties: Record<string, any> = {};
  const required: string[] = [];

  // 如果没有提供必要参数，返回空结果
  if (!target || !propertyKey || !paramTypes) {
    return { properties, required };
  }

  // 获取 @param 装饰器存储的参数元数据
  const paramMetadata =
    Reflect.getMetadata(TOOL_PARAM_METADATA, target, propertyKey) || [];

  // 处理每个装饰器提供的参数信息
  paramMetadata.forEach((param: ParamTypeMetadata, index: number) => {
    if (param) {
      // 使用装饰器提供的参数名，如果没有则使用默认名称
      const paramName = param.name || `param${index}`;

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

  return { properties, required };
}
