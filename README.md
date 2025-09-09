# Home-MCP

[![Version](https://img.shields.io/badge/version-0.0.1-blue.svg)](https://github.com/shenjingnan/home-mcp)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5.4-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22+-green.svg)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-10.13.1-orange.svg)](https://pnpm.io/)

**Home Assistant MCP Server** - A Model Context Protocol server for smart home integration

## 📖 项目描述

Home-MCP 是一个基于 [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) 的智能家居集成服务器，专为 AI 助手提供标准化的智能家居设备控制和数据访问能力。通过 MCP 协议，AI 助手可以无缝地与 Home Assistant 平台进行交互，实现智能家居设备的控制、状态查询和自动化管理。

## ✨ 功能特性

- 🏠 **Home Assistant 集成**：完整支持 Home Assistant REST API
- 🤖 **MCP 协议支持**：基于官方 @modelcontextprotocol/sdk 实现
- 🔌 **设备控制**：支持灯光、开关、传感器等各类智能设备
- 📊 **状态监控**：实时获取设备状态和传感器数据
- 🔧 **自动化管理**：支持场景控制和自动化规则
- 🌐 **HTTP 服务**：提供 RESTful API 和 streamable HTTP 调用
- 🔒 **安全认证**：支持 Home Assistant 长期访问令牌认证
- 📝 **完整日志**：结构化日志记录和错误处理
- 🧪 **测试覆盖**：完整的单元测试和集成测试

## 🚀 快速开始

### 前置要求

- Node.js 22+
- pnpm 10.13.1+
- Home Assistant 实例（可选，用于完整功能）

### 安装

```bash
# 克隆项目
git clone https://github.com/shenjingnan/home-mcp.git
cd home-mcp

# 安装依赖
pnpm install

# 构建项目
pnpm build
```

### 基本使用

```bash
# 开发模式启动
pnpm dev

# 生产模式启动
pnpm start
```

服务器将在 `http://localhost:3000` 启动。

## ⚙️ 配置说明

### Home Assistant 连接配置

在使用前，你需要配置 Home Assistant 连接信息。创建环境变量或配置文件：

```bash
# 环境变量方式
export HOME_ASSISTANT_URL=http://your-homeassistant:8123
export HOME_ASSISTANT_TOKEN=your-long-lived-access-token
```

### 获取 Home Assistant 访问令牌

1. 登录你的 Home Assistant 实例
2. 进入 **设置** → **人员** → **长期访问令牌**
3. 点击 **创建令牌**，输入令牌名称
4. 复制生成的令牌并保存到配置中

### 配置文件示例

```json
{
  "homeAssistant": {
    "url": "http://homeassistant.local:8123",
    "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "timeout": 5000
  },
  "server": {
    "port": 3000,
    "host": "0.0.0.0"
  }
}
```

## 📚 使用方法

### MCP 客户端集成

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

// 连接到 Home-MCP 服务器
const transport = new StdioClientTransport({
  command: 'node',
  args: ['dist/index.js']
});

const client = new Client({
  name: 'home-assistant-client',
  version: '1.0.0'
}, {
  capabilities: {}
});

await client.connect(transport);
```

### API 示例

#### 获取设备列表

```bash
curl -X GET http://localhost:3000/api/devices
```

#### 控制设备

```bash
curl -X POST http://localhost:3000/api/devices/light.living_room/turn_on \
  -H "Content-Type: application/json" \
  -d '{"brightness": 255, "color_name": "blue"}'
```

#### 获取设备状态

```bash
curl -X GET http://localhost:3000/api/devices/sensor.temperature/state
```

## 🛠️ 开发指南

### 开发环境设置

```bash
# 安装依赖
pnpm install

# 启动开发服务器（支持热重载）
pnpm dev

# 构建项目
pnpm build
```

### 代码规范

项目使用 [Biome](https://biomejs.dev/) 进行代码格式化和 lint 检查：

```bash
# 代码检查
pnpm lint

# 自动修复 lint 问题
pnpm lint:fix

# 代码格式化
pnpm format

# 格式检查
pnpm format:check

# 综合检查和修复
pnpm check:fix
```

### 测试

项目使用 [Vitest](https://vitest.dev/) 作为测试框架：

```bash
# 运行所有测试
pnpm test

# 监听模式运行测试
pnpm test:watch

# 生成测试覆盖率报告
pnpm test:coverage

# 启动测试 UI
pnpm test:ui
```

### 项目结构

```
src/
├── clients/          # 外部服务客户端
├── config/           # 配置管理
├── server/           # HTTP 服务器
├── test/             # 测试文件
├── tools/            # MCP 工具实现
├── types/            # TypeScript 类型定义
├── utils/            # 工具函数
└── index.ts          # 应用入口点
```

### 技术栈

- **运行时**：Node.js 22+
- **语言**：TypeScript 5.5.4
- **框架**：Express.js 5.0.1
- **MCP SDK**：@modelcontextprotocol/sdk 1.17.5
- **测试**：Vitest 1.6.1 + Happy DOM 14.12.3
- **代码规范**：Biome 2.2.3
- **包管理**：pnpm 10.13.1

## 🤝 贡献指南

我们欢迎所有形式的贡献！请遵循以下步骤：

### 提交代码

1. Fork 本仓库
2. 创建特性分支：`git checkout -b feature/amazing-feature`
3. 提交更改：`git commit -m 'Add some amazing feature'`
4. 推送分支：`git push origin feature/amazing-feature`
5. 创建 Pull Request

### 代码规范

- 遵循项目的 TypeScript 和 Biome 配置
- 编写测试用例覆盖新功能
- 更新相关文档
- 确保所有测试通过：`pnpm test`
- 确保代码规范检查通过：`pnpm check`

### 提交信息规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
feat: 添加新功能
fix: 修复 bug
docs: 更新文档
style: 代码格式调整
refactor: 代码重构
test: 添加测试
chore: 构建工具或依赖更新
```

## 📄 许可证

本项目基于 [MIT License](LICENSE) 开源。

## 👨‍💻 作者

**shenjingnan** - [sjn.code@gmail.com](mailto:sjn.code@gmail.com)

## 🔗 相关链接

- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Home Assistant](https://www.home-assistant.io/)
- [Home Assistant REST API](https://developers.home-assistant.io/docs/api/rest/)

## 📊 项目状态

- **版本**：0.0.1 (开发中)
- **状态**：积极开发
- **维护**：是

---

如果你觉得这个项目有用，请给我们一个 ⭐️！
