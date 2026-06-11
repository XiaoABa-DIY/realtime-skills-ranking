# AI Skills Live Ranking / AI Skills 实时排行榜

一个双语 GitHub Pages 静态站点，用来分类整理开源 AI skills、Agent 工作流、MCP 工具、提示词方法论、数据研究和创作自动化项目，并按 GitHub 星标数生成排行榜。

This is a bilingual GitHub Pages dashboard for open-source AI skills, agent workflows, MCP tools, prompt methodologies, data/research tooling, and creative automation repositories.

## Features / 功能

- 双语仪表盘：中文和英文一键切换。
- 分类目录：Coding Agents、Design & Media、Data & Research、Productivity、MCP & Tooling、Prompt & Workflow、Learning & Docs。
- 星标排行榜：支持按 stars、forks、最近更新、仓库名称排序。
- 多维筛选：分类、平台、标签、许可证、语言和关键词搜索。
- 混合实时数据：GitHub Actions 定时生成快照，详情抽屉可实时刷新单个仓库。
- 双轨数据源：人工维护正式榜单，自动发现候选仓库供审核。
- GitHub Pages 部署：构建产物是纯静态 HTML/CSS/JS。

## Data Model / 数据模型

正式收录清单在 `data/repositories.yml`：

```yaml
repositories:
  - repo: owner/name
    category: MCP & Tooling
    platforms: [MCP, Agents]
    tags: [tools, integrations]
    summary:
      zh: 中文简介
      en: English summary
    homepage: https://example.com
    featured: true
```

自动发现查询在 `data/discovery-queries.yml`。脚本会把查询结果写入 `public/data/candidates.json`，但候选仓库不会进入正式排行榜。

生成数据：

```bash
npm run data:update
```

如果设置了 `GITHUB_TOKEN`，脚本会使用认证请求以获得更高的 GitHub API 限额：

```bash
GITHUB_TOKEN=ghp_xxx npm run data:update
```

## Development / 本地开发

```bash
npm install
npm run data:update
npm run dev
```

常用检查：

```bash
npm run lint
npm run test
npm run build
npm run test:e2e
```

## GitHub Pages Deployment / 部署到 GitHub Pages

仓库包含 `.github/workflows/pages.yml`：

- `push` 到 `main` 会刷新数据并部署。
- `workflow_dispatch` 可手动刷新。
- `schedule` 默认每 15 分钟刷新一次。
- 构建时使用 `BASE_PATH=/${{ github.event.repository.name }}/`，适配项目型 Pages 地址。

启用步骤：

1. 在 GitHub 创建仓库并推送代码。
2. 打开仓库 Settings → Pages。
3. Source 选择 GitHub Actions。
4. 等待 `刷新数据并部署 Pages` 工作流完成。
5. 访问 `https://<user>.github.io/<repo>/`。

## Commit Convention / 提交规范

提交日志必须使用中文，并遵循 Conventional Commits 风格，例如：

```bash
git commit -m "feat: 实现双语排行榜仪表盘"
git commit -m "chore: 配置 GitHub Pages 自动部署"
```

## Roadmap / 后续方向

- 增加 7/30 天涨星趋势。
- 增加 RSS 或静态 JSON API 文档。
- 增加收录申请模板和自动校验。
- 增加专题页面，例如 MCP、Agent、Prompt Engineering。
