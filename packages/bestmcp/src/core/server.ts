import type { z } from "zod";
import "reflect-metadata";
import type { Server as HttpServer, IncomingMessage, ServerResponse } from "node:http";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  type CallToolRequest,
  CallToolRequestSchema,
  type CallToolResult,
  ListToolsRequestSchema,
  type Tool as MCPSDKTool,
} from "@modelcontextprotocol/sdk/types.js";
import { ToolNotFoundError, ToolValidationError, ZodValidationError } from "./errors.js";
import { TransportManager } from "./transport-manager.js";
import {
  type BaseTransport,
  type HTTPTransport,
  type HTTPTransportConfig,
  type TransportConfig,
  TransportType,
} from "./transports/index.js";
import {
  type BestMCPConfig,
  type JsonSchema,
  type ParamTypeMetadata,
  type RunOptions,
  TOOL_PARAM_METADATA,
  TOOLS_METADATA,
  type ToolExecutor,
  type ToolMetadata,
} from "./types.js";

export class BestMCP {
  private name: string;
  private version: string;
  private tools: Map<string, ToolExecutor> = new Map();
  private server?: Server;
  private transportManager: TransportManager;
  private currentTransport?: BaseTransport;
  private httpServer?: HttpServer; // HTTP 服务器实例

  constructor(config: BestMCPConfig) {
    this.transportManager = new TransportManager();

    this.name = config.name || "bestmcp";
    this.version = config.version || "0.0.1";

    this.initializeMCPServer(config);
  }

  private initializeMCPServer(config?: BestMCPConfig) {
    this.server = new Server(
      {
        name: this.name,
        version: this.version,
      },
      {
        capabilities: config?.capabilities || {
          tools: {},
        },
        ...(config?.instructions && { instructions: config.instructions }),
      },
    );
  }

  private async initializeTransport(transportType: string, options: RunOptions = {}): Promise<void> {
    const config: TransportConfig = this.createTransportConfig(transportType, options);
    this.currentTransport = await this.transportManager.createTransport(config);
    await this.transportManager.setCurrentTransport(this.currentTransport);
  }

  private createTransportConfig(transportType: string, options: RunOptions): TransportConfig {
    switch (transportType) {
      case "stdio":
        return { type: TransportType.STDIO };

      case "http":
        return {
          type: TransportType.HTTP,
          options: {
            enableJsonResponse: true, // HTTP 模式使用 JSON 响应
            port: options.port || 8000,
            host: options.host || "127.0.0.1",
          },
        } as HTTPTransportConfig;

      default:
        throw new Error(`不支持的传输层类型: ${transportType}`);
    }
  }

  private setupToolRequestHandlers() {
    if (!this.server) return;

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
        throw new Error("缺少必需的参数");
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
            text: `错误: ${error instanceof Error ? error.message : "未知错误"}`,
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
    console.log(JSON.stringify(tools, null, 2));
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
      return { isValid: false, errors: [`未找到工具 ${toolName}`] };
    }

    const errors: string[] = [];
    const { parameters } = tool.metadata;
    const { required, properties } = parameters;

    // 检查必需参数
    for (const paramName of required) {
      if (args[paramName] === undefined || args[paramName] === null) {
        errors.push(`缺少必需参数: ${paramName}`);
      }
    }

