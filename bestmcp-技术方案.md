# bestmcp 包技术方案（简化版）

## 1. 项目概述

### 1.1 背景分析

`bestmcp` 是一个简化的 MCP (Model Context Protocol) 服务器开发框架，基于 TypeScript 装饰器模式，旨在提供最基础的 MCP 服务器开发能力。当前项目结构需要简化，确保核心导入功能正常工作。

### 1.2 目标定位

- **简化结构**：只包含必要的核心功能
- **基础导入**：确保 `import { BestMCP } from 'bestmcp'` 正常工作
- **最小依赖**：只保留最基础的依赖项
- **快速可用**：专注于基础功能的可用性

## 2. 现状分析

### 2.1 当前实现状态

#### 已实现功能
- ✅ 基础装饰器系统（@tool, @resource, @prompt）
- ✅ 元数据管理和反射机制
- ✅ 基础的 JSON Schema 生成
- ✅ JSDoc 解析和参数提取
- ✅ 简单的服务注册机制

#### 存在问题
- ❌ **包结构复杂**：当前实现包含多层目录结构
- ❌ **导入路径问题**：需要确保 `import { BestMCP } from 'bestmcp'` 正常工作
- ❌ **依赖管理**：需要简化依赖项
- ❌ **构建流程**：需要简单的构建配置

### 2.2 简化目标

1. **结构简化**
   - 只保留单个 `index.ts` 文件
   - 移除复杂的目录结构
   - 简化导出方式

2. **功能简化**
   - 只保留核心装饰器和 BestMCP 类
   - 移除高级功能（插件、中间件等）
   - 专注于基础导入功能

3. **配置简化**
   - 简化 package.json 配置
   - 减少依赖项数量
   - 简化构建流程

## 3. 技术方案设计

### 3.1 整体架构

```mermaid
graph TB
    A[bestmcp 包] --> B[index.ts]
    B --> B1[装饰器系统]
    B --> B2[BestMCP 类]
    B --> B3[工具函数]
    
    B1 --> B11[@tool]
    B1 --> B12[@resource]
    B1 --> B13[@prompt]
    
    B2 --> B21[注册功能]
    B2 --> B22[执行功能]
    B2 --> B23[基础配置]
    
    B3 --> B31[参数提取]
    B3 --> B32[类型映射]
```

### 3.2 简化后的核心组件

#### 3.2.1 单文件结构

将所有功能集中在一个 `index.ts` 文件中：

```typescript
// packages/bestmcp/index.ts
import "reflect-metadata";

// 基础类型定义
interface ToolMetadata {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, any>;
    required: string[];
  };
}

// 装饰器实现
export function tool(options?: { name?: string; description?: string }) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    // 简化的装饰器逻辑
    const metadata = generateToolMetadata(target, propertyKey, descriptor, options);
    registerToolMetadata(target.constructor, metadata);
  };
}

// BestMCP 核心类
export class BestMCP {
  private name: string;
  private version: string;
  private tools: Map<string, any> = new Map();

  constructor(name: string, version: string = "1.0.0") {
    this.name = name;
    this.version = version;
  }

  register(serviceClass: new () => any) {
    const instance = new serviceClass();
    const tools = Reflect.getMetadata(TOOLS_METADATA, serviceClass) || [];
    tools.forEach((tool: any) => {
      this.tools.set(tool.metadata.name, {
        metadata: tool.metadata,
        handler: tool.method.bind(instance),
      });
    });
  }

  run() {
    console.log(`Starting ${this.name} v${this.version}`);
    console.log(`Registered ${this.tools.size} tools`);
  }
}

// 工具函数
function generateToolMetadata(...) {
  // 简化的元数据生成逻辑
}
```

### 3.3 简化的项目结构

```
packages/bestmcp/
├── index.ts                  # 唯一的核心文件
├── package.json              # 包配置
├── tsconfig.json             # TypeScript 配置
└── README.md                 # 基础文档
```

## 4. 实施方案

### 4.1 第一阶段：简化实现（1周）

#### 4.1.1 简化包结构
- 将所有功能合并到单个 `index.ts` 文件
- 移除复杂的目录结构
- 简化导出方式

