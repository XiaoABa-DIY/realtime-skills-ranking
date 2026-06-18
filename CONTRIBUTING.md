# Contributing / 贡献指南

感谢你帮助维护 GitHub 开源 Skills 星标榜。本项目只收录真实包含 `SKILL.md` 的开源 Skill 仓库，并优先展示中文说明清楚、可复用价值高的项目。

## 推荐一个 Skill

请通过 GitHub Issue 推荐，并尽量提供：

- GitHub 仓库链接，例如 `https://github.com/Yuan1z0825/nature-skills`
- `SKILL.md` 路径，例如 `skills/nature-polishing/SKILL.md`
- 中文名称或中文摘要
- 适合人群：自媒体、程序员、写作提示词、设计素材、数据分析、效率办公、入门友好
- 主要使用场景
- 推荐理由

维护者会检查仓库是否可访问、是否包含 `SKILL.md`、是否仍在维护，以及是否符合本项目的收录边界。

## 正式收录标准

必须满足：

- GitHub 公开仓库。
- 存在根目录 `SKILL.md` 或 `skills/**/SKILL.md`。
- 主要内容是可复用 Skill、Skill 集合或 Skill 创建/学习资源。
- 非纯营销页，近期仍可访问。

优先收录：

- README、`SKILL.md` 或人工摘要中包含中文说明。
- 适合自媒体、程序员、研究分析、效率办公等具体人群。
- 安装、复制或复用路径清晰。
- 有明确标签和分类。

暂不收录：

- MCP server 集合或 Model Context Protocol 工具仓库。
- AI Agent 框架、multi-agent 编排框架、普通 Coding Agent 产品。
- 没有 `SKILL.md` 的 Prompt 列表、工具集合或教程。
- archived、不可访问、内容严重缺失或与 Skill 无关的仓库。

## 修改数据文件

正式收录请修改 `data/skills.yml`：

```yaml
skills:
  - repo: owner/repo
    category: 内容创作
    tags: [写作, 中文]
    audiences: [media, writing]
    summary:
      zh: 一句话中文摘要。
      en: Optional English summary.
    featured: true
```

分类可选：

- 内容创作
- 编程开发
- 提示词/工作流
- 设计与多媒体
- 数据研究
- 效率办公
- 文档知识库
- 中文本地化

人群可选：

- `media`
- `developer`
- `writing`
- `design`
- `data`
- `productivity`
- `beginner`

自动发现条件在 `data/discovery-queries.yml`，只用于生成候选，不会直接进入正式榜。

## 数据脚本验证

涉及数据逻辑时至少运行：

```bash
npm run data:update
npm run test -- --run scripts/update-data.test.mjs
```

需要保持以下行为：

- 无 `SKILL.md` 的仓库不能进入正式榜单的正常状态。
- MCP server、Agent 框架和非 Skill 项目会被排除或标记异常。
- GitHub API 失败时优先复用旧 `schemaVersion: 3` 快照。
- 历史数据按 repo 保存，同一天最多保留一条样本。

## 前端修改验证

涉及 UI 时至少运行：

```bash
npm run format:check
npm run lint
npm run test
npm run build
npm run test:e2e
```

移动端需要确认：

- 卡片流无横向溢出。
- 搜索、分类、专题榜、收藏和详情抽屉可操作。
- 长 README 摘要和长 GitHub 路径不会撑破抽屉。

## 提交规范

Git 提交日志必须使用中文，并遵循 Conventional Commits 风格：

```bash
feat: 添加 GitHub Skill 候选发现逻辑
fix: 修复 history 同日样本覆盖逻辑
docs: 更新 Skill 收录标准
chore: 调整 Pages 部署工作流
```
