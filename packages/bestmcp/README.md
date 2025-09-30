# BestMCP - 基于 TypeScript 装饰器的 MCP 服务器框架

BestMCP 是一个为 TypeScript 设计的 Model Context Protocol (MCP) 服务器框架，通过装饰器和 Zod 验证提供类型安全的工具声明方式。它简化了 MCP 服务器的开发流程，让开发者能够以声明式的方式定义工具和参数验证。

## 项目介绍

### 核心理念

BestMCP 的设计理念是提供类似 FastMCP 的开发体验，但专为 TypeScript/Node.js 生态系统打造。通过 TypeScript 装饰器语法和 Zod 验证库，实现了：

- **类型安全**：编译时类型检查和运行时验证双重保障
- **开发体验**：简洁直观的装饰器 API，减少样板代码
- **自动化**：自动生成 MCP 工具描述、参数验证和错误处理
- **扩展性**：支持复杂参数类型和高级功能配置

### 与 @modelcontextprotocol/sdk 的关系

BestMCP 是基于官方 `@modelcontextprotocol/sdk` 构建的高级框架，提供了：

- 更简洁的 API 接口
- 自动化的工具注册和参数验证
- 装饰器驱动的开发体验
- 类型安全的工具定义

## 主要功能特性

### 🎯 装饰器系统

```typescript
@Tool("计算两个数字的和")
async add(
  @Param(z.number(), "第一个数字") a: number,
  @Param(z.number(), "第二个数字") b: number
): Promise<number> {
  return a + b;
}
```

### 🛡️ 参数验证（基于 Zod）

```typescript
@Tool("创建用户")
async createUser(
  @Param(z.string().min(2).max(50), "用户名") username: string,
  @Param(z.string().email(), "邮箱地址") email: string,
  @Param(z.string().min(8), "密码") password: string
): Promise<User> {
  // 实现逻辑
}
```

### 🔄 自动 JSON Schema 生成

BestMCP 自动将 Zod Schema 转换为 MCP 协议所需的 JSON Schema，包括：

- 类型推断和约束验证
- 必填/可选参数自动识别
- 枚举值和数组元素类型处理
- 描述信息自动附加

### 🚀 MCP 协议支持

- 完全兼容 MCP 协议规范
- 支持 stdio 传输层
- 自动错误处理和响应格式化
- 工具发现和调用处理

### 📝 类型安全的工具定义

- 完整的 TypeScript 类型支持
- 智能参数推断和验证
- 编译时错误检查
- 运行时类型保护

## 安装和使用示例

### 安装

```bash
npm install bestmcp
# 或
pnpm add bestmcp
```

### 基础使用示例

```typescript
import { BestMCP, Tool, Param } from 'bestmcp';
import { z } from 'zod';

// 定义服务类
class MathService {
  @Tool("计算两个数字的和")
  async add(
    @Param(z.number(), "第一个数字") a: number,
    @Param(z.number(), "第二个数字") b: number
  ): Promise<number> {
    return a + b;
  }

  @Tool("计算数字的平方根")
  async sqrt(
    @Param(z.number().positive(), "正数") num: number
  ): Promise<number> {
    return Math.sqrt(num);
  }
}

// 创建并启动 MCP 服务器
const mcp = new BestMCP("math-service", "1.0.0");
mcp.register(MathService);

// 启动服务器
await mcp.run();
```

### 高级用法示例

```typescript
import { BestMCP, Tool, Param } from 'bestmcp';
import { z } from 'zod';

class UserService {
  @Tool("获取用户信息")
  async getUser(
    @Param(z.string().uuid(), "用户UUID") userId: string
  ): Promise<User> {
    return await this.userRepository.findById(userId);
  }

  @Tool("搜索用户")
  async searchUsers(
    @Param(z.string().min(1), "搜索关键词") query: string,
    @Param(z.object({
      page: z.number().min(1).default(1),
      size: z.number().min(1).max(100).default(10),
      sortBy: z.enum(['name', 'email', 'createdAt']).default('name'),
      sortOrder: z.enum(['asc', 'desc']).default('asc')
    }), "分页和排序选项") options: SearchOptions = {}
  ): Promise<SearchResult<User>> {
    return await this.userRepository.search(query, options);
  }

  @Tool("批量操作用户")
  async batchUpdateUsers(
    @Param(z.array(z.string().uuid()).min(1).max(100), "用户ID列表") userIds: string[],
    @Param(z.object({
      status: z.enum(['active', 'inactive', 'suspended']),
      role: z.string().optional()
    }), "更新数据") updates: BatchUpdateRequest
  ): Promise<BatchResult> {
    return await this.userRepository.batchUpdate(userIds, updates);
  }
}

const mcp = new BestMCP("user-service", "1.0.0");
mcp.register(UserService);
await mcp.run();
```

### 预定义 Schema 组合

