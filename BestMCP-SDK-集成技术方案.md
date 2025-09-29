# BestMCP SDK 集成技术方案

## 1. 现状分析

### 1.1 当前 BestMCP 架构

BestMCP 目前实现了一个基于装饰器的 MCP 服务框架，主要特点：

**核心组件**：
- **装饰器系统**：`@tool` 装饰器用于工具定义
- **元数据存储**：使用 Reflect Metadata 存储工具元数据
- **服务注册**：`BestMCP` 类负责注册和管理服务类
- **执行引擎**：提供工具执行功能

**架构优势**：
- 开发者友好的装饰器语法
- 自动参数类型提取和 JSON Schema 生成
- 类型安全的工具定义
- 模块化的服务类设计

**当前限制**：
- 缺少与标准 MCP SDK 的集成
- 没有实现 stdio 传输协议
- 无法与 MCP 客户端直接通信

### 1.2 @modelcontextprotocol/sdk 分析

MCP SDK 提供了标准的 MCP 协议实现：

**核心组件**：
- `Server` 类：MCP 服务器实现
- `StdioServerTransport`：stdio 传输协议
- `CallToolRequestSchema`、`ListToolsRequestSchema`：请求模式定义

**协议支持**：
- 工具调用（Tools）
- 标准错误处理
- 与 MCP 客户端的标准通信

## 2. 集成架构设计

### 2.1 核心架构

```mermaid
graph TB
    subgraph "BestMCP 框架"
        A[@tool 装饰器] --> B[工具元数据存储]
        B --> C[服务注册器]
        C --> D[工具执行引擎]
    end
    
    subgraph "MCP SDK 集成层"
        D --> E[工具请求处理器]
        E --> F[工具调用适配器]
        F --> G[错误处理器]
    end
    
    subgraph "MCP SDK"
        G --> H[Server 实例]
        H --> I[StdioServerTransport]
        I --> J[MCP 客户端]
    end
```

### 2.2 核心设计原则

1. **向后兼容**：保持现有 `@tool` 装饰器 API 不变
2. **工具集成**：将装饰器工具元数据转换为 MCP 标准格式
3. **stdio 通信**：实现 stdio 传输协议与 MCP 客户端通信
4. **错误处理**：统一的工具调用错误处理机制

## 3. 详细实施方案

### 3.1 第一阶段：Tools 功能集成

#### 3.1.1 依赖管理

**需要添加的依赖**：
```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.18.2"
  }
}
```

**类型定义**：
```typescript
// MCP SDK 类型导入
import { 
  Server, 
  StdioServerTransport,
  CallToolRequestSchema,
  ListToolsRequestSchema,
  CallToolRequest,
  CallToolResult,
  Tool
} from "@modelcontextprotocol/sdk";
```

#### 3.1.2 Tools 请求处理器集成

在 `BestMCP` 类中添加 MCP 服务器支持，专注于 Tools 功能：

```typescript
export class BestMCP {
  // 现有属性...
  private server?: Server;
  private transport?: StdioServerTransport;
  
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
      }
    );
    
    this.setupToolRequestHandlers();
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
}
```

#### 3.1.3 Tools 类型转换器

实现装饰器工具元数据到 MCP 标准格式的转换：

```typescript
export class BestMCP {
  // ... 现有代码
  
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
        throw new Error('Missing required arguments');
      }
      
      // 执行工具
      const result = await this.executeTool(name, args);
      
      return {
        content: [
          {
            type: "text",
            text: typeof result === 'string' ? result : JSON.stringify(result),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  }
}
```

### 3.2 第二阶段：Stdio MCP 传输实现

#### 3.2.1 Stdio 服务器启动方法

