# BestMCP 传输层支持指南

## 概述

BestMCP 现在支持多种传输层，包括 stdio 和 HTTP，为不同的部署场景提供了灵活的选择。

## 支持的传输层

### 1. Stdio 传输层

适用于传统的命令行工具集成和本地开发。

**特点：**
- 基于标准输入输出
- 简单直接的通信方式
- 适合本地工具集成

**使用方式：**
```typescript
import { BestMCP } from 'bestmcp';

const mcp = new BestMCP("my-service", "1.0.0");
mcp.register(MyService);

// 默认方式（stdio）
await mcp.run();

// 或显式指定
await mcp.run({ transport: 'stdio' });

// 兼容性方法
await mcp.startStdioServer();
```

### 2. HTTP 传输层

适用于 Web 应用集成、微服务架构和云部署。

**特点：**
- 基于标准 HTTP 协议
- 支持请求-响应模式
- 易于负载均衡和横向扩展
- 支持有状态和无状态两种模式

**使用方式：**
```typescript
import { BestMCP } from 'bestmcp';

const mcp = new BestMCP("my-service", "1.0.0");
mcp.register(MyService);

// 基本配置
await mcp.run({ transport: 'http' }); // 默认端口 8000

// 自定义配置
await mcp.run({
  transport: 'http',
  port: 3000,
  host: '127.0.0.1'
});

// 使用配置对象
const mcp = new BestMCP({
  name: 'my-service',
  version: '1.0.0',
  capabilities: { tools: {} },
  instructions: '服务说明'
});
```

## 配置选项

### RunOptions 接口

```typescript
interface RunOptions {
  transport?: 'stdio' | 'http';  // 传输层类型，默认 'stdio'
  port?: number;                 // HTTP 服务器端口，默认 8000
  host?: string;                 // 服务器绑定地址，默认 '127.0.0.1'
}
```

### BestMCPConfig 接口

```typescript
interface BestMCPConfig {
  name: string;                  // 服务名称
  version?: string;              // 服务版本，默认 '1.0.0'
  capabilities?: ServerCapabilities;  // MCP 服务器能力
  instructions?: string;         // 服务说明
}
```

## 实际示例

### 环境变量驱动的配置

```typescript
const transportType = process.env.MCP_TRANSPORT_TYPE || 'stdio';
const port = parseInt(process.env.MCP_PORT || '8000');
const host = process.env.MCP_HOST || '127.0.0.1';

await mcp.run({
  transport: transportType as 'stdio' | 'http',
  port,
  host
});
```

### 命令行参数支持

```typescript
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    transport: { type: 'string', default: 'stdio' },
    port: { type: 'string', default: '8000' },
    host: { type: 'string', default: '127.0.0.1' },
  },
});

await mcp.run({
  transport: values.transport as 'stdio' | 'http',
  port: parseInt(values.port),
  host: values.host
});
```

## HTTP 传输层详情

### 端点

- **路径**: `/mcp`
- **方法**: POST
- **Content-Type**: application/json

### 请求示例

```bash
# 获取工具列表
curl -X POST http://127.0.0.1:8000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'

# 调用工具
curl -X POST http://127.0.0.1:8000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "add",
      "arguments": {
        "a": 5,
        "b": 3
      }
    }
  }'
```

## 状态管理

### 获取传输层状态

```typescript
// 获取当前传输层状态
const status = mcp.getTransportStatus();
console.log(status); // { type: 'http', isRunning: true, details: {...} }

// 获取统计信息
const stats = mcp.getTransportStats();
console.log(stats); // { registeredTypes: ['stdio', 'http'], currentType: 'http', isRunning: true }

// 检查服务器是否运行
const isRunning = mcp.isServerRunning();
```

### 停止服务器

```typescript
// 优雅停止
await mcp.stopServer();
```

## 最佳实践

### 开发环境

```typescript
// 开发时使用 stdio，便于调试
await mcp.run({ transport: 'stdio' });
```

### 测试环境

```typescript
// 测试时使用 HTTP，便于集成测试
await mcp.run({
  transport: 'http',
  port: 3001,
  host: '127.0.0.1'
});
```

### 生产环境

```typescript
// 生产环境使用 HTTP，支持负载均衡
await mcp.run({
  transport: 'http',
  port: 8000,
  host: '0.0.0.0' // 允许外部访问
});
```

## 向后兼容性

所有现有的 API 保持完全兼容：

```typescript
// 现有代码无需修改
const mcp = new BestMCP("service", "1.0.0");
mcp.register(MyService);
await mcp.run(); // 默认 stdio 模式
```

## 错误处理

```typescript
try {
  await mcp.run({ transport: 'http', port: 3000 });
} catch (error) {
  if (error.message.includes('端口')) {
    console.error('端口被占用，请尝试其他端口');
  } else {
    console.error('启动失败:', error);
  }
}
```

## 类型安全

完整的 TypeScript 类型支持：

```typescript
import { BestMCP, type RunOptions, type BestMCPConfig } from 'bestmcp';

const options: RunOptions = {
  transport: 'http',
  port: 3000
};

const config: BestMCPConfig = {
  name: 'my-service',
  version: '1.0.0',
  capabilities: { tools: {} }
};
```

## 故障排除

### 常见问题

1. **端口被占用**: 更换端口号或检查端口使用情况
2. **权限问题**: 确保有权限绑定指定端口（1024 以下端口需要管理员权限）
3. **网络配置**: 检查防火墙和网络配置

### 调试技巧

```typescript
// 启用详细日志
process.env.DEBUG = 'bestmcp:*';

// 检查传输层状态
console.log(mcp.getTransportStats());

// 测试连接
const status = mcp.getTransportStatus();
if (!status?.isRunning) {
  console.error('传输层未正确启动');
}
```

## 更多示例

查看 `examples/` 目录中的完整示例：

- `http-example.ts` - HTTP 传输层示例
- `stdio-example.ts` - stdio 传输层示例
- `config-example.ts` - 配置对象使用示例