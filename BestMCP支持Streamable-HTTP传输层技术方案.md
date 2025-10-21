# BestMCP 框架支持 Streamable-HTTP 传输层技术方案

## 1. 项目概述

### 1.1 背景

BestMCP 是一个基于 TypeScript 装饰器的 Model Context Protocol (MCP) 服务器框架，目前仅支持 stdio 传输层。为了满足 Web 集成、云部署和微服务架构的需求，需要增加对 streamable-http 传输层的支持。

### 1.2 目标

- 在保持现有 API 完全兼容的前提下，增加 streamable-http 传输能力
- 提供灵活的传输层选择机制，支持动态切换
- 支持有状态和无状态两种 HTTP 模式
- 保持现有的装饰器系统和参数验证机制不变

## 2. 现状分析

### 2.1 当前架构

**项目结构**：
```
packages/bestmcp/
├── src/
│   ├── core/
│   │   ├── server.ts      # MCP 服务器核心实现
│   │   ├── types.ts       # 类型定义
│   │   ├── decorators.ts  # 装饰器系统
│   │   ├── validation.ts  # 参数验证
│   │   └── errors.ts      # 错误处理
│   └── index.ts           # 主入口文件
├── package.json
└── README.md
```

**核心技术栈**：
- `@modelcontextprotocol/sdk` v1.18.2
- TypeScript 5.5.4
- Zod v3.25.76（参数验证）
- reflect-metadata v0.2.2（装饰器支持）

### 2.2 现有 stdio 实现

当前的 stdio 传输实现位于 `src/core/server.ts`：

```typescript
// 现有实现关键点
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

export class BestMCP {
  private transport: StdioServerTransport | undefined;

  async startStdioServer() {
    this.transport = new StdioServerTransport();
    await this.server.connect(this.transport);
  }
}
```

### 2.3 MCP SDK 中的 StreamableHTTP 支持

通过分析 MCP SDK 源码发现，官方已经提供了完整的 `StreamableHTTPServerTransport` 实现：

- 支持普通 HTTP JSON 响应
- 支持有状态和无状态两种模式
- 包含完整的会话管理和安全验证

## 3. 技术方案设计

### 3.1 总体架构原则

1. **向后兼容性**：现有 API 保持不变，用户无需修改现有代码
2. **渐进式增强**：通过配置选项启用新功能，而非破坏性变更
3. **类型安全**：保持完整的 TypeScript 类型支持
4. **可扩展性**：为未来支持更多传输层预留接口

### 3.2 传输层抽象设计

#### 3.2.1 传输层基类

创建统一的传输层抽象接口：

```typescript
// src/core/transports/base.ts
import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";

export enum TransportType {
  STDIO = 'stdio',
  HTTP = 'http'
}

export interface TransportConfig {
  type: TransportType;
  options?: Record<string, unknown>;
}

export abstract class BaseTransport {
  abstract readonly type: TransportType;
  abstract createTransport(server: Server): Promise<Transport>;
  abstract start(transport: Transport): Promise<void>;
  abstract stop(transport: Transport): Promise<void>;
}
```

#### 3.2.2 具体传输层实现

**STDIO 传输层**：
```typescript
// src/core/transports/stdio.ts
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { BaseTransport, TransportType } from "./base.js";

export class StdioTransport extends BaseTransport {
  readonly type = TransportType.STDIO;

  async createTransport(server: Server): Promise<StdioServerTransport> {
    return new StdioServerTransport();
  }

  async start(transport: StdioServerTransport): Promise<void> {
    await server.connect(transport);
  }

  async stop(): Promise<void> {
    // stdio 传输层清理逻辑
  }
}
```

