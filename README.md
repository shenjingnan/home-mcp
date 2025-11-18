# Home-MCP

[![Version](https://img.shields.io/badge/version-0.0.3-blue.svg)](https://github.com/shenjingnan/home-mcp)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7.2-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22+-green.svg)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-9.15.0-orange.svg)](https://pnpm.io/)

**Home Assistant MCP Server** - 基于 Model Context Protocol 的智能家居集成服务器

## 📖 项目描述

Home-MCP 是一个基于 [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) 的智能家居集成服务器，专为 AI 助手提供标准化的 Home Assistant 设备控制和数据访问能力。通过 MCP 协议，AI 助手可以无缝地与 Home Assistant 平台进行交互，实现智能家居设备的控制、状态查询、数据分析和自动化管理。

## ✨ 功能特性

### 🏠 核心 Home Assistant 集成
- **完整 API 支持**：支持 Home Assistant REST API 的全部功能
- **实时状态监控**：获取设备状态、传感器数据和属性信息
- **历史数据查询**：访问设备历史状态变化记录
- **日志记录访问**：查看系统日志和用户操作记录
- **配置管理**：验证和修改 Home Assistant 配置

### 🔌 丰富的工具集
- **设备控制**：支持灯光、开关、传感器、摄像头等各类智能设备
- **语义化灯光控制**：提供直观的灯光设备控制接口
- **摄像头集成**：获取实时摄像头图像和监控数据
- **日历管理**：查询和管理个人及共享日历事件
- **事件系统**：触发自定义事件和处理系统事件

### 🤖 MCP 协议优势
- **标准化接口**：基于官方 `@modelcontextprotocol/sdk` 实现
- **类型安全**：完整的 TypeScript 类型定义和 JSON Schema 验证
- **装饰器支持**：优雅的参数验证和工具定义
- **错误处理**：完善的错误处理和用户友好的错误信息
- **文档驱动**：自动生成工具文档和参数说明

### 🛠️ 开发者友好
- **模块化架构**：清晰的代码组织和组件分离
- **完整测试覆盖**：单元测试和集成测试
- **代码质量工具**：使用 Biome 进行代码规范和格式化
- **详细文档**：完整的 API 文档和使用示例

## 🚀 快速开始

### 前置要求

- Node.js 22+
- pnpm 9.15.0+
- Home Assistant 实例（用于完整功能体验）

### 安装和构建

```bash
# 克隆项目
git clone https://github.com/shenjingnan/home-mcp.git
cd home-mcp

# 安装依赖
pnpm install

# 构建项目
pnpm build

# 启动开发服务器
pnpm dev
```

### Home Assistant 配置

设置环境变量以连接到你的 Home Assistant 实例：

```bash
# 设置 Home Assistant 连接信息
export HA_BASE_URL=http://your-homeassistant:8123
export HA_TOKEN=your-long-lived-access-token
```

### 获取 Home Assistant 访问令牌

1. 登录你的 Home Assistant 实例
2. 进入 **设置** → **人员** → **长期访问令牌**
3. 点击 **创建令牌**，输入令牌名称（如 "MCP Server"）
4. 复制生成的令牌并设置为环境变量

## 📚 可用工具

### 🔧 系统管理工具
- `checkHassAPIService` - 检查 Home Assistant API 服务状态
- `getConfig` - 获取 Home Assistant 配置信息
- `getComponents` - 获取已加载组件列表
- `getServices` - 获取可用服务列表
- `checkConfig` - 验证配置文件正确性

### 📊 数据查询工具
- `getStates` - 获取实体状态信息
- `getHistory` - 查询历史状态数据
- `getLogbook` - 获取系统日志记录
- `getErrorLog` - 获取错误日志
- `getEvents` - 获取事件监听器列表

### 🏠 设备控制工具
- `LightControl` - 语义化灯光控制（支持亮度、色温调节）
- `callServices` - 调用任意 Home Assistant 服务
- `updateState` - 更新或创建实体状态
- `deleteStates` - 删除指定实体

### 📷 媒体和监控工具
- `getCameraProxy` - 获取摄像头实时图像
- `getCalendars` - 查询日历事件

### 🔔 事件和通知工具
- `fireEvents` - 触发自定义事件

## 💡 使用示例

### 基础连接和工具列表

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
  capabilities: {
    tools: {}
  }
});

await client.connect(transport);

// 获取可用工具列表
const { tools } = await client.listTools();
console.log('可用工具:', tools.map(tool => tool.name));
```

### 灯光控制

```typescript
// 开启客厅灯光并设置亮度为 80%
const result = await client.callTool({
  name: 'LightControl',
  arguments: {
    name: '客厅主灯',
    action: 'turn_on',
    brightnessPct: 80
  }
});

console.log('控制结果:', result.content);
```

### 获取设备状态

```typescript
// 获取所有传感器状态
const sensors = await client.callTool({
  name: 'getStates',
  arguments: {}
});

