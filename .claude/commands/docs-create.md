---
description: 标准化文档创建
argument-hint: [document-type] [document-title]
---

<document-type>$1</document-type>
<document-title>$2</document-title>

我需要在项目中创建一个新的文档。请帮我完成以下任务：

## 1. 确定文档参数
根据我提供的文档类型 `<document-type>` 和标题 `<document-title>`，请：

- **验证文档类型**：确保类型是支持的类型之一
- **确定文件路径**：根据文档类型确定正确的存放位置
- **生成文件名**：基于标题生成合适的文件名（kebab-case格式）

## 2. 支持的文档类型

### mcp-tool - MCP工具文档
- **路径**：`docs/content/mcp-tools/{filename}.mdx`
- **用途**：为新的MCP工具创建完整的使用文档
- **模板内容**：
  - 工具介绍
  - 参数定义表格
  - 使用示例（基础和高级）
  - 错误信息表格
  - 返回值格式

### dev-guide - 开发指南
- **路径**：`docs/content/development/{filename}.mdx`
- **用途**：开发相关的指南文档
- **模板内容**：
  - 背景和目标
  - 实施步骤
  - 代码示例
  - 注意事项

### api-doc - API参考文档
- **路径**：`docs/content/api/{filename}.mdx`
- **用途**：API接口参考文档
- **模板内容**：
  - 接口概述
  - 请求参数
  - 响应格式
  - 示例代码

### user-manual - 用户手册
- **路径**：`docs/content/guides/{filename}.mdx`
- **用途**：用户使用指南
- **模板内容**：
  - 使用场景
  - 操作步骤
  - 常见问题
  - 故障排除

## 3. 文档风格要求

基于项目文档编写经验：

- **简洁直白**：围绕中心内容，避免冗余表述
- **减少emoji使用**：保持专业性，仅在必要情况下使用
- **结构清晰**：使用合适的标题层级和表格
- **代码示例**：提供完整、可运行的代码示例

## 4. 自动更新导航

创建文档后，请自动更新相应的 `_meta.ts` 文件：

- **development/_meta.ts**：开发指南文档
- **mcp-tools/_meta.ts**：MCP工具文档
- **api/_meta.ts**：API文档（如目录不存在则创建）
- **guides/_meta.ts**：用户指南（如目录不存在则创建）

## 5. 质量检查

完成文档创建后，请执行：

1. **语法检查**：确保MDX语法正确
2. **链接检查**：验证所有内部链接有效
3. **拼写检查**：运行 `pnpm spell:check`
4. **文档预览**：确认文档在文档站点中正确显示

## 6. 使用示例

```bash
# 创建MCP工具文档
/docs-create mcp-tool "温湿度传感器控制"

# 创建开发指南
/docs-create dev-guide "Mock模式开发详解"

# 创建API文档
/docs-create api-doc "状态查询接口"

# 创建用户手册
/docs-create user-manual "设备控制入门"
```

请根据我提供的文档类型和标题，创建符合项目标准的文档。