    // 检查未知参数
    const knownParams = Object.keys(properties);
    const providedParams = Object.keys(args);
    for (const paramName of providedParams) {
      if (!knownParams.includes(paramName)) {
        errors.push(`未知参数: ${paramName}`);
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
      return { isValid: false, errors: [`未找到工具 ${toolName}`] };
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
            errors.push(`参数 ${paramName}: Zod 验证失败 - ${error instanceof Error ? error.message : "未知错误"}`);
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
      const errorMsg = `工具 ${name} 的参数无效: ${validation.errors.join(", ")}`;
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
      // 对于单个对象参数，需要提取实际的对象值
      const parameters = tool.metadata.parameters;
      if (parameters?.properties && Object.keys(parameters.properties).length === 1) {
        const paramName = Object.keys(parameters.properties)[0];
        if (paramName) {
          return args[paramName] as Record<string, unknown>;
        }
      }
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
      if (args[paramName] !== undefined && args[paramName] !== null) {
        orderedArgs.push(args[paramName]);
      } else {
        // 处理可选参数，使用默认值或 undefined
        const paramSchema = parameters.properties[paramName] as JsonSchema;
        if (paramSchema.default !== undefined) {
          orderedArgs.push(paramSchema.default);
        } else if (!parameters.required.includes(paramName)) {
          orderedArgs.push(undefined);
        } else {
          throw new Error(`缺少必需参数: ${paramName}`);
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

  // 增强的 run 方法，支持运行时选择传输层
  async run(options: RunOptions = {}): Promise<void> {
    const transportType = options.transport || "stdio";

    // 设置工具请求处理器
    this.setupToolRequestHandlers();

    // 初始化传输层
    await this.initializeTransport(transportType, options);

    // 启动传输层
    await this.transportManager.startCurrentTransport(this.server!);

    // 如果是 HTTP 传输，启动 HTTP 服务器
    if (transportType === "http") {
      await this.startHTTPServer(options);
    }

    console.log(`${this.name} v${this.version} 已启动`);
    console.log(`传输层: ${transportType}`);
    console.log(`已注册 ${this.tools.size} 个工具`);
  }

  private async startHTTPServer(options: RunOptions): Promise<void> {
    const http = await import("node:http");
    const port = options.port || 8000;
    const host = options.host || "127.0.0.1";
    const path = "/mcp";

    const server = http.createServer(async (req, res) => {
      // 只处理 POST 请求到 /mcp 路径
      if (req.method === "POST" && req.url === path) {
        let body = "";
        req.on("data", (chunk) => {
          body += chunk.toString();
        });

        req.on("end", async () => {
          try {
            const parsedBody = JSON.parse(body);
            await this.handleHTTPRequest(req, res, parsedBody);
          } catch (_error) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Invalid JSON" }));
          }
        });
      } else {
        res.writeHead(404).end();
      }
    });

    server.listen(port, host, () => {
      console.log(`MCP Server listening on http://${host}:${port}${path}`);
    });

    // 保存服务器实例以便后续清理
    this.httpServer = server;
  }

  // HTTP 请求处理方法
  async handleHTTPRequest(req: IncomingMessage, res: ServerResponse, parsedBody?: unknown): Promise<void> {
    if (this.currentTransport && this.currentTransport.type === TransportType.HTTP) {
      const httpTransport = this.currentTransport as HTTPTransport; // 类型转换，因为我们需要访问其内部方法
      await httpTransport.handleRequest(req, res, parsedBody);
    } else {
      throw new Error("当前传输层不是 HTTP 类型");
    }
  }

  // 停止服务器
  async stopServer() {
    // 停止传输层管理器
    await this.transportManager.stopCurrentTransport();

    // 关闭 HTTP 服务器
    if (this.httpServer) {
      this.httpServer.close();
      (this.httpServer as HttpServer | undefined) = undefined;
    }
  }

  // 启动 stdio MCP 服务器（兼容性方法）
  async startStdioServer(): Promise<void> {
    await this.run({ transport: "stdio" });
  }

  // 检查服务器状态
  isServerRunning(): boolean {
    return this.transportManager.getCurrentTransportStatus()?.isRunning || false;
  }

  // 获取当前传输层状态
  getTransportStatus(): {
    type: TransportType;
    isRunning: boolean;
    details?: Record<string, unknown>;
  } | null {
    return this.transportManager.getCurrentTransportStatus();
  }

  // 获取传输层统计信息
  getTransportStats(): {
    registeredTypes: TransportType[];
    currentType?: TransportType;
    isRunning: boolean;
  } {
    return this.transportManager.getStats();
  }
}