// 筛选温度传感器
const temperatureSensors = sensors.content.filter(sensor =>
  sensor.entity_id.startsWith('sensor.temperature')
);
```

### 查询历史数据

```typescript
// 查询过去24小时温度变化
const history = await client.callTool({
  name: 'getHistory',
  arguments: {
    filter_entity_id: 'sensor.living_room_temperature',
    minimal_response: true
  }
});
```

### 摄像头监控

```typescript
// 获取前门摄像头图像
const cameraImage = await client.callTool({
  name: 'getCameraProxy',
  arguments: {
    camera_entity_id: 'camera.front_door'
  }
});
```

### 日历管理

```typescript
// 获取今日日历事件
const today = new Date();
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);

const calendarEvents = await client.callTool({
  name: 'getCalendars',
  arguments: {
    start_time: today.toISOString(),
    end_time: tomorrow.toISOString()
  }
});
```

## 🛠️ 开发指南

### 开发环境设置

```bash
# 安装依赖
pnpm install

# 启动开发服务器（支持热重载）
pnpm dev

# 构建生产版本
pnpm build

# 启动生产服务器
pnpm start
```

### 代码质量和规范

项目使用 [Biome](https://biomejs.dev/) 进行代码格式化和质量检查：

```bash
# 代码检查和格式化
pnpm check:fix

# 仅检查不修复
pnpm biome check .

# 格式化代码
pnpm biome format --write .
```

### 测试

```bash
# 运行所有测试
pnpm test

# 生成测试覆盖率报告
pnpm test:coverage

# 监听模式运行测试
pnpm test:watch
```

### 拼写检查

```bash
# 检查所有文件拼写
pnpm spellcheck

# 导出拼写错误单词列表
pnpm spellcheck:fix
```

### 项目结构

```
├── src/                    # 源代码目录
│   ├── index.ts           # MCP 服务器入口点
│   ├── types/             # TypeScript 类型定义
│   │   ├── index.ts       # 核心类型定义
│   │   ├── light.ts       # 灯光相关类型
│   │   └── light.test.ts  # 类型测试
│   ├── services/          # 服务实现
│   │   ├── index.ts       # 服务导出
│   │   └── light.ts       # 灯光控制服务
│   ├── utils.ts           # 工具函数
│   ├── index.test.ts      # 集成测试
│   └── test/              # 测试配置
├── config/                # 配置文件
│   ├── biome.json         # 代码质量配置
│   ├── vitest.config.ts   # 测试配置
│   └── cspell.json        # 拼写检查配置
├── docs/                  # 文档站点
│   ├── content/           # 文档内容
│   │   ├── mcp-tools/     # MCP 工具文档
│   │   └── *.mdx          # 页面文件
│   └── package.json       # 文档站点依赖
├── tsconfig.json          # TypeScript 配置
└── package.json           # 项目配置
```

### 技术栈

- **运行时**：Node.js 22+
- **语言**：TypeScript 5.7.2
- **MCP SDK**：@modelcontextprotocol/sdk 2.6.4
- **验证库**：zod 3.24.1
- **测试框架**：Vitest 1.6.1
- **代码质量**：Biome 2.2.4
- **包管理**：pnpm 9.15.0

## 📖 详细文档

完整的使用文档和 API 说明请访问项目文档站点：

- [快速上手](https://your-docs-site.com/quickstart)
- [MCP 工具文档](https://your-docs-site.com/mcp-tools)
- [API 参考](https://your-docs-site.com/api)
- [开发指南](https://your-docs-site.com/development)

## 🤝 贡献指南

我们欢迎所有形式的贡献！

### 贡献流程

1. Fork 本仓库
2. 创建特性分支：`git checkout -b feature/your-feature`
3. 提交更改：`git commit -m 'feat: add amazing feature'`
4. 推送分支：`git push origin feature/your-feature`
5. 创建 Pull Request

### 代码规范

- 遵循项目的 TypeScript 和 Biome 配置
- 编写测试用例覆盖新功能
- 更新相关文档
- 确保所有检查通过：`pnpm check:fix && pnpm test`
- 严格禁止使用 `any` 类型，必须使用明确的类型定义

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

## 🔧 配置说明

### 环境变量

| 变量名 | 必需 | 说明 | 示例 |
|--------|------|------|------|
| `HA_BASE_URL` | 是 | Home Assistant 实例 URL | `http://homeassistant.local:8123` |
| `HA_TOKEN` | 是 | Home Assistant 长期访问令牌 | `eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...` |

### 配置文件

项目使用 `biome.json` 进行代码质量配置，`tsconfig.json` 进行 TypeScript 配置。代码质量相关配置文件位于 `config/` 目录下。

## 📄 许可证

本项目基于 [MIT License](LICENSE) 开源。

## 👨‍💻 作者

**shenjingnan** - [sjn.code@gmail.com](mailto:sjn.code@gmail.com)

## 🔗 相关链接

- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Home Assistant](https://www.home-assistant.io/)
- [Home Assistant REST API](https://developers.home-assistant.io/docs/api/rest/)
- [项目文档](https://your-docs-site.com)

## 📊 项目状态

- **版本**：0.0.3
- **状态**：积极开发
- **维护**：是
- **测试覆盖率**：高
- **类型安全**：完整

## 🌟 致谢

感谢所有为这个项目做出贡献的开发者和用户！

---

如果这个项目对你有帮助，请给我们一个 ⭐️！你的支持是我们持续开发的动力。