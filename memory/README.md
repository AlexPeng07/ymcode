# ymcode 交接记忆

这不是 ymcode 的运行时记忆。运行时记忆在 `~/.local/share/ymcode/memory/`，由 harness 自己在会话中读写。

本目录保存的是**项目构建交接上下文**：给下一个 harness / agent / 人快速接手用的结论、路径、验证证据和下一步。目标是把“这次为什么这么做、哪些已经验证、哪些不能动”一次讲清，避免重新考古。

## 阅读顺序

1. [MEMORY.md](MEMORY.md) — 一页索引与当前状态
2. [context.md](context.md) — 需求、取舍、用户偏好
3. [architecture.md](architecture.md) — 仓库结构、记忆与 instincts 数据流
4. [instincts.md](instincts.md) — instincts 设计、配置、命令、测试
5. [localization.md](localization.md) — i18n 架构、覆盖范围、校验与剩余项
6. [build.md](build.md) — 工具链、构建命令、离线构建、Windows 坑
7. [verification.md](verification.md) — 门禁与端到端证据、已知失败
8. [decisions.md](decisions.md) — 关键决策与理由（ADR 风格）
9. [brand-boundary.md](brand-boundary.md) — 哪些名字该改、哪些必须保留
10. [next-steps.md](next-steps.md) — 按优先级排列的后续工作
11. [handoff.json](handoff.json) — 机器可读摘要
12. [continue-prompt.md](continue-prompt.md) — 可直接粘贴给下一个 harness 的提示词

## 使用约定

- 先读 `MEMORY.md`，再按需读主题文件；不要从本目录推断运行时记忆内容。
- 事实、推断、未验证项分开写；不要把“应该可以”写成“已验证”。
- 不写入任何 token、cookie、API key、凭据或用户隐私数据。
- 改代码前先跑 [verification.md](verification.md) 里的门禁；门禁失败时先修门禁，不要绕过。
- 重要变更更新 `MEMORY.md` 的“当前状态”与 `next-steps.md`；保留日期和 commit。
- 运行时记忆（`MEMORY.md`/checkpoint/instincts）由 ymcode 自己管理；不要把项目交接内容写进 `~/.local/share/ymcode/memory/`。
