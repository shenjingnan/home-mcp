# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

Home-MCP 是一个基于 Model Context Protocol (MCP) 的智能家居集成服务器，旨在为 AI 助手提供标准化的 Home Assistant 设备控制接口。当前实现包含基础的数学运算工具（add、subtract），为后续扩展智能家居功能做准备。

## 开发命令

### 基础命令
```bash
# 构建项目
pnpm build

# 开发模式（热重载）
pnpm dev

# 生产模式启动
pnpm start

# 运行测试
pnpm test

# 测试覆盖率
pnpm test:coverage
```

### 代码规范
```bash
# 代码检查
pnpm lint

# 自动修复
pnpm lint:fix

# 格式化代码
pnpm format

# 综合检查和修复
pnpm check:fix
```

### 拼写检查
```bash
# 检查所有文件的拼写
pnpm spellcheck

# 仅检查源代码拼写
pnpm spellcheck:src

# 仅检查文档拼写
pnpm spellcheck:docs

# 导出拼写错误单词列表
pnpm spellcheck:fix
```

## 技术架构

### 核心组件
- **MCP 服务器**：使用 `@modelcontextprotocol/sdk` 实现的 stdio 服务器
- **工具系统**：基于 MCP 协议的工具定义和调用处理
- **类型安全**：完整的 TypeScript 类型定义和 JSON Schema 验证

### 项目结构
```
src/
├── index.ts          # MCP 服务器入口点，包含工具定义和请求处理
```

### 关键实现
- **服务器配置**：`src/index.ts:7-17` - MCP 服务器基础配置
- **工具列表**：`src/index.ts:20-61` - 可用工具的定义和 schema
- **请求处理**：`src/index.ts:64-119` - 工具调用逻辑和错误处理
- **启动逻辑**：`src/index.ts:121-130` - 服务器启动和错误处理

## 开发指南

### 添加新工具
1. 在 `ListToolsRequestSchema` 处理器中添加工具定义
2. 在 `CallToolRequestSchema` 处理器中实现工具逻辑
3. 添加适当的参数验证和错误处理
4. 返回标准格式的响应

### 类型定义
- 使用 TypeScript 严格模式
- 所有工具参数必须有完整的 JSON Schema 定义
- 错误处理必须包含类型检查
- **严格禁止使用 `any` 类型**：所有变量和参数必须使用明确的类型定义，违反此规则将导致 CI 检查失败
  - 如果需要表示未知类型，使用 `unknown` 类型
  - 如果需要表示可选类型，使用 `| undefined` 或可选参数
  - 如果需要表示多种可能类型，使用联合类型（union types）
  - 如果需要表示动态对象，使用 `Record<string, T>` 或索引签名
  - 测试代码中使用 `vi.spyOn` 等 mock 操作时，通过 `applyTestMocks` 工具函数避免 `any` 类型
  - **例外情况**：仅在特殊可控情况下使用 `@ts-expect-error` 注释明确标记，并说明使用原因
- **测试中的类型安全**：
  - 使用项目提供的 `test-types.ts` 中的类型安全工具函数
  - 避免直接使用 `(obj as any)` 进行类型断言
  - 使用 `asTestableMCP`、`getTransportManager`、`setCurrentTransport` 等辅助函数
  - 访问私有成员时使用适当的接口定义而非 `any` 类型
- **代码检查工具**：
  - 项目使用 Biome 而非 ESLint 进行代码检查和格式化
  - 禁止使用 `eslint-disable` 注释，应使用 Biome 兼容的注释格式
  - Biome 配置中的 `noExplicitAny` 规则设置为 `error` 级别

### 测试
- 使用 Vitest 测试框架
- 测试文件应放在 `src/` 目录下，使用 `.test.ts` 或 `.spec.ts` 后缀
- 覆盖率报告通过 `pnpm test:coverage` 生成

## 配置说明

### TypeScript 配置
- 目标版本：ES2022
- 严格模式：启用所有严格类型检查
- 模块解析：Node.js 风格，支持路径别名（@/*）
- 输出格式：CommonJS，生成类型声明文件

### 包管理
- 使用 pnpm 作为包管理器
- 依赖版本锁定在 `pnpm-lock.yaml`
- 开发依赖包含完整的工具链

## Claude 辅助工具

项目配置了多种 Slash Commands 和 Skills 来辅助开发和维护工作。

### Slash Commands

#### 文档和开发工具
- **`/docs-create [type] [title]`** - 标准化文档创建
  - 支持类型：`mcp-tool`、`dev-guide`、`api-doc`、`user-manual`
  - 自动生成符合项目风格的模板
  - 自动更新导航文件
  - 示例：`/docs-create mcp-tool "温湿度传感器控制"`

- **`/tool-create [name] [description]`** - MCP工具开发流程
  - 生成完整的MCP工具代码结构
  - 包含服务类、类型定义、测试文件、文档
  - 符合项目严格类型要求
  - 示例：`/tool-create "temperature-sensor" "温湿度传感器数据读取和控制"`

- **`/test-create [type] [target]`** - 测试用例生成流程
  - 支持类型：`mcp-tool`、`service`、`utility`、`type`
  - 生成符合Vitest框架的测试用例
  - 包含Mock数据和边界条件测试
  - 确保达到80%+覆盖率要求
  - 示例：`/test-create mcp-tool "services/temperature-sensor"`

#### 现有命令
- **`/fix-test [file]`** - 修复失败的测试用例
- **`/gen-tech`** - 编写技术方案
- **`/gen-analyze [problem]`** - 问题分析
- **`/gen-commit`** - 生成代码评审友好的commit信息
- **`/fix-audit`** - 安全审计
- **`/fix-github-comment [pr-number]`** - 获取GitHub PR的Copilot评论并分析修复问题

### Skills

#### 开发辅助技能
- **`mock-generator`** - Home Assistant模拟数据生成
  - 支持8种设备类型：灯光、传感器、开关、二进制传感器、摄像头、恒温器、覆盖器、设备追踪器
  - 生成符合Home Assistant API规范的测试数据
  - 包含历史数据、服务调用模拟、日志记录生成
  - 提供完整的TypeScript类型定义

- **`type-validator`** - TypeScript严格模式检查
  - 检测和修复所有`any`类型使用
  - 确保类型定义完整性
  - 集成Zod验证和Biome配置
  - 提供类型安全的修复建议

- **`api-docs`** - 文档自动生成
  - 从源代码提取API信息
  - 生成符合Nextra标准的MDX文档
  - 自动生成示例代码和类型文档
  - 支持文档同步和持续更新

### 使用方式

在对话中直接调用命令或技能：

```bash
# 创建新工具的完整开发流程
/tool-create "smart-switch" "智能开关控制"
/docs-create mcp-tool "智能开关控制工具"
/test-create mcp-tool "services/smart-switch"

# 生成测试数据和验证类型
skill: mock-generator
skill: type-validator

# 自动生成API文档
skill: api-docs
```

## 部署说明

### 构建产物
- 输出目录：`dist/`
- 可执行文件：`dist/index.js`
- CLI 命令：`home-mcp`（通过 package.json 的 bin 字段配置）

### 运行要求
- Node.js 22+
- 支持 `npx home-mcp` 直接运行
- 通过 stdio 传输层与 MCP 客户端通信