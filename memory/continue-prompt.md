# 下一个 harness 的续作提示词（可复制）

```text
你在 F:/AllProjects/ymcode 继续开发 ymcode。先不要改代码，按顺序读：

1. memory/MEMORY.md
2. memory/context.md
3. memory/architecture.md
4. memory/localization.md
5. memory/verification.md
6. memory/next-steps.md
7. memory/handoff.json

项目背景：ymcode 是基于 MiMo-Code（上游 commit 88673c4）的个人 AI 编程 harness，
保留 opencode 的 server/TUI 架构，新增 instincts 记忆层，并完成界面/技能/提示词汉化。
独立 git 历史，不自动合并上游。

当前交接点（2026-10-24）：
- HEAD 13058ef（main 已推送）；最新 Release v0.2.5（a3547e4，12 个平台资产）。
- 工作区比 v0.2.5 多两个未发版提交：be8bc9f（侧栏/对话框汉化、技能目录紧凑化、
  cron 时序稳定）、13058ef（补齐 prompt/workflow 词条 + i18n 引用门禁）。
- 版本文件仍是 0.2.5。最新门禁：i18n 1016 en / 1064 zh / 44 技能描述，
  skills 90 文件，prompts 54 文件，typecheck 通过；TUI 测试 353 pass / 24 skip / 0 fail。
- 已知失败（与最近改动无关）：message-v2 的 Windows file URL、prompt-effect 的
  MCP lifecycle 5 秒硬超时；Windows 下 23 个 plugin 用例按平台 skip。

硬约束：
- Bun 固定 1.3.14；依赖用 bun ci，不要随意改 lockfile。
- 不改已发布的 packages/cli/migration/*/migration.sql；新 schema 用新迁移目录。
- 第一方标识用 ymcode；Xiaomi MiMo provider/model、opencode 上游、.opencode 兼容根、
  第三方品牌保留。
- 代码标识符/内部日志英文；用户可见文案中文。
- 运行时数据目录完全独立：只使用 ~/.config/ymcode、~/.local/share/ymcode、~/.ymcode；
  项目配置 .ymcode/。
- 不要把 token/凭据写入仓库或打印到会话。
- 不要用“跳过测试”冒充通过；区分功能失败和环境清理失败。
- 发布版本号时用无 BOM 的 UTF-8 写 package.json。

先跑门禁确认基线：
cd F:/AllProjects/ymcode
bun run check:brand
bun run check:i18n
bun run check:skills
bun run check:prompts
bun run typecheck

建议顺序：
1. 发布 v0.2.6：把 packages/{cli,sdk,plugin,shared}/package.json 改为 0.2.6，跑门禁，
   提交、打 tag、push；确认 release.yml 成功且 12 个资产齐全。
2. 修 message-v2 的 Windows file URL 测试（src/session/message-v2.ts:1097 的
   fileURLToPath 对非绝对 file:// URL 抛错）。
3. 排查 prompt-effect 的 MCP lifecycle 5 秒硬超时（单独重跑通常会过）。
4. 可选：Linux 全量复跑、TUI 人工视觉验收。

不要重做：改名、instincts 核心、44 个技能、核心 TUI 汉化、记忆隔离与 memory doctor、
v0.2.5 发布。

完成后更新 memory/MEMORY.md、memory/next-steps.md、memory/verification.md 和
docs/PROGRESS.md，并提交。
```
