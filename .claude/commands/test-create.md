---
description: 测试用例生成流程
argument-hint: [test-type] [target-file-or-module]
---

<test-type>$1</test-type>
<target-file-or-module>$2</target-file-or-module>

我需要为项目中的代码创建测试用例。请帮我生成完整的测试文件：

## 1. 分析测试需求
基于我提供的测试类型 `<test-type>` 和目标文件/模块 `<target-file-or-module>`：

- **确定测试范围**：分析目标代码的功能和接口
- **识别测试场景**：正常流程、边界条件、错误处理
- **设计Mock策略**：需要模拟的外部依赖和数据

## 2. 支持的测试类型

### mcp-tool - MCP工具测试
- **目标**：MCP工具服务类的完整测试
- **测试重点**：
  - 参数验证（Zod schema）
  - Home Assistant API调用
  - 设备查找和过滤逻辑
  - 错误处理和用户友好的错误消息
- **Mock对象**：HassService、设备状态数据

### service - 服务类测试
- **目标**：业务逻辑服务类的单元测试
- **测试重点**：
  - 业务逻辑正确性
  - 数据转换和处理
  - 异常处理流程
  - 性能和边界条件
- **Mock对象**：外部API、数据库连接

### utility - 工具函数测试
- **目标**：纯函数和工具方法的测试
- **测试重点**：
  - 输入输出正确性
  - 边界值处理
  - 类型安全性
  - 算法效率
- **Mock对象**：通常无需Mock，纯函数测试

### type - 类型定义测试
- **目标**：TypeScript类型和接口的测试
- **测试重点**：
  - 类型构造函数
  - 类型守卫函数
  - 错误类型定义
  - 常量和配置对象
- **Mock对象**：根据具体需求定

## 3. 测试文件结构模板

基于项目测试配置和现有测试模式：

### 3.1 基础结构
```typescript
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
// 导入要测试的模块
import { {TargetClass}, {TargetFunction} } from "../{target-module}";
// 导入类型定义
import type { {TargetType} } from "../{target-module}";

describe("{测试描述}", () => {
  // 测试设置和清理
  beforeEach(() => {
    // 测试前的准备工作
  });

  afterEach(() => {
    // 测试后的清理工作
    vi.clearAllMocks();
  });

  // 测试用例分组
  describe("{功能分组}", () => {
    it("应该正确处理基本场景", async () => {
      // 基础功能测试
    });

    it("应该正确处理边界条件", async () => {
      // 边界条件测试
    });

    it("应该正确处理错误情况", async () => {
      // 错误处理测试
    });
  });
});
```

### 3.2 Mock设置模式
```typescript
// Mock外部依赖
vi.mock("../{dependency-module}", () => ({
  {DependencyClass}: vi.fn(),
  {dependencyFunction}: vi.fn(),
}));

// Mock数据生成
const createMock{TargetType} = (overrides: Partial<{TargetType}> = {}): {TargetType} => ({
  // 默认Mock数据
  ...overrides,
});
```

## 4. 测试覆盖要求

基于项目覆盖率阈值（80%函数、行、语句，70%分支）：

### 4.1 必须覆盖的场景
- **正常流程**：所有主要功能路径
- **边界条件**：最小值、最大值、空值、null/undefined
- **错误处理**：所有异常分支和错误码
- **异步操作**：Promise、async/await的各种状态

### 4.2 测试数据设计
- **有效数据**：符合预期的正常输入
- **无效数据**：各种格式错误的输入
- **边界数据**：临界值和极值
- **特殊数据**：null、undefined、空字符串、空数组

## 5. 不同测试类型的实现策略

### 5.1 MCP工具测试
```typescript
describe("{ToolName}Service", () => {
  let mockHassService: any;

  beforeEach(() => {
    mockHassService = {
      getStates: vi.fn(),
      callServices: vi.fn(),
    };
    {ToolName}Service.setHassService(mockHassService);
  });

  describe("{ToolName}", () => {
    it("应该正确验证输入参数", async () => {
      // 参数验证测试
    });

    it("应该正确调用Home Assistant服务", async () => {
      // API调用测试
    });

    it("应该正确处理设备未找到的情况", async () => {
      // 错误处理测试
    });
  });
});
```

### 5.2 工具函数测试
```typescript
describe("{UtilityFunction}", () => {
  describe("参数验证", () => {
    it("应该接受有效输入", () => {
      // 有效输入测试
    });

    it("应该拒绝无效输入", () => {
      // 无效输入测试
    });
  });

  describe("功能正确性", () => {
    it("应该返回正确结果", () => {
      // 结果正确性测试
    });

    it("应该处理边界情况", () => {
      // 边界情况测试
    });
  });
});
```

### 5.3 类型定义测试
```typescript
describe("{Type} Types", () => {
  describe("{ErrorType}", () => {
    it("应该创建正确的错误实例", () => {
      const error = new {ErrorType}("message", "CODE");
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe("{ErrorType}");
    });
  });

  describe("{ConfigType}", () => {
    it("应该包含所有必需字段", () => {
      // 配置对象测试
    });
  });
});
```

## 6. Mock数据生成

### 6.1 Home Assistant状态数据
```typescript
const createMockHassState = (overrides: Partial<HassState> = {}): HassState => ({
  entity_id: "light.test_light",
  state: "off",
  attributes: {
    friendly_name: "Test Light",
    supported_features: 1,
  },
  last_changed: new Date().toISOString(),
  last_updated: new Date().toISOString(),
  ...overrides,
});
```

### 6.2 设备列表数据
```typescript
const createMockDeviceList = (count: number = 3): HassState[] =>
  Array.from({ length: count }, (_, i) =>
    createMockHassState({
      entity_id: `light.test_light_${i + 1}`,
      attributes: { friendly_name: `Test Light ${i + 1}` },
    })
  );
```

## 7. 测试执行命令

### 7.1 运行测试
```bash
# 运行所有测试
pnpm test

# 运行特定测试文件
pnpm test src/{module}/{target}.test.ts

# 监视模式
pnpm test:watch

# Mock模式测试
pnpm test:mock
```

### 7.2 覆盖率检查
```bash
# 生成覆盖率报告
pnpm test:coverage

# 检查覆盖率阈值
coverage thresholds: 80% functions, lines, statements; 70% branches
```

## 8. 质量保证检查

测试文件生成后，请执行以下检查：

### 8.1 代码质量
```bash
pnpm type:check      # TypeScript类型检查
pnpm lint:fix        # 代码规范检查
pnpm spell:check     # 拼写检查
```

### 8.2 测试质量
- 所有测试用例应该独立且可重复执行
- Mock数据应该真实且有意义
- 测试描述应该清晰易懂
- 断言应该具体且有意义

## 9. 使用示例

```bash
# 为MCP工具创建测试
/test-create mcp-tool "services/temperature-sensor"

# 为工具函数创建测试
/test-create utility "utils/data-formatter"

# 为类型定义创建测试
/test-create type "types/switch"

# 为服务类创建测试
/test-create service "services/device-manager"
```

## 10. 测试最佳实践

### 10.1 测试命名
- 使用描述性的测试名称
- 采用"应该...当..."的命名模式
- 包含测试的具体场景和预期结果

### 10.2 测试结构
- 使用AAA模式：Arrange（准备）、Act（执行）、Assert（断言）
- 每个测试用例只验证一个行为
- 使用有意义的测试数据

### 10.3 Mock使用
- 只Mock外部依赖，不测试实现细节
- Mock行为应该真实且一致
- 在测试后清理Mock状态

请根据我提供的测试类型和目标，生成符合项目标准的完整测试文件。