**HTTP 传输层**：
```typescript
// src/core/transports/http.ts
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { BaseTransport, TransportType, TransportConfig } from "./base.js";

export class HTTPTransport extends BaseTransport {
  readonly type = TransportType.HTTP;
  private config: TransportConfig;
  private transport?: StreamableHTTPServerTransport;

  constructor(config: TransportConfig) {
    super();
    this.config = config;
  }

  async createTransport(server: Server): Promise<StreamableHTTPServerTransport> {
    this.transport = new StreamableHTTPServerTransport(this.config.options);
    return this.transport;
  }

  async start(server: Server, transport: StreamableHTTPServerTransport): Promise<void> {
    await server.connect(transport);
  }

  async stop(): Promise<void> {
    if (this.transport) {
      await this.transport.close();
    }
  }

  // 用于处理 HTTP 请求的方法
  async handleRequest(req: IncomingMessage, res: ServerResponse, parsedBody?: unknown): Promise<void> {
    if (this.transport) {
      await this.transport.handleRequest(req, res, parsedBody);
    }
  }
}
```

### 3.3 传输层管理器

```typescript
// src/core/transport-manager.ts
import { BaseTransport, TransportConfig, TransportType } from "./transports/base.js";
import { StdioTransport } from "./transports/stdio.js";
import { HTTPTransport } from "./transports/http.js";

export class TransportManager {
  private transports = new Map<TransportType, BaseTransport>();
  private currentTransport?: BaseTransport;

  constructor() {
    // 注册内置传输层
    this.transports.set(TransportType.STDIO, new StdioTransport());
  }

  registerTransport<T extends BaseTransport>(type: TransportType, transport: T): void {
    this.transports.set(type, transport);
  }

  async createTransport(config: TransportConfig): Promise<BaseTransport> {
    const TransportClass = this.transports.get(config.type);
    if (!TransportClass) {
      throw new Error(`Unsupported transport type: ${config.type}`);
    }

    if (config.type === TransportType.HTTP) {
      return new HTTPTransport(config as HTTPTransportConfig);
    }

    return TransportClass;
  }

  async setCurrentTransport(transport: BaseTransport): Promise<void> {
    this.currentTransport = transport;
  }

  getCurrentTransport(): BaseTransport | undefined {
    return this.currentTransport;
  }
}
```

### 3.4 BestMCP 核心类增强

#### 3.4.1 运行时配置接口设计

```typescript
// src/core/types.ts 新增运行时配置接口
export interface RunOptions {
  transport?: 'stdio' | 'http';
  port?: number;
  host?: string;
}

export interface BestMCPConfig {
  name: string;
  version?: string;
  capabilities?: ServerCapabilities;
  instructions?: string;
}
```

#### 3.4.2 BestMCP 类扩展

