# GitHub 开源 Skills 星标榜

一个部署在 GitHub Pages 上的开源 Skills 排行榜。项目只收录 GitHub 公开仓库里真实包含 `SKILL.md` 的 Skill 项目，默认按 GitHub Stars 排序，并优先展示中文说明清楚、适合国内自媒体、程序员、研究者和效率工具用户查找的技能仓库。

- 线上地址：[https://xiaoaba-diy.github.io/realtime-skills-ranking/](https://xiaoaba-diy.github.io/realtime-skills-ranking/)
- 正式清单：[`data/skills.yml`](data/skills.yml)
- 自动发现条件：[`data/discovery-queries.yml`](data/discovery-queries.yml)

## 功能亮点

- **GitHub Stars 榜**：默认按 Stars 展示开源热度，辅助展示 Forks、最近更新、许可证、语言和 SKILL.md 路径。
- **严格 Skill 收录**：正式条目必须能在仓库中验证到根目录 `SKILL.md` 或 `skills/**/SKILL.md`。
- **中文优先**：中文 README、中文 `SKILL.md`、中文摘要会提高中文友好度展示；高质量双语项目也可以收录。
- **场景化查找**：支持自媒体、程序员、写作提示词、设计素材、数据分析、效率办公、入门友好等入口。
- **趋势快照**：每天为每个 repo 保留一条 Stars/Forks/排名样本，积累后展示 7 天和 30 天涨星榜。
- **收藏与分享**：收藏保存在本机浏览器，筛选条件和详情 Skill 会写入 URL，方便复制分享。

## 不收录范围

本项目关注 Skill 本身，不把下面项目当作正式榜单条目：

- MCP server 集合或 Model Context Protocol 工具仓库。
- AI Agent 框架、multi-agent 编排框架、普通 Coding Agent 产品。
- 没有 `SKILL.md` 的普通 AI 工具、Prompt 列表或营销页。
- 已 archived、不可访问或主要内容与 Skill 无关的仓库。

## 数据刷新机制

核心命令：

```bash
npm run data:update
```

刷新流程：

1. 读取 `data/skills.yml` 的人工精选清单。
2. 调用 GitHub REST API 获取 repo 元数据，包括 Stars、Forks、Issues、语言、许可证和更新时间。
3. 读取 Git tree，验证是否存在 `SKILL.md`。
4. 读取 README 和首个 `SKILL.md`，生成中文友好度、摘要和使用场景。
5. 读取 `data/discovery-queries.yml`，通过 GitHub 搜索发现候选 Skill 仓库，写入 `public/data/candidates.json`。
6. 合并 `public/data/history.json`，同一天重复刷新只覆盖当天样本。

输出文件：

- `public/data/snapshot.json`：当前正式榜单快照。
- `public/data/history.json`：按 repo 保存的历史 Stars/Forks/排名样本，保留 180 天。
- `public/data/candidates.json`：自动发现但尚未人工收录的候选仓库。

如果 GitHub API 刷新失败，脚本会优先复用上一次 `schemaVersion: 3` 快照；没有旧快照时会输出带错误状态的基础目录，避免页面空白。

## 数据结构

`snapshot.json` 使用 `schemaVersion: 3`：

```json
{
  "schemaVersion": 3,
  "generatedAt": "2026-06-16T00:00:00.000Z",
  "source": "github-skills",
  "skills": [
    {
      "repo": "Yuan1z0825/nature-skills",
      "name": "nature-skills",
      "descriptionZh": "面向 Nature 论文表达、科研绘图、引用整理和学术写作的中文 Skill 集合。",
      "categoryCode": "data",
      "tags": ["科研写作", "Nature", "中文"],
      "skillMdPaths": ["skills/nature-polishing/SKILL.md"],
      "stars": 20324,
      "forks": 1200,
      "rank": 1,
      "growth7d": null,
      "trendStatus": "collecting"
    }
  ]
}
```

`history.json` 按 repo 保存每日样本：

```json
{
  "schemaVersion": 3,
  "retentionDays": 180,
  "repositories": [
    {
      "repo": "Yuan1z0825/nature-skills",
      "samples": [
        {
          "date": "2026-06-16",
          "stars": 20324,
          "forks": 1200,
          "rank": 1,
          "rankByCategory": 1
        }
      ]
    }
  ]
}
```

## URL 分享参数

站点会把当前视图写入 query：

```text
?q=writing&audience=media&spotlight=featured
?category=data&tag=中文&sort=forks
?favorites=1
?skill=Yuan1z0825%2Fnature-skills
```

收藏列表只保存在本机 `localStorage["github-skills-ranking:favorites:v1"]`。URL 只保存“只看收藏”状态，不暴露收藏内容。

## 本地开发

```bash
npm install
npm run data:update
npm run dev
```

完整验证：

```bash
npm run format:check
npm run lint
npm run test
npm run build
npm run test:e2e
```

本地没有 GitHub token 也能运行，但限额较低。需要提高限额时：

```powershell
$env:GITHUB_TOKEN="ghp_xxx"
npm run data:update
```

## 部署

项目通过 `.github/workflows/pages.yml` 自动刷新数据、测试、构建并发布到 `gh-pages` 分支。触发方式：

- push 到 `main`
- 手动运行 `Refresh GitHub Skills data and deploy Pages`
- 每 15 分钟定时刷新一次

项目型 Pages 地址：

```text
https://xiaoaba-diy.github.io/realtime-skills-ranking/
```

## 贡献

推荐新 Skill 时，请提交 GitHub Issue，并说明：

- GitHub 仓库链接。
- 仓库中 `SKILL.md` 的路径。
- 适合人群和主要使用场景。
- 中文摘要或中文说明。
- 为什么值得加入正式榜单。

更多规则见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 提交规范

Git 提交日志必须使用中文，并遵循 Conventional Commits 风格：

```bash
feat: 改造为 GitHub 开源 Skills 星标榜
fix: 修复 GitHub 快照兜底逻辑
docs: 更新 GitHub Skills 收录规则
chore: 部署 GitHub Pages 静态产物
```
