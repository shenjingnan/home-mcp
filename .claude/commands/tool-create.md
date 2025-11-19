---
description: MCP工具开发流程
argument-hint: [tool-name] [tool-description]
---

<tool-name>$1</tool-name>
<tool-description>$2</tool-description>

我需要在项目中创建一个新的MCP工具。请帮我完成完整的开发流程：

## 1. 分析需求
基于我提供的工具名称 `<tool-name>` 和描述 `<tool-description>`：

- **确定工具类型**：属于哪种Home Assistant设备或服务控制
- **分析参数需求**：确定输入参数的类型和验证规则
- **设计API接口**：定义工具的方法签名和返回格式

## 2. 生成文件结构
创建以下标准文件：

```
src/
├── services/
│   └── {kebab-tool-name}.ts          # 工具实现类
├── types/
│   └── {kebab-tool-name}.ts          # 类型定义
└── test/
    └── {kebab-tool-name}.test.ts     # 测试文件

docs/content/mcp-tools/
└── {kebab-tool-name}.mdx             # 工具文档
```

## 3. 服务类实现模式

基于现有 `LightService` 模式：

### 3.1 基础结构
```typescript
import { Param, Tool } from "bestmcp";
import { z } from "zod";
import type { HassState, ServiceData } from "../types";

interface IHassService {
  getStates(params?: { entity_id?: string }): Promise<HassState[]>;
  callServices(params: { domain: string; service: string; service_data: Record<string, unknown> }): Promise<{
    changed_states?: HassState[];
  }>;
}

export class {ToolName}Service {
  private static hassServiceInstance: IHassService | null = null;

  public static setHassService(hassService: IHassService) {
    {ToolName}Service.hassServiceInstance = hassService;
  }

  private getHassService(): IHassService {
    if (!{ToolName}Service.hassServiceInstance) {
      throw new Error("{ToolName}Service 未初始化，请先调用 setHassService()");
    }
    return {ToolName}Service.hassServiceInstance;
  }

  @Tool("{工具描述}")
  public async {ToolName}(
    // 参数定义...
  ) {
    // 实现逻辑...
  }
}
```

### 3.2 标准方法模式
- **设备查找**：`getEntitiesByName()` 方法
- **参数验证**：使用 Zod schema 进行严格类型检查
- **错误处理**：统一的错误处理和用户友好的错误消息
- **状态更新**：调用 Home Assistant 服务并返回结果

## 4. 类型定义标准

基于现有 `types/light.ts` 模式：

### 4.1 基础类型
- **参数类型**：工具方法的输入参数接口
- **返回类型**：工具方法的返回值接口
- **错误类型**：自定义错误类和错误代码
- **配置类型**：预设配置和常量定义

### 4.2 Home Assistant 集成
- **服务参数**：`Hass{ToolName}ServiceParams` 接口
- **状态信息**：`{ToolName}DeviceInfo` 接口
- **控制结果**：`{ToolName}ControlResult` 接口

## 5. 测试文件模式

基于现有测试结构：

### 5.1 测试覆盖范围
- **参数验证测试**：Zod schema 验证逻辑
- **服务调用测试**：Home Assistant API 交互
- **错误处理测试**：各种错误场景
- **边界条件测试**：极值和异常输入

### 5.2 Mock 策略
- **HassService Mock**：模拟 Home Assistant 服务
- **状态数据 Mock**：模拟设备状态数据
- **API 响应 Mock**：模拟 HTTP 响应

## 6. 文档生成标准

基于现有 `light-control.mdx` 模式：

### 6.1 文档结构
- **工具介绍**：功能概述和使用场景
- **参数定义**：完整的参数表格和说明
- **使用示例**：基础和高级使用案例
- **错误信息**：错误类型表格和处理建议
- **返回值格式**：成功和错误响应示例

### 6.2 代码示例
- **基础用法**：简单的开关控制示例
- **高级功能**：复杂参数组合使用
- **错误处理**：异常情况的处理示例

## 7. 开发流程

### 7.1 代码生成步骤
1. **创建类型定义**：`src/types/{tool-name}.ts`
2. **实现服务类**：`src/services/{tool-name}.ts`
3. **编写测试用例**：`src/test/{tool-name}.test.ts`
4. **生成文档**：`docs/content/mcp-tools/{tool-name}.mdx`

### 7.2 集成步骤
1. **更新服务导出**：在 `src/services/index.ts` 中添加导出
2. **注册到HassService**：在 `src/index.ts` 中注册工具
3. **更新文档导航**：在 `docs/content/mcp-tools/_meta.ts` 中添加条目

## 8. 质量保证

### 8.1 代码检查
```bash
pnpm type:check      # TypeScript 类型检查
pnpm lint:fix        # 代码规范检查
pnpm spell:check     # 拼写检查
```

### 8.2 测试验证
```bash
pnpm test           # 运行所有测试
pnpm test:coverage  # 生成覆盖率报告
```

### 8.3 构建验证
```bash
pnpm build          # 确保构建成功
pnpm start          # 验证运行时正常
```

## 9. 支持的设备类型

基于项目经验，优先支持以下设备类型：

- **灯光设备**（已有示例）
- **传感器设备**：温度、湿度、运动、门窗传感器
- **开关设备**：普通开关、智能插座
- **摄像头设备**：监控摄像头、门铃摄像头
- **恒温器设备**：空调、暖气、温控器
- **安防设备**：门锁、警报器、烟雾探测器

## 10. 使用示例

```bash
# 创建传感器控制工具
/tool-create "temperature-sensor" "温湿度传感器数据读取和控制"

# 创建开关控制工具
/tool-create "smart-switch" "智能开关控制工具"

# 创建摄像头控制工具
/tool-create "camera-control" "摄像头控制和图像获取工具"
```

请根据我提供的工具名称和描述，按照以上标准流程创建完整的MCP工具。