```typescript
// src/core/server.ts 修改现有类
export class BestMCP {
  private name: string;
  private version: string;
  private transportManager: TransportManager;
  private currentTransport?: BaseTransport;
  private mcpTransport?: Transport;
  private server?: Server;

  // 保持现有构造函数完全不变
  constructor(name: string, version?: string) {
    this.name = name;
    this.version = version || "1.0.0";
    this.transportManager = new TransportManager();
    this.initializeMCPServer({ name, version });
  }

  // 支持配置对象的构造函数（可选）
  constructor(config: BestMCPConfig) {
    this.name = config.name;
    this.version = config.version || "1.0.0";
    this.transportManager = new TransportManager();
    this.initializeMCPServer(config);
  }

  private async initializeTransport(transportType: string, options: RunOptions = {}): Promise<void> {
    const config: TransportConfig = this.createTransportConfig(transportType, options);
    this.currentTransport = await this.transportManager.createTransport(config);
    this.mcpTransport = await this.currentTransport.createTransport(this.server!);
    await this.transportManager.setCurrentTransport(this.currentTransport);
  }

  private createTransportConfig(transportType: string, options: RunOptions): TransportConfig {
    switch (transportType) {
      case 'stdio':
        return { type: TransportType.STDIO };

      case 'http':
        return {
          type: TransportType.HTTP,
          options: {
            enableJsonResponse: true // HTTP 模式使用 JSON 响应
          }
        };

      default:
        throw new Error(`Unsupported transport type: ${transportType}`);
    }
  }

  // 保持现有方法兼容性
  async startStdioServer(): Promise<void> {
    await this.run({ transport: 'stdio' });
  }

  // 增强的 run 方法，支持运行时选择传输层
  async run(options: RunOptions = {}): Promise<void> {
    const transportType = options.transport || 'stdio';

    // 初始化传输层
    await this.initializeTransport(transportType, options);

    // 启动传输层
    await this.currentTransport!.start(this.server!, this.mcpTransport!);

    // 如果是 HTTP 传输，启动 HTTP 服务器
    if (transportType === 'http') {
      await this.startHTTPServer(options);
    }
  }

  private async startHTTPServer(options: RunOptions): Promise<void> {
    const http = await import('node:http');
    const port = options.port || 8000;
    const host = options.host || '127.0.0.1';

    const server = http.createServer(async (req, res) => {
      // 只处理 POST 请求到 /mcp 路径
      if (req.method === 'POST' && req.url === '/mcp') {
        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });

        req.on('end', async () => {
          try {
            const parsedBody = JSON.parse(body);
            await this.handleHTTPRequest(req, res, parsedBody);
          } catch (error) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid JSON' }));
          }
        });
      } else {
        res.writeHead(404).end();
      }
    });

    server.listen(port, host, () => {
      console.log(`MCP Server listening on http://${host}:${port}/mcp`);
      console.log(`Transport: ${options.transport || 'stdio'}`);
    });

    // 保存服务器实例以便后续清理
    this.httpServer = server;
  }

  // HTTP 请求处理方法
  async handleHTTPRequest(req: IncomingMessage, res: ServerResponse, parsedBody?: unknown): Promise<void> {
    if (this.currentTransport instanceof HTTPTransport) {
      await this.currentTransport.handleRequest(req, res, parsedBody);
    } else {
      throw new Error("Current transport is not HTTP");
    }
  }

  // 停止服务器
  async stopServer(): Promise<void> {
    if (this.currentTransport) {
      await this.currentTransport.stop();
    }

    if (this.httpServer) {
      this.httpServer.close();
      this.httpServer = undefined;
    }
  }

  private httpServer?: any; // HTTP 服务器实例
}
```

## 4. 实施方案

### 4.1 阶段性实施计划

#### 阶段 1：核心架构实现（2-3天）

**任务清单**：
- [ ] 创建 `src/core/transports/` 目录结构
- [ ] 实现传输层基类 `BaseTransport`
- [ ] 实现 `StdioTransport` 包装类
- [ ] 实现 `HTTPTransport` 类
- [ ] 实现 `TransportManager` 管理器
- [ ] 扩展 `BestMCP` 类支持配置化启动
- [ ] 更新类型定义文件

**验收标准**：
- [ ] 新的传输层架构实现完成
- [ ] 现有 stdio 功能正常工作
- [ ] HTTP 传输层基础功能可用
- [ ] TypeScript 编译无错误

#### 阶段 2：集成测试和兼容性验证（1-2天）

**任务清单**：
- [ ] 编写传输层单元测试
- [ ] 编写集成测试验证双模式工作
- [ ] 验证现有 API 兼容性
- [ ] 性能基准测试
- [ ] 错误处理测试

**验收标准**：
- [ ] 所有测试通过
- [ ] 现有功能 100% 兼容
- [ ] 新功能正常工作
- [ ] 性能无明显下降

#### 阶段 3：文档和示例（1天）

**任务清单**：
- [ ] 更新 README.md 文档
- [ ] 创建 HTTP 使用示例
- [ ] 编写最佳实践指南
- [ ] 更新 API 文档

**验收标准**：
- [ ] 文档完整准确
- [ ] 示例代码可运行
- [ ] 用户能够快速上手

### 4.2 目录结构变化

```
packages/bestmcp/
├── src/
│   ├── core/
│   │   ├── transports/           # 新增传输层模块
│   │   │   ├── base.ts          # 传输层基类
│   │   │   ├── stdio.ts         # stdio 传输实现
│   │   │   ├── http.ts          # HTTP 传输实现
│   │   │   └── index.ts         # 传输层导出
│   │   ├── transport-manager.ts # 新增传输管理器
│   │   ├── server.ts            # 修改现有服务器类
│   │   ├── types.ts             # 扩展类型定义
│   │   ├── decorators.ts        # 保持不变
│   │   ├── validation.ts        # 保持不变
│   │   └── errors.ts            # 保持不变
│   ├── examples/                # 新增示例目录
│   │   ├── stdio-example.ts
│   │   └── http-example.ts
│   └── index.ts                 # 更新导出
├── tests/                       # 新增测试目录
│   ├── unit/
│   │   └── transports/
│   └── integration/
│       ├── stdio.test.ts
│       └── http.test.ts
├── package.json                 # 更新依赖
└── README.md                    # 更新文档
```

## 5. 使用示例

### 5.1 现有代码保持不变

```typescript
// 现有的 stdio 使用方式完全不变
import { BestMCP, Tool, Param } from 'bestmcp';
import { z } from 'zod';

