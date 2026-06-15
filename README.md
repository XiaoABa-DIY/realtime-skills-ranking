# AI Skills Live Ranking / AI Skills 实时排行榜

面向 AI 工具生态的开源 skills 排行榜与分类目录。项目会整理 AI Agent、程序员开发工具、MCP 工具、提示词工程、RAG/数据研究、自媒体创作工作流和生产力自动化相关仓库，并按照 GitHub 星标数生成可筛选、可搜索、可部署到 GitHub Pages 的实时榜单。

This is a bilingual GitHub Pages dashboard for open-source AI skills, agent workflows, MCP tools, prompt engineering resources, data/research tooling, creative automation projects, and productivity workflows.

- Repository: [XiaoABa-DIY/realtime-skills-ranking](https://github.com/XiaoABa-DIY/realtime-skills-ranking)
- GitHub Pages: [https://xiaoaba-diy.github.io/realtime-skills-ranking/](https://xiaoaba-diy.github.io/realtime-skills-ranking/)

## Product Highlights / 产品亮点

- **探索型首屏**：首屏展示价值主张、Top 3 热门项目、关键 CTA 和数据新鲜度。
- **今日推荐**：自动挑选全站 Top、开发者首选、创作者首选和 MCP 首选四张入口卡片。
- **快速问题入口**：通过 chip 直达程序员工具、自媒体创作、MCP 工具、研究/RAG、入门友好和最近活跃视图。
- **本地收藏**：收藏保存在当前浏览器 `localStorage` 中；URL 只用 `favorites=1` 恢复“只看收藏”视图，不暴露收藏列表。
- **涨星趋势榜**：基于每日压缩历史快照展示 7 天涨星、30 天涨星和排名上升最快专题；首日历史不足时会明确显示“趋势数据收集中”。
- **行动型详情抽屉**：详情顶部优先提供打开 GitHub、打开主页、复制 skill 链接、收藏和实时刷新。
- **移动端卡片榜单**：小屏使用卡片流展示仓库，避免横向表格阅读压力。

## What It Does / 项目能力

- **实时排行榜**：GitHub Actions 定时刷新 GitHub star、fork、language、license、更新时间等指标。
- **双语界面**：站点 UI 和人工简介支持中文/英文一键切换。
- **分类目录**：按 `Coding Agents`、`Developer Tools`、`Design & Media`、`Creator & Content`、`Data & Research`、`Productivity`、`MCP & Tooling`、`Prompt & Workflow`、`Learning & Docs` 分类浏览。
- **人群入口**：支持 `程序员`、`自媒体创作者`、`设计/营销`、`研究分析`、`效率办公`、`MCP 玩家` 六类视图。
- **专题榜单**：支持 `本周热门`、`7 天涨星榜`、`30 天涨星榜`、`排名上升最快`、`高星经典`、`最近活跃`、`适合入门`、`内容创作者精选`、`开发者工具链`。
- **多维筛选**：支持关键词、分类、平台、标签、许可证、语言过滤。
- **多种排序**：支持按星标数、fork 数、最近更新、仓库名排序。
- **分享链接**：语言、搜索、筛选、人群、专题、排序和详情仓库都会写入 URL，方便复制给他人。
- **详情实时刷新**：榜单使用静态快照，单个仓库详情可在浏览器里实时请求 GitHub API。
- **增强详情**：详情抽屉展示适合人群、核心场景、上榜理由、质量信号和相似 skill。
- **候选发现**：自动搜索潜在仓库，写入候选列表，供后续人工审核后再加入正式榜单。
- **投稿入口**：站内按钮会打开 GitHub Issue 表单，字段与 `data/repositories.yml` 对齐。
- **SEO 友好**：包含 description、Open Graph、Twitter Card、canonical、sitemap 和 robots。
- **纯静态部署**：最终产物是 HTML/CSS/JS/JSON，可直接部署到 GitHub Pages。

## Architecture / 技术架构

```text
data/repositories.yml
  -> 人工维护的正式收录清单

data/discovery-queries.yml
  -> 自动发现候选仓库的 GitHub 搜索查询

scripts/update-data.mjs
  -> 读取 YAML
  -> 调用 GitHub REST API / fallback 数据源
  -> 生成 public/data/snapshot.json、public/data/candidates.json 和 public/data/history.json

src/
  -> Vite + React + TypeScript 单页仪表盘

.github/workflows/pages.yml
  -> 刷新数据
  -> 测试
  -> 构建
  -> 部署到 GitHub Pages
```

数据刷新采用混合策略：

1. GitHub Actions 使用 `GITHUB_TOKEN` 读取 GitHub REST API，获取精确指标。
2. 本地未认证请求被限流时，脚本会保留已有有效快照，避免榜单被 0 覆盖。
3. 对没有旧快照的新仓库，脚本会尝试公开 GitHub 页面或搜索结果作为兜底数据。
4. 前端详情抽屉可对单个仓库发起实时刷新；失败时继续显示快照数据。
5. GitHub Actions 每次刷新前会从已部署的 `gh-pages` 读取 `data/history.json`，合并当天样本后保留每日 1 条、180 天。

## Data Model / 数据模型

正式收录清单位于 [data/repositories.yml](data/repositories.yml)：

```yaml
repositories:
  - repo: owner/name
    category: MCP & Tooling
    platforms: [MCP, Agents]
    tags: [tools, integrations]
    summary:
      zh: 中文简介
      en: English summary
    audiences: [developer, mcp]
    useCases:
      - zh: 适合连接工具、服务和 Agent。
        en: Useful for connecting tools, services, and agents.
    difficulty: Beginner
    status: active
    homepage: https://example.com
    featured: true
```

字段说明：

- `repo`：GitHub 仓库，格式必须是 `owner/name`。
- `category`：固定分类之一。
- `platforms`：平台或生态，例如 `MCP`、`Python`、`Agents`、`Images`。
- `tags`：能力标签，例如 `workflow`、`rag`、`prompt-engineering`。
- `summary.zh` / `summary.en`：站点展示用的中英文简介。
- `audiences`：可选，人群视图，可选值为 `developer`、`creator`、`designMarketing`、`research`、`productivity`、`mcp`。
- `useCases`：可选，中英文核心使用场景列表。
- `difficulty`：可选，`Beginner`、`Intermediate` 或 `Advanced`。
- `status`：可选，`active`、`experimental` 或 `archived`。
- `homepage`：可选，项目主页。
- `featured`：可选，是否标记为精选。

生成后的 `public/data/snapshot.json` 会额外包含 `rank`、`rankByCategory`、`freshness`、`qualitySignals`、`growth7d`、`growth30d`、`rankDelta7d`、`rankDelta30d`、`trendStatus` 等派生字段，供前端展示排名、活跃度、质量信号和涨星趋势。

历史快照位于 `public/data/history.json`，结构为：

```json
{
  "generatedAt": "2026-06-15T00:00:00.000Z",
  "retentionDays": 180,
  "repositories": [
    {
      "repo": "owner/name",
      "samples": [
        {
          "date": "2026-06-15",
          "stars": 1234,
          "forks": 56,
          "rank": 7,
          "rankByCategory": 2
        }
      ]
    }
  ]
}
```

趋势指标语义固定为：`growth7d = 当前 stars - 7 天前或更早最近样本 stars`，`growth30d = 当前 stars - 30 天前或更早最近样本 stars`，`rankDelta7d/rankDelta30d = 历史排名 - 当前排名`，正数表示排名上升。历史不足时趋势字段为 `null`，`trendStatus` 为 `collecting`。

候选发现查询位于 [data/discovery-queries.yml](data/discovery-queries.yml)。候选结果会生成到 `public/data/candidates.json`，并带有 `suggestedCategory`、`suggestedAudiences`、`confidence`，但不会自动进入正式排行榜。

## Sharing & SEO / 分享与搜索收录

前端会把用户当前视图写入 URL query：

```text
?lang=en&q=mcp&audience=developer&spotlight=developerStack&sort=updated&favorites=1&repo=modelcontextprotocol%2Fservers
?spotlight=growth7d
?spotlight=growth30d
?spotlight=rankRisers
```

可分享字段包括：

- `lang`：界面语言。
- `q`：搜索关键词。
- `audience`：人群入口。
- `spotlight`：专题榜单。
- `category`、`platform`、`tag`、`license`、`language`：筛选条件。
- `sort`：排序方式。
- `favorites`：值为 `1` 时恢复“只看收藏”视图；收藏列表只保存在本机浏览器。
- `repo`：打开详情抽屉的仓库。

SEO 文件位于 `index.html`、`public/sitemap.xml`、`public/robots.txt`。当前站点是 GitHub Pages 单页应用，根页面作为主要可索引入口，分享链接负责恢复具体视图。

## Development / 本地开发

安装依赖：

```bash
npm install
```

刷新数据：

```bash
npm run data:update
```

启动开发服务器：

```bash
npm run dev
```

常用命令：

```bash
npm run format:check
npm run lint
npm run test
npm run build
npm run test:e2e
```

如果本地有 GitHub token，可以提高 API 限额：

```bash
GITHUB_TOKEN=ghp_xxx npm run data:update
```

Windows PowerShell:

```powershell
$env:GITHUB_TOKEN="ghp_xxx"
npm run data:update
```

## Deployment / 部署

本仓库已经配置 GitHub Pages 自动部署工作流：[.github/workflows/pages.yml](.github/workflows/pages.yml)。工作流会先从 `gh-pages` 恢复已部署的 `data/history.json`，再刷新数据、检查格式、运行 lint、单元测试、构建、端到端测试，然后把 `dist/` 发布到 `gh-pages` 分支。

触发方式：

- push 到 `main`：自动刷新数据、完整验证、构建并部署到 `gh-pages`。
- GitHub Actions 手动运行 `Refresh data and deploy Pages`：立即刷新数据并部署。
- 定时任务：默认每 15 分钟刷新一次。

GitHub Pages 配置：

1. 打开仓库 Settings -> Pages。
2. Source 选择 `Deploy from a branch`。
3. Branch 选择 `gh-pages`，目录选择 `/ (root)`。
4. 推送到 `main` 后等待 workflow 完成。
5. 访问 [https://xiaoaba-diy.github.io/realtime-skills-ranking/](https://xiaoaba-diy.github.io/realtime-skills-ranking/)。

Vite 项目型 Pages 路径通过 `BASE_PATH=/${{ github.event.repository.name }}/` 注入，确保静态资源在 `/realtime-skills-ranking/` 下正常加载。

## Tests / 测试

当前测试覆盖：

- 数据脚本：YAML 输入、GitHub API mock、候选去重、失败保留旧快照、HTML/search fallback、历史快照合并、保留期裁剪、涨星和排名变化计算。
- 前端逻辑：排序、筛选、统计计算、语言切换、趋势榜排序、URL 状态同步。
- 端到端：桌面和移动视口下的首页渲染、搜索筛选、详情抽屉、实时刷新。

完整验证命令：

```bash
npm run data:update
npm run format:check
npm run lint
npm run test
npm run build
npm run test:e2e
```

## Contributing / 贡献

新增正式仓库请修改 `data/repositories.yml`，并确保：

- 分类来自固定分类列表。
- 中英文简介都已填写。
- 标签保持短小、可复用、英文小写。
- 仓库确实与 AI skills、Agent、MCP、提示词、RAG、程序员工具、自媒体创作工作流或 AI 自动化相关。

也可以在站点点击“推荐 skill”，通过 GitHub Issue 表单提交候选仓库。维护者审核后再把它加入正式清单。

更详细规则见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## Commit Convention / 提交规范

提交日志必须使用中文，并遵循 Conventional Commits 风格：

```bash
git commit -m "feat: 添加 AI skills 分类数据"
git commit -m "fix: 修复 GitHub 数据刷新兜底逻辑"
git commit -m "docs: 完善 README 部署说明"
git commit -m "chore: 配置 GitHub Pages 自动部署"
```

## Roadmap / 后续计划

- 增加趋势折线图和历史数据导出。
- 增加专题页，例如 MCP、Agent Frameworks、Prompt Engineering。
- 增加静态 JSON API 文档。
- 增加排行榜变化历史。
