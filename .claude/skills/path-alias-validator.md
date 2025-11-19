---
description: 路径别名系统检查与修复
---

我是路径别名系统检查与修复技能，专门针对 Home-MCP 项目的 `@/xxx` 格式路径别名系统进行检查、验证和优化。

## 技能能力

### 1. 路径别名使用检查
核心能力：检测项目中相对路径的使用情况，并提供别名替换建议。

#### 检测范围
- **跨目录相对路径**：`../` 格式的导入语句
- **同级目录引用**：`./` 格式的导入语句
- **混合使用情况**：同一文件中别名和相对路径混用
- **配置一致性**：各配置文件中别名配置的一致性检查

#### 检查规则
```typescript
// ✅ 推荐的别名使用
import { LightService } from "@/services";
import type { HassState } from "@/types";
import { formatDate } from "@/utils";

// ❌ 需要修复的相对路径
import { LightService } from "../services";
import type { HassState } from "../types";
import { formatDate } from "./utils";
```

### 2. 别名配置验证
检查项目配置文件中的路径别名设置是否正确和一致。

#### 验证项目
- **tsconfig.json** - TypeScript 编译器配置
- **vitest.config.ts** - 测试框架配置
- **tsup.config.ts** - 构建工具配置
- **package.json** - 导入映射配置（如存在）

#### 标准别名映射
```typescript
{
  "@/*": ["*"],                    // 根目录快速访问
  "@/types/*": ["types/*"],        // 类型定义
  "@/utils/*": ["utils/*"],        // 工具函数
  "@/services/*": ["services/*"],  // 服务层
  "@/mocks/*": ["mocks/*"],        // Mock 数据
  "@/test/*": ["test/*"]           // 测试配置
}
```

### 3. 自动修复建议
为检测到的问题提供具体的修复建议和代码示例。

#### 修复示例
```typescript
// 原始代码
import { UserService } from "../services/user";
import type { APIResponse } from "../types/api";
import { formatDate } from "./utils/date";

// 修复后
import { UserService } from "@/services/user";
import type { APIResponse } from "@/types/api";
import { formatDate } from "@/utils/date";
```

## 使用方法

### 基础检查
```
请检查当前项目的路径别名使用情况，识别所有需要修复的相对路径。
```

### 配置验证
```
请验证项目中所有配置文件的路径别名设置是否一致和正确。
```

### 自动修复
```
请帮我修复检测到的路径别名问题，自动替换相对路径为 @/xxx 格式的别名。
```

### 特定文件检查
```
请检查 src/services/ 目录下的所有文件，确保它们正确使用路径别名。
```

## 检查流程

### 1. 扫描阶段
- 遍历项目中的所有 TypeScript/JavaScript 文件
- 识别所有 import 和 export 语句
- 提取相对路径使用情况

### 2. 分析阶段
- 分析相对路径的目标位置
- 确定应该使用的别名
- 识别例外情况（紧密相关的模块）

### 3. 验证阶段
- 检查配置文件的一致性
- 验证修复建议的正确性
- 确保不会破坏现有功能

### 4. 报告阶段
- 生成详细的问题报告
- 提供具体的修复建议
- 标记优先级和影响范围

## 例外情况

以下情况下相对路径是可以接受的：

1. **紧密相关的模块**
```typescript
// light.test.ts 可以使用相对路径导入 light.ts
import { LightService } from "./light";
```

2. **同目录下的辅助函数**
```typescript
// 同一目录下的工具函数
import { helperFunction } from "./helpers";
```

3. **动态导入的特殊情况**
```typescript
// 运行时动态导入
const module = await import(`../modules/${moduleName}`);
```

## 工具集成

### 与其他技能的协作
- **type-validator** - 确保别名使用不会破坏类型安全
- **mock-generator** - 确保 Mock 数据正确使用别名导入
- **api-docs** - 确保生成的文档反映正确的路径结构

### CI/CD 集成
可以作为 CI 流程的一部分，自动检查新代码是否遵循路径别名规范。

## 最佳实践建议

### 1. 导入顺序
```typescript
// 1. Node.js 内置模块
import { fs } from "node:fs";

// 2. 外部依赖
import express from "express";

// 3. 路径别名导入
import { UserService } from "@/services";
import type { HassState } from "@/types";

// 4. 相对路径（仅在必要时）
import { helperFunction } from "./helpers";
```

### 2. 类型导入优先
```typescript
// ✅ 推荐
import type { HassState } from "@/types";

// ❌ 避免
import { HassState } from "@/types";
```

### 3. 一致性原则
同一文件中对同一目录的模块使用一致的导入方式。

## 验证检查清单

- [ ] 所有跨目录导入都使用 `@/xxx` 格式
- [ ] 配置文件中的别名设置一致
- [ ] 没有与 npm 包名冲突的别名
- [ ] IDE 能正确识别和跳转别名路径
- [ ] 构建和测试都能正常运行
- [ ] 代码审查规则包含别名检查

通过这个技能的帮助，可以确保项目始终遵循路径别名最佳实践，提高代码质量和可维护性。