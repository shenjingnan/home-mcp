# Home Assistant API 测试文档

本文档介绍如何使用 VS Code REST Client 插件对 Home Assistant API 进行测试和调试。

## 概述

本目录包含用于测试 Home Assistant API 的 REST Client 文件，基于 [humao.rest-client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client) VS Code 插件实现。这些文件可以帮助您快速验证 Home Assistant 的各项功能，包括设备控制、状态查询、历史数据获取等。

### 文件结构

```
api/ha/
├── README.md              # 本文档
├── base.http             # 基础 API 测试文件
└── light.http            # 灯光控制 API 测试文件
```

## 快速开始

### 1. 安装 REST Client 插件

在 VS Code 中搜索并安装 `humao.rest-client` 插件。

### 2. 配置环境变量

复制项目根目录下的 `.env.example` 文件为 `.env`：

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入您的 Home Assistant 配置信息：

```env
HA_BASE_URL=http://localhost:8123
HA_TOKEN=your_long_lived_access_token
HA_LIGHT_ENTITY_ID=light.your_light_entity_id
```

#### 获取 Home Assistant 访问令牌

1. 登录 Home Assistant 管理界面
2. 点击左下角用户头像 → 滚动页面到底部 → **创建令牌**
3. 输入令牌名称（如 "API Test"）
4. 复制生成的令牌到 `.env` 文件中的 `HA_TOKEN`

#### 获取设备实体 ID

1. 在 Home Assistant 中进入 **开发者工具** → **状态**
2. 找到您要测试的设备（如灯光）
3. 复制实体 ID（格式通常为 `light.living_room_lamp`）

### 3. 发送请求

在 VS Code 中打开 `.http` 文件，点击请求上方的 "Send Request" 链接即可发送请求并查看响应。

## API 测试文件说明

### base.http - 基础 API 测试

包含 Home Assistant 核心功能的测试接口：

| 功能 | 端点 | 说明 |
|------|------|------|
| 连接测试 | `GET /api/` | 检查 Home Assistant 服务状态 |
| 系统配置 | `GET /api/config` | 获取系统配置信息 |
| 组件列表 | `GET /api/components` | 获取已加载的组件 |
| 事件系统 | `GET /api/events` | 获取事件对象数组 |
| 服务列表 | `GET /api/services` | 获取可用服务列表 |
| 历史数据 | `GET /api/history/period` | 获取状态变化历史 |
| 日志查询 | `GET /api/logbook` | 获取系统日志 |
| 实体状态 | `GET /api/states` | 获取所有实体状态 |
| 错误日志 | `GET /api/error_log` | 获取错误日志 |
| 摄像头 | `GET /api/camera_proxy` | 获取摄像头图像 |
| 日历集成 | `GET /api/calendars` | 获取日历实体和事件 |

### light.http - 灯光控制测试

专门用于测试灯光设备控制的 API：

| 功能 | 方法 | 说明 |
|------|------|------|
| 状态查询 | `GET /api/states/{entityId}` | 获取灯光当前状态 |
| 开灯 | `POST /api/services/light/turn_on` | 打开灯光 |
| 关灯 | `POST /api/services/light/turn_off` | 关闭灯光 |
| 亮度调节 | `POST /api/services/light/turn_on` + brightness | 调节灯光亮度 (0-255) |
| 色温调节 | `POST /api/services/light/turn_on` + color_temp | 调节色温 (mireds) |
| 开尔文色温 | `POST /api/services/light/turn_on` + color_temp_kelvin | 调节色温 (Kelvin) |

## REST Client 使用技巧

### 变量系统

使用 `{{variable}}` 语法引用变量：

```http
@baseUrl = {{$dotenv HA_BASE_URL}}
@token = {{$dotenv HA_TOKEN}}
@entityId = {{$dotenv HA_LIGHT_ENTITY_ID}}

GET {{baseUrl}}/api/states/{{entityId}}
Authorization: Bearer {{token}}
```

### 动态参数

可以使用时间戳等动态参数：

```http
@endTime = {{$datetime iso8601}}
@startTime = {{$datetime (now - 1d) iso8601}}

GET {{baseUrl}}/api/history/period?filter_entity_id={{entityId}}&start_time={{startTime}}&end_time={{endTime}}
```

### 请求体格式

JSON 请求体需要正确设置 Content-Type：

```http
POST {{baseUrl}}/api/services/light/turn_on
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "entity_id": "{{entityId}}",
  "brightness": 128
}
```

## 常见问题

### 连接失败

1. **检查 Home Assistant 是否运行**：访问 `HA_BASE_URL` 确认服务可用
2. **验证令牌**：确认 `HA_TOKEN` 正确且未过期
3. **网络设置**：检查防火墙和网络连接

### 401 未授权错误

- 确认令牌格式正确（无需 Bearer 前缀）
- 检查令牌是否具有足够权限
- 重新生成访问令牌

### 404 实体不存在

- 确认实体 ID 格式正确（如 `light.living_room`）
- 检查设备是否已添加到 Home Assistant
- 在开发者工具 → 状态中确认实体存在

### 400 请求格式错误

- 检查 JSON 格式是否正确
- 确认参数名称和类型正确
- 参考官方 API 文档确认请求格式

## 开发指南

### 添加新的 API 测试

1. 在相应 `.http` 文件中添加新请求
2. 使用注释组织相关功能
3. 添加必要的环境变量
4. 包含错误处理示例

### 调试技巧

1. **查看响应头**：REST Client 会显示完整的响应头信息
2. **格式化 JSON**：使用 VS Code 的 JSON 格式化功能美化响应
3. **环境变量调试**：在请求前输出变量值进行调试

### 最佳实践

1. **安全第一**：不要在代码中硬编码敏感信息
2. **文档同步**：API 变更时及时更新测试文件
3. **版本控制**：`.env` 文件应加入 `.gitignore`
4. **定期验证**：定期运行测试确保 API 功能正常

## 相关资源

- [Home Assistant REST API 官方文档](https://developers.home-assistant.io/docs/api/rest/)
- [VS Code REST Client 插件文档](https://github.com/Huachao/vscode-restclient)
- [Home Assistant 实体状态参考](https://www.home-assistant.io/docs/configuration/state_object/)

## 贡献

如果您发现测试文件有问题或需要添加新的测试用例，请提交 Pull Request 或 Issue。