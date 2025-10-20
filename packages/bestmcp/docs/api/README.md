# BestMCP API 参考文档

本文档提供 BestMCP 框架的完整 API 参考，包括所有类、接口、方法和类型定义。

## 目录

- [BestMCP 类](#bestmcp-类)
- [装饰器](#装饰器)
- [配置接口](#配置接口)
- [类型定义](#类型定义)
- [错误类](#错误类)
- [传输层接口](#传输层接口)

## BestMCP 类

BestMCP 是框架的核心类，负责 MCP 服务器的创建、配置和管理。

### 构造函数

```typescript
constructor(name: string, version: string = "1.0.0")
```

创建一个新的 BestMCP 实例。

**参数：**
- `name` (string): 服务名称，用于标识 MCP 服务器
- `version` (string, 可选): 服务版本号，默认 "1.0.0"

**示例：**
```typescript
const mcp = new BestMCP("my-service", "1.0.0");
```

### 主要方法

#### register()

```typescript
register<T>(serviceClass: new () => T): void
```

注册一个服务类，自动发现和注册其中带有 `@Tool` 装饰器的方法。

**参数：**
- `serviceClass`: 服务类构造函数

**示例：**
```typescript
class MathService {
  @Tool("计算两数之和")
  add(@Param(z.number()) a: number, @Param(z.number()) b: number) {
    return a + b;
  }
}

mcp.register(MathService);
```

#### run()

```typescript
async run(options?: RunOptions): Promise<void>
```

启动 MCP 服务器，支持多种传输层。

**参数：**
- `options` (RunOptions, 可选): 运行配置选项

**RunOptions 接口：**
```typescript
interface RunOptions {
  transport?: 'stdio' | 'http';  // 传输层类型，默认 'stdio'
  port?: number;                 // HTTP 服务器端口，默认 8000
  host?: string;                 // 服务器绑定地址，默认 '127.0.0.1'
}
```

**示例：**
```typescript
// stdio 模式（默认）
await mcp.run();

// HTTP 模式
await mcp.run({
  transport: 'http',
  port: 3000,
  host: '127.0.0.1'
});
```

#### startStdioServer()

```typescript
async startStdioServer(): Promise<void>
```

以 stdio 模式启动服务器。这是向后兼容的方法。

**示例：**
```typescript
await mcp.startStdioServer();
```

#### stopServer()

```typescript
async stopServer(): Promise<void>
```

停止当前运行的服务器。

**示例：**
```typescript
await mcp.stopServer();
```

### 状态查询方法

#### getTransportStatus()

```typescript
getTransportStatus(): TransportStatus | null
```

获取当前传输层的运行状态。

**返回：**
- 传输层状态对象或 null

**TransportStatus 接口：**
```typescript
interface TransportStatus {
  type: 'stdio' | 'http';
  isRunning: boolean;
  details: {
    transportType: string;
    description: string;
    config?: Record<string, any>;
    [key: string]: any;
  };
}
```

**示例：**
```typescript
const status = mcp.getTransportStatus();
if (status?.isRunning) {
  console.log(`服务器正在运行，传输层类型: ${status.type}`);
}
```

#### getTransportStats()

```typescript
getTransportStats(): TransportStats
```

获取传输层统计信息。

**返回：**
- 传输层统计对象

**TransportStats 接口：**
```typescript
interface TransportStats {
  registeredTypes: ('stdio' | 'http')[];
  currentType?: 'stdio' | 'http';
  isRunning: boolean;
}
```

#### isServerRunning()

```typescript
isServerRunning(): boolean
```

检查服务器是否正在运行。

**返回：**
- 布尔值表示服务器状态

**示例：**
```typescript
if (mcp.isServerRunning()) {
  console.log('服务器正在运行');
}
```

### 工具信息方法

#### getTools()

```typescript
getTools(): ToolMetadata[]
```

获取所有已注册工具的元数据。

**返回：**
- 工具元数据数组

#### getToolList()

```typescript
getToolList(): string[]
```

获取已注册工具的名称列表。

**返回：**
- 工具名称数组

#### getToolStats()

```typescript
getToolStats(): ToolStats
```

获取工具统计信息。

**返回：**
- 工具统计对象

**ToolStats 接口：**
```typescript
interface ToolStats {
  totalTools: number;
  toolsByService: Record<string, number>;
}
```

## 装饰器

### @Tool()

标记一个方法为 MCP 工具。

```typescript
@Tool(description?: string): MethodDecorator
```

**参数：**
- `description` (string, 可选): 工具描述

**示例：**
```typescript
class MathService {
  @Tool("计算两个数字的和")
  async add(a: number, b: number): Promise<number> {
    return a + b;
  }

  @Tool() // 描述可选
  async subtract(a: number, b: number): Promise<number> {
    return a - b;
  }
}
```

### @Param()

标记方法参数，指定验证规则和描述。

```typescript
@Param(zodSchema: ZodSchema, description?: string): ParameterDecorator
```

**参数：**
- `zodSchema` (ZodSchema): Zod 验证模式
- `description` (string, 可选): 参数描述

**示例：**
```typescript
class UserService {
  @Tool("创建用户")
  async createUser(
    @Param(z.string().min(2).max(50), "用户名") username: string,
    @Param(z.string().email(), "邮箱地址") email: string,
    @Param(z.string().min(8), "密码") password: string
  ): Promise<User> {
    // 实现逻辑
  }
}
```

## 配置接口

### RunOptions

服务器运行配置选项。

```typescript
interface RunOptions {
  transport?: 'stdio' | 'http';  // 传输层类型，默认 'stdio'
  port?: number;                 // HTTP 服务器端口，默认 8000
  host?: string;                 // 服务器绑定地址，默认 '127.0.0.1'
}
```

### BestMCPConfig

MCP 服务器配置接口。

```typescript
interface BestMCPConfig {
  name: string;                  // 服务名称
  version?: string;              // 服务版本，默认 '1.0.0'
  capabilities?: ServerCapabilities;  // MCP 服务器能力
  instructions?: string;         // 服务说明
}
```

## 类型定义

### ToolMetadata

工具元数据接口，包含工具的完整信息。

```typescript
interface ToolMetadata {
  name: string;                                    // 工具名称
  description: string;                             // 工具描述
  parameters: {                                    // 参数模式
    type: "object";
    properties: Record<string, JsonSchema>;
    required: string[];
  };
  serviceName?: string;                            // 所属服务名称
  methodName?: string;                             // 方法名称
  isAsync?: boolean;                               // 是否异步方法
}
```

### JsonSchema

JSON Schema 类型定义。

```typescript
interface JsonSchema {
  type: string;                    // 数据类型
  description?: string;            // 描述信息
  enum?: unknown[];               // 枚举值
  items?: JsonSchema;             // 数组元素类型
  properties?: Record<string, JsonSchema>;  // 对象属性
  required?: string[];            // 必需属性
  minimum?: number;               // 最小值
  maximum?: number;               // 最大值
  minLength?: number;             // 最小长度
  maxLength?: number;             // 最大长度
  pattern?: string;               // 正则表达式模式
  default?: unknown;              // 默认值
  format?: string;                // 格式（如 email, uuid 等）
}
```

### TransportStatus

传输层状态接口。

```typescript
interface TransportStatus {
  type: 'stdio' | 'http';         // 传输层类型
  isRunning: boolean;             // 是否运行中
  details: {                      // 详细信息
    transportType: string;        // 传输层类型名称
    description: string;          // 描述
    config?: Record<string, any>; // 配置信息
    [key: string]: any;           // 其他属性
  };
}
```

### TransportStats

传输层统计信息接口。

```typescript
interface TransportStats {
  registeredTypes: ('stdio' | 'http')[];  // 已注册的传输层类型
  currentType?: 'stdio' | 'http';         // 当前传输层类型
  isRunning: boolean;                      // 是否运行中
}
```

### ToolStats

工具统计信息接口。

```typescript
interface ToolStats {
  totalTools: number;                       // 工具总数
  toolsByService: Record<string, number>;   // 按服务分组的工具数量
}
```

## 错误类

### ToolValidationError

工具参数验证错误。

```typescript
class ToolValidationError extends Error {
  constructor(
    public toolName: string,         // 工具名称
    public parameterName?: string,   // 参数名称
    message?: string                 // 错误消息
  );
}
```

### ToolNotFoundError

工具未找到错误。

```typescript
class ToolNotFoundError extends Error {
  constructor(public toolName: string);  // 工具名称
}
```

### ZodValidationError

Zod 验证错误。

```typescript
class ZodValidationError extends Error {
  constructor(
    public parameterName: string,    // 参数名称
    public zodErrors: z.ZodError     // Zod 错误对象
  );
}
```

## 传输层接口

### 传输层类型

```typescript
type TransportType = 'stdio' | 'http';
```

### 传输层配置

```typescript
interface TransportConfig {
  type: TransportType;               // 传输层类型
  options?: Record<string, any>;     // 传输层特定选项
}
```

### HTTP 传输层配置

```typescript
interface HTTPTransportConfig extends TransportConfig {
  type: 'http';
  options?: {
    enableJsonResponse?: boolean;    // 启用 JSON 响应
    port?: number;                   // 端口号
    host?: string;                   // 主机地址
    path?: string;                   // 请求路径
    [key: string]: any;              // 其他选项
  };
}
```

## 使用示例

### 完整的服务器创建示例

```typescript
import { BestMCP, Tool, Param } from 'bestmcp';
import { z } from 'zod';

// 定义服务
class CalculatorService {
  @Tool("计算两个数字的和")
  add(
    @Param(z.number(), "第一个数字") a: number,
    @Param(z.number(), "第二个数字") b: number
  ): number {
    return a + b;
  }

  @Tool("计算数字的平方根")
  sqrt(
    @Param(z.number().positive(), "正数") num: number
  ): number {
    return Math.sqrt(num);
  }
}

// 创建服务器
const mcp = new BestMCP("calculator", "1.0.0");
mcp.register(CalculatorService);

// 启动服务器
try {
  await mcp.run({ transport: 'http', port: 3000 });

  // 检查状态
  console.log('服务器状态:', mcp.getTransportStatus());
  console.log('工具统计:', mcp.getToolStats());

} catch (error) {
  console.error('启动失败:', error);
}
```

### 工具执行示例

```typescript
// 注册工具后，可以通过程序执行工具
const result = await mcp.executeTool("add", { a: 5, b: 3 });
console.log(result); // 8
```

### 验证工具示例

```typescript
// 验证工具参数（不执行）
try {
  mcp.validateTool("add", { a: 5, b: 3 });
  console.log('参数验证通过');
} catch (error) {
  console.error('参数验证失败:', error.message);
}
```

## 更多信息

- [传输层支持指南](../TRANSPORT_GUIDE.md)
- [迁移指南](../MIGRATION.md)
- [示例代码](../examples/)