class MathService {
  @Tool("计算两个数字的和")
  async add(
    @Param(z.number(), "第一个数字") a: number,
    @Param(z.number(), "第二个数字") b: number
  ): Promise<number> {
    return a + b;
  }
}

// 原有启动方式继续有效（默认使用 stdio）
const mcp = new BestMCP("math-service", "1.0.0");
mcp.register(MathService);
await mcp.run(); // 默认 stdio 模式
```

### 5.2 运行时选择传输层

```typescript
// 在 run() 方法中指定传输层
import { BestMCP, Tool, Param } from 'bestmcp';
import { z } from 'zod';

class MathService {
  @Tool("计算两个数字的和")
  async add(
    @Param(z.number(), "第一个数字") a: number,
    @Param(z.number(), "第二个数字") b: number
  ): Promise<number> {
    return a + b;
  }
}

const mcp = new BestMCP("math-service", "1.0.0");
mcp.register(MathService);

// 最简化的使用方式 - 所有配置都有合理默认值
await mcp.run({ transport: 'http' });     // HTTP 模式，默认端口 8000
await mcp.run();                          // stdio 模式（默认）

// 稍微详细一点的配置
await mcp.run({
  transport: 'http',
  port: 3000,
  host: '127.0.0.1'
});

// 需要自定义端口时的配置
await mcp.run({
  transport: 'http',
  port: 3000,
  host: '127.0.0.1'
});
```

### 5.3 环境变量驱动的动态选择

```typescript
// 根据环境变量自动选择传输层
import { BestMCP, Tool, Param } from 'bestmcp';
import { z } from 'zod';

class MyService {
  @Tool("示例工具")
  async myTool(@Param(z.string(), "输入") input: string): Promise<string> {
    return `处理结果: ${input}`;
  }
}

const mcp = new BestMCP("my-service", "1.0.0");
mcp.register(MyService);

// 从环境变量读取配置
const transportType = process.env.MCP_TRANSPORT_TYPE || 'stdio';
const port = parseInt(process.env.MCP_PORT || '8000');
const host = process.env.MCP_HOST || '127.0.0.1';

// 根据配置运行
await mcp.run({
  transport: transportType,
  port,
  host
});
```

### 5.4 多场景示例

```typescript
// 开发环境：使用 stdio（快速开发）
const devMCP = new BestMCP("dev-service", "1.0.0");
devMCP.register(DevService);
await devMCP.run({ transport: 'stdio' });

// 测试环境：使用 HTTP（易于测试）
const testMCP = new BestMCP("test-service", "1.0.0");
testMCP.register(TestService);
await testMCP.run({
  transport: 'http',
  port: 3001,
  host: '127.0.0.1'
});

// 生产环境：使用 HTTP（稳定的请求-响应模式）
const prodMCP = new BestMCP("prod-service", "1.0.0");
prodMCP.register(ProdService);
await prodMCP.run({
  transport: 'http',
  port: 8000,
  host: '0.0.0.0'
});
```

### 5.5 命令行工具集成

```typescript
// cli.ts - 命令行启动工具
import { BestMCP } from 'bestmcp';
import { parseArgs } from 'node:util';

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    transport: { type: 'string', default: 'stdio' },
    port: { type: 'string', default: '8000' },
    host: { type: 'string', default: '127.0.0.1' },
  },
  allowPositionals: true
});

