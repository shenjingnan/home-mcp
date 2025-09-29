import "reflect-metadata";

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

// 元数据存储
const TOOLS_METADATA = Symbol("tools");
const RESOURCES_METADATA = Symbol("resources");
const PROMPTS_METADATA = Symbol("prompts");

// 工具装饰器
export function tool(options?: { name?: string; description?: string }) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const existingTools =
      Reflect.getMetadata(TOOLS_METADATA, target.constructor) || [];

    // 获取参数类型信息
    const paramTypes =
      Reflect.getMetadata("design:paramtypes", target, propertyKey) || [];
    const returnType = Reflect.getMetadata(
      "design:returntype",
      target,
      propertyKey
    );

    // 从函数签名和 JSDoc 提取参数信息
    const funcString = descriptor.value.toString();
    const params = extractParameters(funcString);

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

// 资源装饰器
export function resource(
  uri: string,
  options?: { mimeType?: string; description?: string }
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const existingResources =
      Reflect.getMetadata(RESOURCES_METADATA, target.constructor) || [];

    const funcString = descriptor.value.toString();
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

    Reflect.defineMetadata(
      RESOURCES_METADATA,
      existingResources,
      target.constructor
    );
  };
}

// 提示装饰器
export function prompt(options?: { name?: string; description?: string }) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const existingPrompts =
      Reflect.getMetadata(PROMPTS_METADATA, target.constructor) || [];

    const funcString = descriptor.value.toString();
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

    Reflect.defineMetadata(
      PROMPTS_METADATA,
      existingPrompts,
      target.constructor
    );
  };
}

export class BestMCP {
  private name: string;
  private version: string;
  private tools: Map<string, any> = new Map();
  private resources: Map<string, any> = new Map();
  private prompts: Map<string, any> = new Map();

  constructor(name: string, version: string = "1.0.0") {
    this.name = name;
    this.version = version;
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
    const resources =
      Reflect.getMetadata(RESOURCES_METADATA, serviceClass) || [];
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

  // 执行工具
  async executeTool(name: string, args: any) {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool ${name} not found`);
    }
    return await tool.handler(args);
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

  // 启动服务器
  run() {
    console.log(`Starting ${this.name} v${this.version}`);
    console.log(`Registered ${this.tools.size} tools`);
    console.log(`Registered ${this.resources.size} resources`);
    console.log(`Registered ${this.prompts.size} prompts`);

    // 这里可以集成实际的 MCP 服务器逻辑
    // 比如 stdio transport 或者其他传输方式
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

// 辅助函数：提取参数信息
function extractParameters(funcString: string): {
  properties: Record<string, any>;
  required: string[];
} {
  const properties: Record<string, any> = {};
  const required: string[] = [];

  // 简单的参数提取逻辑（实际项目中可能需要更复杂的解析）
  const paramMatch = funcString.match(/\(([^)]*)\)/);
  if (paramMatch) {
    const params = paramMatch[1]
      .split(",")
      .map((p) => p.trim())
      .filter((p) => p);

    params.forEach((param) => {
      const [name, type] = param.split(":").map((p) => p.trim());
      if (name && type) {
        const isOptional = param.includes("?") || param.includes("=");
        const cleanName = name.replace("?", "");
        const cleanType = type.split("=")[0].trim();

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