```typescript
export class BestMCP {
  // ... 现有代码
  
  // 启动 stdio MCP 服务器
  async startStdioServer() {
    if (!this.server) {
      throw new Error('MCP Server not initialized');
    }
    
    try {
      // 创建 stdio 传输层
      this.transport = new StdioServerTransport();
      
      // 连接服务器到传输层
      await this.server.connect(this.transport);
      
      console.log(`${this.name} v${this.version} started with stdio transport`);
      console.log(`Registered ${this.tools.size} tools`);
      console.log('MCP server is ready to accept requests');
      
    } catch (error) {
      this.handleError(error, 'Failed to start stdio server');
    }
  }
  
  // 停止服务器
  async stopServer() {
    if (this.transport) {
      // MCP SDK 会自动处理连接关闭
      this.transport = undefined;
      console.log('MCP server stopped');
    }
  }
}
```

#### 3.2.2 增强的启动方法

```typescript
export class BestMCP {
  // ... 现有代码
  
  // 增强的 run 方法，支持 stdio 传输
  async run(options?: { transport?: 'stdio' }) {
    if (options?.transport === 'stdio') {
      await this.startStdioServer();
    } else {
      // 保持原有的兼容性模式
      console.log(`Starting ${this.name} v${this.version} in compatibility mode`);
      console.log(`Registered ${this.tools.size} tools`);
      console.log('Use run({ transport: "stdio" }) for MCP protocol communication');
    }
  }
  
  // 检查服务器状态
  isServerRunning(): boolean {
    return this.transport !== undefined;
  }
}
```

### 3.3 第三阶段：Tools 错误处理机制

#### 3.3.1 统一的错误处理

