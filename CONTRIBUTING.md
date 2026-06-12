# Contributing / 贡献指南

感谢你帮助维护 AI Skills 实时排行榜。本项目采用人工清单 + 自动指标的方式：人工负责判断仓库是否值得收录，脚本负责刷新星标、fork、许可证、语言和更新时间。

## 收录标准

适合收录的仓库应满足至少一项：

- 提供 AI Agent、MCP、提示词、RAG、自动化、程序员工具、自媒体创作工作流或学习路径。
- 能作为可复用的 skill、工具、模板、方法论或开源框架。
- 有清晰 README、许可证或活跃社区信号。

暂不收录：

- 与 AI skills 无关的普通应用仓库。
- 只有演示截图、没有可复用内容的仓库。
- 已归档且没有参考价值的项目。
- 侵权、恶意、钓鱼或不适合公开推荐的仓库。

## 分类

请从以下分类中选择一个：

- `Coding Agents`
- `Developer Tools`
- `Design & Media`
- `Creator & Content`
- `Data & Research`
- `Productivity`
- `MCP & Tooling`
- `Prompt & Workflow`
- `Learning & Docs`

如果一个仓库跨多个方向，选择最主要的用途，其他信息放进 `platforms` 或 `tags`。

分类建议：

- `Developer Tools`：面向程序员的 IDE、CLI、代码助手、测试、调试、工程自动化工具。
- `Creator & Content`：面向自媒体、内容创作者、知识工作者的语音、OCR、文档整理、长文写作、素材生产工具。
- `Design & Media`：以图像、视频、多媒体生成工作流为核心的创作工具。
- `Data & Research`：RAG、网页抓取、知识库、检索、数据分析和资料研究工具。

## 新增正式仓库

编辑 `data/repositories.yml`，追加：

```yaml
- repo: owner/name
  category: Coding Agents
  platforms: [Agents, Python]
  tags: [workflow, automation]
  summary:
    zh: 一句话说明它为什么值得收录。
    en: One sentence explaining why it belongs here.
  audiences: [developer]
  useCases:
    - zh: 辅助编码、调试或 Agent 编排。
      en: Coding, debugging, or agent orchestration.
  difficulty: Intermediate
  status: active
  homepage: https://example.com
  featured: false
```

字段要求：

- `repo`：必须是 `owner/name`。
- `category`：必须使用固定分类。
- `platforms`：使用产品、生态或运行平台，例如 `MCP`、`Python`、`Images`。
- `tags`：使用功能标签，例如 `workflow`、`rag`、`prompt-engineering`。
- `summary.zh` 和 `summary.en`：必须同时提供。
- `audiences`：可选，使用 `developer`、`creator`、`designMarketing`、`research`、`productivity`、`mcp`。
- `useCases`：可选，写 1-3 个中英文核心使用场景。
- `difficulty`：可选，使用 `Beginner`、`Intermediate`、`Advanced`。
- `status`：可选，使用 `active`、`experimental`、`archived`。
- `homepage` 和 `featured` 可选。

如果不填写 `audiences`，数据脚本会按分类、平台和标签推断。为了减少误判，建议对跨界项目手动填写。

## 通过 Issue 推荐仓库

也可以通过站点里的“推荐 skill”按钮打开 GitHub Issue 表单。审核时请检查：

- 仓库是否真实开源，README 是否能说明使用方式。
- 是否与 AI skills、Agent、MCP、RAG、创作工作流、程序员工具或效率自动化相关。
- 是否存在明显恶意、侵权、钓鱼或纯营销问题。
- 建议分类、人群、平台和标签是否清晰。
- 中英文简介是否准确且不夸张。

审核通过后，把 Issue 内容整理进 `data/repositories.yml`，再运行数据刷新和测试。

## 更新候选发现

编辑 `data/discovery-queries.yml`：

```yaml
- id: ai-agent-frameworks
  query: "ai agent framework language:Python"
  category: Coding Agents
  limit: 8
  reason:
    zh: 可能是可编排 AI Agent 的开源框架。
    en: Potential open-source framework for orchestrating AI agents.
```

候选发现只用于审核，不会自动进入正式榜单。

## 提交前检查

```bash
npm run data:update
npm run format:check
npm run lint
npm run test
npm run build
```

如果修改了 UI，请运行：

```bash
npm run test:e2e
```

## 提交日志

提交日志必须使用中文，并遵循 Conventional Commits 风格：

```bash
feat: 添加 MCP 工具分类数据
fix: 修复候选仓库去重逻辑
docs: 更新贡献指南
chore: 调整 Pages 部署工作流
```
