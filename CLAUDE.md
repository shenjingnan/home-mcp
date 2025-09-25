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
- **禁止使用 `any` 类型**：所有变量和参数必须使用明确的类型定义
  - 如果需要表示未知类型，使用 `unknown` 类型
  - 如果需要表示可选类型，使用 `| undefined` 或可选参数
  - 如果需要表示多种可能类型，使用联合类型（union types）
  - 如果需要表示动态对象，使用 `Record<string, T>` 或索引签名

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

## 部署说明

### 构建产物
- 输出目录：`dist/`
- 可执行文件：`dist/index.js`
- CLI 命令：`home-mcp`（通过 package.json 的 bin 字段配置）

### 运行要求
- Node.js 22+
- 支持 `npx home-mcp` 直接运行
- 通过 stdio 传输层与 MCP 客户端通信