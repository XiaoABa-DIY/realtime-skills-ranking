# RedFox Skills 综合热度榜

一个部署在 GitHub Pages 上的 RedFox Skills 导航与综合热度排行榜。项目使用 RedFox 公共 API 获取技能分类、详情、使用量和查看量，并用 [redfox-data/redfox-community](https://github.com/redfox-data/redfox-community) 作为开源来源与 GitHub 链接兜底。

- 线上地址：[https://xiaoaba-diy.github.io/realtime-skills-ranking/](https://xiaoaba-diy.github.io/realtime-skills-ranking/)
- 数据源：[redfox.hk/skills](https://redfox.hk/skills) + [redfox-data/redfox-community](https://github.com/redfox-data/redfox-community)

## 功能亮点

- **综合热度榜**：默认按使用量、查看量、RedFox 徽章和最近更新时间计算热度分。
- **Skills 广场交互**：搜索框、分类 chips、专题榜、人群入口和卡片式榜单，参考 RedFox 官方 Skills 页面。
- **适合不同人群查找**：自媒体、公众号、小红书、抖音、数据分析、效率工具、Agent/开发者入口。
- **详情抽屉**：展示 README、适合场景、获取方式、是否需要 `REDFOX_API_KEY`、RedFox 详情页和 GitHub 源码链接。
- **收藏与分享**：收藏保存在本机浏览器，筛选条件和详情 Skill 会写入 URL query。
- **历史快照**：每天为每个 skill 保留一条使用量/查看量/热度/排名样本，保留 180 天，用于后续趋势榜。

## 数据刷新机制

核心命令：

```bash
npm run data:update
```

刷新流程：

1. 请求 `https://redfox.hk/story/web/api/skills/categories` 获取分类。
2. 分页请求 `https://redfox.hk/story/web/api/skills/list` 获取全部 skills。
3. 读取 GitHub `redfox-data/redfox-community/skills/*/SKILL.md`，补齐开源目录信息；如果本地没有 GitHub token，脚本仍会优先使用 RedFox API 返回的 `platformInfo`。
4. 生成：
   - `public/data/snapshot.json`
   - `public/data/history.json`
   - `public/data/candidates.json`，当前仅保留空列表用于兼容旧部署。

RedFox API 不可用时，脚本会优先复用上一次 v2 快照；如果没有旧快照，则使用 GitHub skills 目录生成基础兜底目录，避免站点空白。

## 综合热度规则

`heatScore` 计算公式：

```text
ln(downloadCount + 1) * 70
+ ln(viewCount + 1) * 20
+ badgeBoost
+ recencyBoost
```

其中：

- `downloadCount` 对应 RedFox 页面展示的“使用”数量。
- `displayStatus` 映射为 `1=热门`、`2=推荐`、`3=上新`。
- `badgeBoost` 分别为热门 120、推荐 90、上新 75。
- `recencyBoost` 只奖励最近 30 天内更新的技能。

## 数据结构

`public/data/snapshot.json` 使用 `schemaVersion: 2`：

```json
{
  "schemaVersion": 2,
  "generatedAt": "2026-06-16T00:00:00.000Z",
  "source": "redfox-api+github",
  "categories": [],
  "skills": [
    {
      "skillNo": "wn2Hrw42",
      "skillCode": "multi-wordcheck",
      "name": { "zh": "多平台违禁词检测", "en": "Multi-Platform Word Check" },
      "categoryCode": "efficiency_tools",
      "tags": ["合规审核", "内容改写"],
      "downloadCount": 44942,
      "viewCount": 40362,
      "displayStatus": 0,
      "heatScore": 1022,
      "rank": 46,
      "redfoxUrl": "https://redfox.hk/skills/no/wn2Hrw42",
      "githubUrl": "https://github.com/redfox-data/redfox-community/tree/main/skills/multi-wordcheck"
    }
  ]
}
```

`public/data/history.json` 按 `skillCode` 保存每日样本：

```json
{
  "schemaVersion": 2,
  "retentionDays": 180,
  "skills": [
    {
      "skillCode": "multi-wordcheck",
      "samples": [
        {
          "date": "2026-06-16",
          "downloadCount": 44942,
          "viewCount": 40362,
          "heatScore": 1022,
          "rank": 46,
          "rankByCategory": 7
        }
      ]
    }
  ]
}
```

## URL 分享参数

站点会把当前视图写入 query，便于复制分享：

```text
?q=douyin&audience=douyin&spotlight=topUses&sort=views
?category=efficiency_tools&tag=内容改写
?favorites=1
?skill=multi-wordcheck
```

收藏列表只保存在本机 `localStorage["redfox-skills-ranking:favorites:v1"]`，URL 只保存“只看收藏”状态，不暴露收藏内容。

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

如果要提高 GitHub API 限额，可设置：

```powershell
$env:GITHUB_TOKEN="ghp_xxx"
npm run data:update
```

## 部署

项目通过 `.github/workflows/pages.yml` 自动刷新数据、测试、构建并发布到 `gh-pages` 分支。触发方式：

- push 到 `main`
- 手动运行 `Refresh RedFox data and deploy Pages`
- 每 15 分钟定时刷新一次

Pages 地址为项目型路径：

```text
https://xiaoaba-diy.github.io/realtime-skills-ranking/
```

## 贡献

当前榜单来源是 RedFox 官方 Skills 数据，不再手工维护 `data/repositories.yml` 作为正式榜单。推荐新 skill 时，请提交 GitHub Issue，并说明：

- Skill 名称或 RedFox/GitHub 链接
- 适合的人群
- 解决的场景
- 为什么值得加入或重点展示

更多规则见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 提交规范

Git 提交日志必须使用中文，并遵循 Conventional Commits 风格：

```bash
feat: 接入 RedFox Skills 综合热度榜
fix: 修复 RedFox 快照兜底逻辑
docs: 更新 README 数据源说明
chore: 部署 GitHub Pages 静态产物
```