const mcp = new BestMCP("cli-service", "1.0.0");

// 注册服务...
mcp.register(MyService);

// 根据命令行参数启动
await mcp.run({
  transport: values.transport as any,
  port: parseInt(values.port),
  host: values.host
});

// 使用方式：
// node cli.js --transport stdio
// node cli.js --transport http --port 3000
```

## 6. 技术特性详解

### 6.1 HTTP 传输模式

**HTTP 模式**：
- 使用标准的 HTTP JSON 请求-响应模式
- 无状态设计，每次请求独立处理
- 适合负载均衡和横向扩展
- 易于调试和测试

### 6.2 内置安全特性

- 基于 MCP 官方 SDK 的安全机制
- 自动输入验证和错误处理
- 会话隔离确保数据安全

### 6.3 HTTP 服务器管理

- 自动启动和停止 HTTP 服务器
- 支持 POST 请求处理 MCP 调用
- 优雅的错误处理和响应

## 7. 兼容性保证

### 7.1 API 兼容性

**现有 API 保持 100% 兼容**：

```typescript
// 所有现有方法签名保持不变
class BestMCP {
  constructor(name: string, version?: string);
  register<T>(serviceClass: new () => T): void;
  async startStdioServer(): Promise<void>;
  async run(): Promise<void>; // 现在支持可选参数，但无参数时默认 stdio
  // ... 其他现有方法
}
```

**新 API 通过可选参数增强**：

```typescript
// 增强的 run 方法，向后兼容
async run(options?: RunOptions): Promise<void>;

// startStdioServer 现在内部调用 run 方法
async startStdioServer(): Promise<void> {
  await this.run({ transport: 'stdio' });
}
```

### 7.2 装饰器兼容性

所有现有装饰器（`@Tool`, `@Param`）保持完全不变：

```typescript
class MyService {
  @Tool("描述")
  async myMethod(
    @Param(z.string(), "参数描述") param: string
  ): Promise<string> {
    return result;
  }
}
```

### 7.3 类型兼容性

RunOptions 接口的所有字段都是可选的，确保向后兼容：

```typescript
export interface RunOptions {
  transport?: 'stdio' | 'http'; // 可选，默认 'stdio'
  port?: number;                // 可选
  host?: string;                // 可选
  // 所有其他字段都是可选的
}
```

## 8. 依赖管理

### 8.1 现有依赖保持不变

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.18.2",
    "zod": "^3.25.76",
    "reflect-metadata": "^0.2.2"
  }
}
```

### 8.2 新增可选依赖

```json
{
  "peerDependencies": {
    "express": "^4.18.0 || ^5.0.0"
  },
  "optionalDependencies": {
    "@types/express": "^4.17.0 || ^5.0.0"
  }
}
```

**说明**：
- HTTP 服务器功能为可选特性
- 用户可选择使用 Express 或原生 Node.js HTTP 模块
- 保持核心库的轻量级特性

## 9. 测试策略

### 9.1 单元测试

```typescript
// tests/unit/transports/stdio.test.ts
describe('StdioTransport', () => {
  it('should create stdio transport', async () => {
    const transport = new StdioTransport();
    expect(transport.type).toBe(TransportType.STDIO);
  });
});

// tests/unit/transports/http.test.ts
describe('HTTPTransport', () => {
  it('should create HTTP transport with config', async () => {
    const config = { type: TransportType.HTTP, options: {} };
    const transport = new HTTPTransport(config);
    expect(transport.type).toBe(TransportType.HTTP);
  });
});
```

### 9.2 集成测试

```typescript
// tests/integration/dual-transport.test.ts
describe('Dual Transport Support', () => {
  it('should work with both stdio and HTTP', async () => {
    // 测试两种传输模式都能正常工作
  });

  it('should maintain API compatibility', async () => {
    // 测试现有 API 仍然有效
  });
});
```