```typescript
// 常用 Schema 预设
export const CommonSchemas = {
  id: z.string().uuid().describe("唯一标识符"),
  email: z.string().email().describe("邮箱地址"),
  pagination: z.object({
    page: z.number().min(1).default(1).describe("页码"),
    size: z.number().min(1).max(100).default(10).describe("每页大小")
  }).describe("分页参数")
};

// 使用预设
class DataService {
  @Tool("查询数据")
  async queryData(
    @Param(CommonSchemas.id, "数据ID") id: string,
    @Param(CommonSchemas.pagination, "分页参数") pagination: PaginationOptions
  ): Promise<QueryResult> {
    // 实现逻辑
  }
}
```

## API 文档

### BestMCP 类

#### 构造函数

```typescript
constructor(name: string, version: string = "1.0.0")
```

**参数：**
- `name`: 服务名称
- `version`: 服务版本号

#### 主要方法

##### register(serviceClass: new () => T)

注册一个服务类，自动发现和注册其中的工具方法。

**参数：**
- `serviceClass`: 服务类构造函数

**示例：**
```typescript
mcp.register(MathService);
```

##### getTools(): ToolMetadata[]

获取所有已注册工具的元数据。

**返回：**
- 工具元数据数组

##### getToolList(): string[]

获取已注册工具的名称列表。

**返回：**
- 工具名称数组

##### async run()

启动 MCP 服务器（stdio 模式）。

##### async startStdioServer()

以 stdio 模式启动服务器。

##### async stopServer()

停止服务器。

### 装饰器

#### @Tool(description?: string)

标记一个方法为 MCP 工具。

**参数：**
- `description`: 工具描述（可选）

**示例：**
```typescript
@Tool("计算两个数字的和")
async add(a: number, b: number): Promise<number> {
  return a + b;
}
```

#### @Param(zodSchema: ZodSchema, description?: string)

标记方法参数，指定验证规则和描述。

**参数：**
- `zodSchema`: Zod 验证模式
- `description`: 参数描述（可选）

**示例：**
```typescript
@Param(z.number().positive(), "正数")
@Param(z.string().email(), "邮箱地址")
```

### 类型定义

#### ToolMetadata

工具元数据接口：

```typescript
interface ToolMetadata {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, JsonSchema>;
    required: string[];
  };
}
```

#### JsonSchema

JSON Schema 类型定义：

```typescript
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
```

## 配置选项说明

### TypeScript 配置要求

使用 BestMCP 需要在 `tsconfig.json` 中启用以下选项：

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "strict": true,
    "target": "ES2022",
    "module": "commonjs"
  }
}
```

### 错误处理

BestMCP 提供了完整的错误处理体系：

```typescript
// 自定义错误类型
class ToolValidationError extends Error {
  constructor(
    public toolName: string,
    public parameterName?: string,
    message?: string
  );
}

class ToolNotFoundError extends Error {
  constructor(public toolName: string);
}

class ZodValidationError extends Error {
  constructor(
    public parameterName: string,
    public zodErrors: z.ZodError
  );
}
```

## 技术要求

### Node.js 版本要求

- **最低版本**: Node.js 18.x
- **推荐版本**: Node.js 20.x 或更高版本

### TypeScript 配置要求

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "strict": true,
    "target": "ES2022",
    "module": "commonjs",
    "moduleResolution": "node",
    "esModuleInterop": true
  }
}
```

### 依赖项说明

#### 核心依赖

- **@modelcontextprotocol/sdk**: MCP 协议官方 SDK
- **zod**: 运行时类型验证库
- **reflect-metadata**: 装饰器元数据支持

#### 开发依赖

- **typescript**: TypeScript 编译器
- **@types/node**: Node.js 类型定义

### 包结构

```
bestmcp/
├── dist/           # 编译输出
├── index.ts        # 主入口文件
├── package.json    # 包配置
├── tsconfig.json   # TypeScript 配置
└── README.md       # 项目文档
```

## 最佳实践

### 代码组织

```typescript
// services/math.service.ts
export class MathService {
  @Tool("计算两数之和")
  async add(@Param(z.number()) a: number, @Param(z.number()) b: number) {
    return a + b;
  }
}

// services/index.ts
export * from './math.service';
export * from './user.service';

// main.ts
import { BestMCP } from 'bestmcp';
import { MathService, UserService } from './services';

const mcp = new BestMCP('my-service', '1.0.0');
mcp.register(MathService);
mcp.register(UserService);
await mcp.run();
```

### 参数验证

```typescript
// 推荐的参数验证模式
@Tool("创建用户")
async createUser(
  @Param(z.string().min(2).max(50), "用户名") username: string,
  @Param(z.string().email(), "邮箱") email: string,
  @Param(z.string().regex(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/), "密码") password: string
) {
  // 实现逻辑
}
```

### 错误处理

```typescript
@Tool("执行操作")
async executeOperation(@Param(z.string()) operation: string) {
  try {
    // 业务逻辑
  } catch (error) {
    // BestMCP 会自动处理错误并返回 MCP 格式的错误响应
    throw error;
  }
}
```

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 更多资源

- [MCP 官方文档](https://modelcontextprotocol.io/)
- [Zod 验证库文档](https://zod.dev/)
- [TypeScript 装饰器文档](https://www.typescriptlang.org/docs/handbook/decorators.html)