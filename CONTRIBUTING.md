# Contributing / 贡献指南

感谢你帮助维护 RedFox Skills 综合热度榜。本项目当前以 RedFox Skills API 为正式数据源，以 `redfox-data/redfox-community` 为开源目录兜底，不再通过手工 YAML 清单维护正式榜单。

## 推荐一个 Skill

请通过 GitHub Issue 推荐，并尽量提供：

- Skill 名称或 `skillCode`
- RedFox 详情页链接，例如 `https://redfox.hk/skills/no/wn2Hrw42`
- GitHub 源码链接，例如 `https://github.com/redfox-data/redfox-community/tree/main/skills/multi-wordcheck`
- 适合人群：自媒体、公众号、小红书、抖音、数据分析、效率工具、Agent/开发者
- 主要使用场景
- 推荐理由

维护者会检查该 skill 是否已经出现在 RedFox API 中。如果已经存在，通常不需要手工加入数据文件；如果需要高亮、修复分类或补充文案，会在代码或文档层处理。

## 收录与展示规则

适合展示的 skills 应满足至少一项：

- 面向内容创作、数据采集、账号分析、作品分析、效率工具或 Agent/CLI 工作流。
- 有清晰 README、SKILL.md 或 RedFox 详情描述。
- 可通过 RedFox、skills-cli 或 GitHub 开源目录复用。
- 非纯营销页，且近期仍可访问。

暂不展示或降低权重的情况：

- RedFox API 不再返回该 skill。
- 缺少可访问详情或源码链接，且没有旧快照兜底。
- 明显与 AI skills、创作工作流、数据分析或效率工具无关。

## 数据脚本修改

涉及数据逻辑时，请重点验证：

```bash
npm run data:update
npm run test -- --run scripts/update-data.test.mjs
```

需要保持以下行为：

- RedFox API 分页必须完整抓取。
- `platformInfo` 损坏或缺失时不能中断全量刷新。
- RedFox API 失败时优先复用旧 v2 快照。
- 没有旧快照时使用 GitHub skills 目录生成兜底目录。
- 历史数据每天每个 `skillCode` 最多保留一条样本。

## 前端修改

涉及 UI 时，请至少验证：

```bash
npm run format:check
npm run lint
npm run test
npm run build
npm run test:e2e
```

移动端需要确认：

- 技能卡片无横向溢出。
- 搜索、分类、专题榜、收藏和详情抽屉可操作。
- 长 README 不会撑破抽屉布局。

## 提交规范

Git 提交日志必须使用中文，并遵循 Conventional Commits 风格：

```bash
feat: 增加 RedFox 热度专题榜
fix: 修复 history 同日样本覆盖逻辑
docs: 更新贡献指南
chore: 调整 Pages 部署工作流
```