### 9.3 端到端测试

```typescript
// tests/e2e/http-scenarios.test.ts
describe('HTTP Scenarios', () => {
  it('should handle HTTP requests correctly', async () => {
    // 模拟完整的 HTTP 请求流程
  });
});
```

## 10. 性能考虑

### 10.1 内存使用

- 传输层实例复用，避免重复创建
- 合理的会话清理机制，防止内存泄漏
- 可选的事件存储，支持流式数据优化

### 10.2 并发处理

- HTTP 传输层天然支持并发请求
- 会话隔离确保并发安全
- 支持 Node.js 集群模式部署

### 10.3 网络优化

- 支持压缩和缓存头
- 连接池管理
- 可配置的超时和重试机制

## 11. 错误处理

### 11.1 传输层错误

```typescript
// 统一的错误处理机制
export class TransportError extends Error {
  constructor(
    public transportType: TransportType,
    message: string,
    public cause?: Error
  ) {
    super(`[${transportType}] ${message}`);
  }
}
```

### 11.2 配置错误

- 详细的配置验证和错误提示
- 运行时配置检查
- 友好的错误消息和修复建议

### 11.3 连接错误

- 自动重连机制（对于支持重连的传输层）
- 优雅的降级策略
- 详细的连接状态日志

## 12. 监控和日志

### 12.1 性能监控

```typescript
// 内置性能指标收集
export interface TransportMetrics {
  type: TransportType;
  requestCount: number;
  errorCount: number;
  averageResponseTime: number;
  activeConnections: number;
}
```

### 12.2 结构化日志

```typescript
// 结构化日志输出
export interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  transport: TransportType;
  message: string;
  metadata?: Record<string, unknown>;
}
```

## 13. 部署指南

### 13.1 开发环境

```bash
# 安装依赖
npm install bestmcp

# stdio 模式运行
node my-mcp-server.js

# HTTP 模式运行
MCP_TRANSPORT_TYPE=http node my-mcp-server.js
```

### 13.2 生产环境

#### 13.2.1 Docker 部署

```dockerfile
FROM node:18-alpine
COPY . /app
WORKDIR /app
RUN npm ci --only=production
EXPOSE 8000
CMD ["node", "server.js"]
```

#### 13.2.2 Kubernetes 部署

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mcp-server
spec:
  replicas: 3
  selector:
    matchLabels:
      app: mcp-server
  template:
    metadata:
      labels:
        app: mcp-server
    spec:
      containers:
      - name: mcp-server
        image: mcp-server:latest
        ports:
        - containerPort: 8000
        env:
        - name: MCP_TRANSPORT_TYPE
          value: "http"
```

### 13.3 负载均衡

- HTTP 传输层支持水平扩展
- 可配置会话亲和性（对于有状态模式）
- 支持反向代理和 CDN

## 14. 最佳实践

### 14.1 传输层选择指南

| 场景 | 推荐传输层 | 配置示例 | 理由 |
|------|------------|----------|------|
| 本地开发工具 | stdio | `{ transport: 'stdio' }` | 简单直接，无网络开销 |
| Web 应用集成 | http | `{ transport: 'http', port: 8000, host: '127.0.0.1' }` | 易于集成，标准 HTTP 协议 |
| 微服务架构 | http | `{ transport: 'http', port: 8000, host: '127.0.0.1' }` | 无状态，易于负载均衡 |
| 云函数部署 | http | `{ transport: 'http', port: 3000, host: '127.0.0.1' }` | 请求-响应模式，适合 serverless |
| 高并发场景 | http | `{ transport: 'http' }` | 水平扩展能力强 |

### 14.2 配置最佳实践

```typescript
// 最简化的使用方式 - 推荐用于快速开发
await mcp.run({ transport: 'http' });     // 一行代码启动 HTTP 服务
await mcp.run();                          // stdio 模式（默认）

// 开发环境推荐配置
const developmentOptions = {
  transport: 'stdio' as const // 或 { transport: 'http' } 用于本地测试
};

