# 下一个 harness 的续作提示词（可复制）

```text
你在 F:/AllProjects/ymcode 继续开发 ymcode。先不要改代码，按顺序读：

1. memory/MEMORY.md
2. memory/architecture.md
3. memory/instincts.md
4. memory/localization.md
5. memory/verification.md
6. memory/next-steps.md

项目背景：ymcode 是基于 MiMo-Code（上游 commit 88673c4）的个人 AI 编程 harness，保留 opencode 的 server/TUI 架构，新增 instincts 记忆层，并完成核心界面/技能/提示词汉化。独立 git 历史，不是自动合并上游。

硬约束：
- Bun 固定 1.3.14；依赖用 bun ci，不要随意改 lockfile。
- 不改已发布的 packages/cli/migration/*/migration.sql；新 schema 用新迁移目录。
- 第一方标识用 ymcode；Xiaomi MiMo provider/model、opencode 上游、.opencode 兼容根、第三方品牌保留。
- 代码标识符/内部日志英文；用户可见文案中文。
- 运行时数据目录 ~/.config/ymcode、~/.local/share/ymcode、~/.ymcode；项目配置 .ymcode/。
- 旧 mimocode 数据只复制迁移，不删除旧目录。
- 不要把 token/凭据写入仓库或打印到会话；真实 provider 冒烟前先向用户确认凭据。
- 不要用“跳过测试”冒充通过；区分功能失败和环境清理失败。

当前已完成，不要重做：
- 改名 ymcode、数据迁移、instincts 核心与接线、70 个技能/54 个提示词汉化、核心 TUI/CLI 汉化、Windows 构建。
- 代码 HEAD（交接时）3dbd34b；二进制已构建。

先跑门禁确认基线：
cd F:/AllProjects/ymcode
bun run check:brand
bun run check:i18n
bun run check:skills
bun run check:prompts
bun run typecheck

本轮优先做 P0：真实 provider 下的 observer 冒烟。使用隔离 YMCODE_HOME，在一个临时项目里触发一次明确纠正，等 observer 生成 candidate，执行 promote，重启后确认 # Active instincts 注入，并记录命令与输出到 docs/verification/。

如果用户没有提供 provider 凭据，先做 P1（顶层 CLI help 汉化）或 P2（Windows 测试清理），不要假造 LLM 验证结果。

优先直接执行，避免不必要的并行子代理调用；当前环境有 2000 次总量额度，过期 2099-12-31，不是每日重置。

完成后更新 memory/MEMORY.md、memory/next-steps.md 和 docs/PROGRESS.md，并提交。
```
