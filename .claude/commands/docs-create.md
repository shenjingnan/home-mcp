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

## 5. 质量检查与验证

完成文档创建后，请执行以下验证步骤：

### 5.1 基础质量检查
1. **语法检查**：确保MDX语法正确
2. **链接检查**：验证所有内部链接有效
3. **拼写检查**：运行 `pnpm spellcheck`
4. **格式检查**：运行 `pnpm format` 确保代码格式正确
5. **路径别名检查**：确保代码示例使用正确的 `@/xxx` 格式路径别名

#### 5.1.5 路径别名验证（重要！）
为确保文档中的代码示例遵循项目规范，必须进行路径别名检查：

1. **使用 path-alias-validator 技能**：
   ```bash
   skill: path-alias-validator
   ```

2. **检查内容**：
   - 代码示例中的 import 语句
   - 相对路径使用情况
   - 路径别名格式正确性

3. **自动修复**：
   - 将相对路径替换为 `@/xxx` 格式
   - 确保路径映射正确
   - 保留合理的相对路径使用场景

### 5.2 本地验证（重要！）
为了避免Vercel部署报错，必须在本地验证文档：

1. **启动文档服务**：
   ```bash
   nr dev:docs
   ```

2. **等待服务启动**（约10-15秒）

3. **检查服务状态**：
   - 确认无编译错误
   - 确认服务启动成功（通常在 http://localhost:3000）

4. **验证页面访问**：
   ```bash
   # 测试首页访问
   curl -s -o /dev/null -w "%{http_code}" http://localhost:3000

   # 测试新创建的文档页面（根据路径调整）
   curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/docs/[path-to-document]
   ```

5. **验证返回状态码为200**，如果返回500或其他错误，需要修复问题

### 5.3 常见问题排查
如果本地验证失败：

- **MDX语法错误**：检查组件导入是否正确，避免使用有问题的Nextra组件
- **_meta.ts配置错误**：确保新文档已在对应的_meta.ts文件中正确配置
- **Tailwind配置问题**：确保docs/tailwind.config.ts文件存在且配置正确
- **TypeScript配置问题**：检查tsconfig.json中的MDX支持配置

### 5.4 验证成功标准
- [ ] 文档服务启动无报错
- [ ] 首页返回200状态码
- [ ] 新创建的文档页面可以正常访问
- [ ] 无拼写和语法错误
- [ ] 代码示例格式正确
- [ ] **代码示例使用 `@/xxx` 格式路径别名**
- [ ] **无不必要的相对路径导入**
- [ ] **路径别名映射正确且一致**

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