// 测试环境推荐配置
const testOptions = {
  transport: 'http' as const,
  port: 3001,
  host: '127.0.0.1'
};

// 生产环境推荐配置
const productionOptions = {
  transport: 'http' as const,
  port: 8000,
  host: '0.0.0.0'
};
```

### 14.2.1 配置字段说明

| 字段 | 默认值 | 说明 | 使用场景 |
|------|--------|------|----------|
| `transport` | `'stdio'` | 传输层类型 | 选择通信方式 |
| `port` | `8000` | HTTP 服务器端口 | HTTP 模式时的端口 |
| `host` | `'127.0.0.1'` | 服务器绑定地址 | 需要外部访问时配置 |

**注意**：所有配置都是可选的，框架会根据传输类型自动设置合理的默认值。

### 14.3 错误处理最佳实践

```typescript
try {
  const mcp = new BestMCP("my-service", "1.0.0");
  mcp.register(MyService);

  // 根据配置运行
  await mcp.run(options);
} catch (error) {
  if (error instanceof TransportError) {
    console.error(`Transport error [${error.transportType}]: ${error.message}`);
    // 根据传输类型进行特定处理
    if (error.transportType === 'http') {
      console.error('请检查端口是否被占用或网络配置');
    } else if (error.transportType === 'stdio') {
      console.error('请检查 stdio 流配置');
    }
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## 15. 风险评估和缓解策略

### 15.1 技术风险

| 风险 | 影响 | 概率 | 缓解策略 |
|------|------|------|----------|
| MCP SDK 版本不兼容 | 高 | 低 | 锁定依赖版本，实现适配器模式 |
| HTTP 传输性能问题 | 中 | 中 | 性能基准测试，优化关键路径 |
| 会话管理复杂性 | 中 | 中 | 提供清晰的配置选项和文档 |

### 15.2 兼容性风险

| 风险 | 影响 | 概率 | 缓解策略 |
|------|------|------|----------|
| 破坏现有 API | 高 | 低 | 完整的向后兼容测试 |
| TypeScript 类型冲突 | 中 | 低 | 严格的类型检查和渐进式发布 |
| 依赖冲突 | 低 | 低 | 可选依赖和 peer dependencies |

### 15.3 安全风险

| 风险 | 影响 | 概率 | 缓解策略 |
|------|------|------|----------|
| HTTP 安全漏洞 | 高 | 中 | 使用官方 SDK，定期安全更新 |
| 会话劫持 | 中 | 低 | 加密安全的会话 ID，HTTPS 传输 |
| DNS 重绑定攻击 | 中 | 低 | 内置 DNS 重绑定保护机制 |

## 16. 后续发展规划

### 16.1 短期计划（3-6个月）

- [ ] 完成基础 HTTP 传输层实现
- [ ] 完善测试覆盖率
- [ ] 收集用户反馈并优化
- [ ] 性能优化和稳定性提升

### 16.2 中期计划（6-12个月）

- [ ] 支持更多传输层（WebSocket、gRPC）
- [ ] 实现插件系统
- [ ] 添加监控和可观测性功能
- [ ] 支持集群部署模式

### 16.3 长期计划（1-2年）

- [ ] 完整的 MCP 协议能力支持（Resources、Prompts、Samples）
- [ ] 企业级功能（认证、授权、审计）
- [ ] 云原生特性增强
- [ ] 生态系统建设

## 17. 结论

本技术方案为 BestMCP 框架提供了完整的 streamable-http 传输层支持，具有以下关键优势：

1. **完全向后兼容**：现有用户无需修改任何代码
2. **架构清晰**：通过抽象层实现传输层的可插拔设计
3. **功能完整**：支持有状态/无状态 HTTP 模式
4. **安全可靠**：内置安全机制和错误处理
5. **易于扩展**：为未来支持更多传输层奠定了基础

通过分阶段实施，可以在保证系统稳定性的前提下，快速为用户提供强大的 Web 集成能力。这将显著提升 BestMCP 框架的适用范围和实用价值，为 TypeScript/Node.js 生态系统提供最佳的 MCP 开发体验。