---
description: 生成 changeset 文件
---

我希望你帮我分析当前分支与主分支的代码变更，并在 `.changeset/` 目录中生成一个新的 changeset 文件来描述这些改动。

### 我希望你完成的工作

1. **分析代码变更**：

   - 对比当前分支与主分支（main）的差异
   - 识别所有变更的文件和目录
   - 分析变更的类型和影响范围

2. **确定版本类型**：

   - 根据变更内容判断是 major、minor 还是 patch 版本更新
   - 识别哪些包需要更新版本号（bestmcp, @bestmcp/server, @bestmcp/client）
   - 根据 changeset 配置中的 fixed 包组确定是否需要同时更新多个包

3. **生成 changeset 文件**：

   - 在 `.changeset/` 目录中创建新的 MD 文件
   - 使用合适的文件名格式（类似：pink-hounds-speak.md）
   - 按照 changeset 规范格式编写内容

4. **编写变更描述**：
   - 用中文清晰描述本次变更的主要内容
   - 说明变更的原因和影响
   - 确保描述对用户和开发者都有价值

### changeset 文件格式要求

文件应该遵循以下格式：

```markdown
---
"包名": 版本类型
---

变更描述内容，使用中文编写
```

### 版本类型判断指南

- **major**: 破坏性变更，API 不兼容
- **minor**: 新功能，向后兼容
- **patch**: bug 修复，小的改进

### 提示信息

1. 当前主分支是 main，请确保与最新的远程主分支进行对比
2. changeset 配置中 fixed 了 ["bestmcp", "@bestmcp/server", "@bestmcp/client"]，这意味着这些包通常需要一起更新版本
3. 如果变更涉及多个包，请在文件头部列出所有需要更新的包
4. 变更描述要简洁明了，重点突出用户价值和改进内容
5. 文件名可以使用随机生成的词汇组合（如：pink-hounds-speak.md）

### 我的要求

- 自动分析代码变更，无需手动指定文件
- 确保生成的 changeset 文件格式正确
- 变更描述要使用中文，内容准确
- 如果发现没有实质性变更，请告诉我无需创建 changeset

请开始分析并生成相应的 changeset 文件。