#### 4.1.2 修复导入问题
- 确保 `import { BestMCP } from 'bestmcp'` 正常工作
- 配置正确的 package.json 入口点
- 设置正确的 TypeScript 配置

#### 4.1.3 简化依赖
- 只保留必要的依赖项（reflect-metadata）
- 移除不必要的开发依赖
- 简化构建配置

### 4.2 第二阶段：基础功能完善（1-2周）

#### 4.2.1 完善核心功能
- 确保装饰器正常工作
- 完善 BestMCP 类的基础功能
- 添加基本的错误处理

#### 4.2.2 验证导入功能
- 测试从项目根目录的导入
- 确保 src/index.ts 能够正确导入 BestMCP
- 验证基本的工具注册和调用

#### 4.2.3 简化配置
- 简化 package.json 配置
- 移除复杂的构建流程
- 设置基本的 TypeScript 配置

### 4.3 第三阶段：发布准备（1周）

#### 4.3.1 包配置
- 设置正确的发布配置
- 添加基本的文档
- 确保版本管理

#### 4.3.2 测试验证
- 创建基础测试用例
- 验证所有功能正常工作
- 确保构建产物正确

## 5. 发布策略

### 5.1 版本管理
- 使用语义化版本控制（SemVer）
- 初始版本：0.1.0
- 简化版本发布流程

### 5.2 简化的包配置
```json
{
  "name": "bestmcp",
  "version": "0.1.0",
  "description": "Best MCP - A simplified Model Context Protocol server framework for TypeScript",
  "main": "index.ts",
  "types": "index.ts",
  "exports": {
    ".": {
      "import": "./index.ts",
      "require": "./index.ts",
      "types": "./index.ts"
    }
  },
  "files": ["index.ts"],
  "keywords": [
    "mcp",
    "modelcontextprotocol",
    "typescript",
    "decorators",
    "server"
  ],
  "author": "shenjingnan <sjn.code@gmail.com>",
  "license": "MIT",
  "dependencies": {
    "reflect-metadata": "^0.2.2"
  },
  "devDependencies": {
    "@types/node": "^22.0.2",
    "typescript": "^5.5.4"
  }
}
```

### 5.3 简化的构建配置
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "outDir": "./dist",
    "rootDir": "./",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["index.ts"],
  "exclude": ["node_modules", "dist"]
}
```

## 6. 兼容性考虑

### 6.1 环境兼容性
- **Node.js**: >= 18.0.0
- **TypeScript**: >= 5.0.0
- **装饰器**: 需要启用 `experimentalDecorators` 和 `emitDecoratorMetadata`

### 6.2 导入兼容性
- 确保从项目根目录能够正确导入：`import { BestMCP } from 'bestmcp'`
- 支持 CommonJS 和 ES Modules
- 兼容现有的 MCP 客户端

### 6.3 简化的测试策略
- **基础测试**: 验证导入功能
- **装饰器测试**: 验证工具注册
- **集成测试**: 验证基本功能

## 7. 简化的成功指标

### 7.1 核心指标
- ✅ `import { BestMCP } from 'bestmcp'` 成功
- ✅ 装饰器功能正常工作
- ✅ 基本的工具注册和调用

### 7.2 简化的时间规划
- **第一阶段**（1周）：简化实现
- **第二阶段**（1-2周）：基础功能完善
- **第三阶段**（1周）：发布准备
- **总计**：3-4周

### 7.3 验收标准
- 包结构简洁明了
- 只包含必要的核心功能
- 能够正常导入和使用
- 没有复杂的依赖关系

## 8. 总结

`bestmcp` 项目经过简化后，将专注于提供最基础的 MCP 服务器开发功能。通过简化的架构和实现，确保：

1. **简单易用**：单一文件结构，易于理解和维护
2. **导入兼容**：确保从项目根目录能够正确导入
3. **最小依赖**：只保留必要的依赖项
4. **快速可用**：专注于基础功能的实现

简化的技术方案提供了明确的实施路径，建议按照阶段性计划推进，快速实现可用的基础版本。