```typescript
export class BestMCP {
  // ... 现有代码
  
  private handleError(error: unknown, context: string): never {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[${context}] Error: ${message}`);
    
    if (error instanceof Error) {
      console.error(`Stack: ${error.stack}`);
    }
    
    throw new Error(`${context}: ${message}`);
  }
  
  private async safeExecuteTool<T>(
    toolName: string,
    args: any,
    fn: () => Promise<T>
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      console.error(`Tool execution failed: ${toolName}`, error);
      throw error;
    }
  }
  
  // 增强的工具执行方法，包含更好的错误处理
  async executeTool(name: string, args: any) {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool ${name} not found`);
    }
    
    return this.safeExecuteTool(name, args, () => tool.handler(args));
  }
}
```

#### 3.3.2 Tools 验证和类型安全

```typescript
export class BestMCP {
  // ... 现有代码
  
  // 验证工具参数
  private validateToolArguments(toolName: string, args: any): boolean {
    const tool = this.tools.get(toolName);
    if (!tool) {
      return false;
    }
    
    const { parameters } = tool.metadata;
    const { required } = parameters;
    
    // 检查必需参数
    for (const paramName of required) {
      if (args[paramName] === undefined || args[paramName] === null) {
        return false;
      }
    }
    
    return true;
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
}
```

## 4. 分阶段实施计划

### 4.1 第一阶段（1 周）：Tools 功能基础集成

**任务清单**：
1. 添加 MCP SDK 依赖到 package.json
2. 实现 MCP 服务器初始化（仅 Tools 功能）
3. 添加 Tools 请求处理器（ListToolsRequestSchema、CallToolRequestSchema）
4. 实现装饰器工具到 MCP Tool 格式的转换器
5. 基础工具调用错误处理

**验收标准**：
- [ ] @modelcontextprotocol/sdk ^1.18.2 成功集成到项目中
- [ ] @tool 装饰器定义的工具能正确转换为 MCP Tool 格式
- [ ] 能够处理基本的工具列表请求
- [ ] 能够处理基本的工具调用请求
- [ ] 工具调用错误处理机制正常工作

### 4.2 第二阶段（1 周）：Stdio MCP 传输实现

**任务清单**：
1. 实现 StdioServerTransport 集成
2. 添加 stdio 服务器启动方法（startStdioServer）
3. 实现服务器状态检查和停止功能
4. 增强现有 run 方法支持 stdio 传输选项
5. stdio 传输层错误处理

**验收标准**：
- [ ] stdio MCP 服务器能够成功启动
- [ ] MCP 客户端能够通过 stdio 连接到服务器
- [ ] 工具调用能够通过 stdio 传输层正常工作
- [ ] 服务器状态管理功能正常
- [ ] stdio 传输错误处理完善

### 4.3 第三阶段（1 周）：Tools 功能完善和测试

**任务清单**：
1. 完善 Tools 参数验证机制
2. 增强工具调用错误处理和日志记录
3. 编写 Tools 功能的单元测试
4. 进行 stdio 传输的集成测试
5. 优化工具执行性能

**验收标准**：
- [ ] 工具参数验证功能完善
- [ ] 工具调用错误处理覆盖所有场景
- [ ] Tools 功能单元测试覆盖率 > 80%
- [ ] stdio 传输集成测试通过
- [ ] 工具执行性能满足要求

## 5. 技术风险和应对策略

### 5.1 主要风险

1. **类型兼容性**：装饰器工具元数据与 MCP SDK Tool 类型不完全匹配
2. **stdio 传输稳定性**：std io 传输层的连接管理和错误处理
3. **工具参数验证**：装饰器参数定义与 MCP 协议要求的兼容性

### 5.2 应对策略

1. **类型兼容性**：实现专用的工具元数据适配器，确保类型转换安全
2. **stdio 传输稳定性**：建立完善的连接状态监控和自动重连机制
3. **工具参数验证**：在转换器中实现严格的参数验证逻辑

## 6. 预期成果

### 6.1 功能特性

1. **Tools 功能的完整支持**：完整的 MCP Tools 协议支持
2. **装饰器开发体验**：保持现有 @tool 装饰器的简单易用
3. **类型安全**：完整的 TypeScript 类型支持
4. **stdio 通信**：支持 stdio 传输协议与 MCP 客户端通信
5. **错误处理**：统一的工具调用错误处理机制

### 6.2 技术指标

1. **启动时间**：< 100ms
2. **工具调用延迟**：< 10ms
3. **内存占用**：< 50MB（仅 Tools 功能）
4. **连接稳定性**：支持长时间 stdio 连接

### 6.3 用户体验

1. **开发体验**：保持 @tool 装饰器的简单易用
2. **调试体验**：提供清晰的工具调用错误信息
3. **部署体验**：简化的 stdio 服务器启动流程
4. **兼容体验**：现有代码无需修改即可使用

## 7. 后续扩展计划

### 7.1 短期扩展（1-2 个月）

1. **更多工具类型**：支持流式工具和长时间运行工具
2. **工具元数据增强**：添加工具示例、分类等更多信息
3. **性能优化**：工具调用缓存和批量处理
4. **调试工具**：提供工具调用的调试和监控功能

### 7.2 中期扩展（3-6 个月）

1. **工具权限管理**：基于角色的工具访问控制
2. **工具版本管理**：支持工具版本控制和兼容性检查
3. **工具依赖管理**：支持工具之间的依赖关系
4. **负载均衡**：支持多实例工具服务器部署

### 7.3 长期扩展（6+ 个月）

1. **工具市场**：构建工具的分发和发现平台
2. **多传输协议**：支持 WebSocket 和 HTTP 传输
3. **工具性能监控**：详细的工具调用性能指标
4. **工具生态系统**：完整的工具开发和使用生态

## 8. 总结

本技术方案详细描述了在 BestMCP 中集成 @modelcontextprotocol/sdk 的 focused 实施计划，专注于 Tools 功能和 stdio MCP 传输这两个核心能力。通过分阶段实施，我们将：

1. 保持现有 @tool 装饰器 API 的完全兼容性
2. 实现 stdio 传输协议的稳定支持
3. 提供类型安全和完善的工具调用错误处理
4. 为未来扩展其他 MCP 功能奠定基础

这个 focused 方案将使 BestMCP 成为一个专门的 Tools 功能 MCP 服务器框架，既保持了装饰器的开发友好性，又提供了标准化的 stdio 通信能力。