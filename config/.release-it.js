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
          },
          {
            type: "fix",
          },
          {
            type: "docs",
          },
          {
            type: "style",
          },
          {
            type: "refactor",
          },
          {
            type: "perf",
          },
          {
            type: "test",
          },
          {
            type: "build",
          },
          {
            type: "ci",
            hidden: true,
          },
          {
            type: "chore",
            hidden: true,
          },
          {
            type: "revert",
          },
        ],
        issueUrlFormat: "https://github.com/shenjingnan/home-mcp/pull/{{id}}",
        commitUrlFormat: "https://github.com/shenjingnan/home-mcp/commit/{{hash}}",
      },
      writerOpts: {
        commitsSort: ["scope", "subject"],
        groupBy: false,
        commitPartial: commitTemplate,
        mainTemplate: `# 更新日志

{{#each tagGroups}}
{{#if hasCommits}}
## {{#if @root.compareLinks.previous}}[{{version}}]({{href}}){{else}}{{version}}{{/if}} ({{date}})

{{#each commits}}
{{> commit}}
{{/each}}
{{/if}}
{{/each}}`,
        headerPartial: `---
title: 更新日志
description: 记录项目的所有重要变更
---

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
