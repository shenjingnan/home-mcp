const fs = require("node:fs");

// 读取自定义模板文件
const commitTemplate = fs.readFileSync("config/changelog-commit.hbs", "utf8");

module.exports = {
  git: {
    commitMessage: "chore: release v${version}",
    tagName: "v${version}",
    pushArgs: ["--follow-tags"],
    requireCleanWorkingDir: true,
    requireUpstream: true,
    commit: true,
    tag: true,
    push: true,
  },
  github: {
    release: true,
    releaseName: "🚀 v${version}",
    releaseNotes: "npx conventional-changelog-cli -p conventionalcommits",
  },
  npm: {
    publish: true,
    publishArgs: ["--access", "public"],
    skipChecks: true,
  },
  plugins: {
    "@release-it/conventional-changelog": {
      infile: "docs/content/changelog.mdx",
      releaseCommitMessageFormat: "chore: release v${version}",
      ignoreRecommendedBump: false,
      strictSemVer: true,
      preset: {
        name: "conventionalcommits",
        types: [
          {
            type: "feat",
            section: "**新特性**",
          },
          {
            type: "fix",
            section: "**问题修复**",
          },
          {
            type: "docs",
            section: "**文档更新**",
          },
          {
            type: "style",
            section: "**代码规范**",
          },
          {
            type: "refactor",
            section: "**代码重构**",
          },
          {
            type: "perf",
            section: "**性能优化**",
          },
          {
            type: "test",
            section: "**测试改进**",
          },
          {
            type: "build",
            section: "**构建系统**",
          },
          {
            type: "ci",
            section: "**CI/CD**",
            hidden: true,
          },
          {
            type: "chore",
            section: "**日常任务**",
            hidden: true,
          },
          {
            type: "revert",
            section: "**版本回退**",
          },
        ],
      },
      writerOpts: {
        commitsSort: ["scope", "subject"],
        groupBy: "type",
        commitPartial: commitTemplate,
        mainTemplate: `---
title: 更新日志
description: 记录项目的所有重要变更
---

# 更新日志

本文档记录了项目的所有重要变更。

{{#each tagGroups}}
{{#if hasCommits}}
## {{#if @root.compareLinks.previous}}[{{version}}]({{href}}){{else}}{{version}}{{/if}} ({{date}})

{{#if body}}
{{body}}

{{/if}}
{{#each commitGroups}}

### {{title}}

{{#each commits}}
{{> commit}}
{{/each}}
{{/each}}
{{/if}}
{{/each}}`,
        headerPartial: `---
title: 更新日志
description: 记录项目的所有重要变更
---

# 更新日志

本文档记录了项目的所有重要变更。

`,
        footerPartial: "",
      },
    },
  },
  hooks: {
    "before:init": [
      "pnpm audit --audit-level moderate",
      "pnpm test",
      "pnpm type:check",
      "pnpm check", // 只检查不修复，避免文件被修改
    ],
    "before:release": [
      'git status --porcelain || echo "Git状态检查完成"',
      "pnpm clean",
      "pnpm build",
      'git status --porcelain || echo "构建后Git状态检查完成"',
    ],
    "after:bump": ["pnpm build"],
    "after:release": ['echo "🎉 版本 v${version} 发布完成！"'],
  },
};
