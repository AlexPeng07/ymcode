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

当前交接点（2026-10-28）：
- 最新 Release v0.2.12（tag 8a2d050，12 个平台资产）；HEAD 用 git log -1 查看。
- 已交付：四方向路线（v0.2.7 质量闭环 / v0.2.8 易用性 / v0.2.9 记忆深化 / 测试定性）、
  生产力评估与凭据实测（d5589bd）、质量优先效率批次（54b8d74）、
  provider-aware tier 修复（996488a）、未知模型近似名（27a396d）、
  upgrade 挂起+退出码修复（7fd8cfd）、升级延迟替换（328e872——
  Start-Process 孙进程在主进程退出后替换，规避卡巴斯基 PDM 行为判定）、
  resume 轮询预算放宽（8a2d050）。
- 凭据：临时 deepseek key 已生效（会话记录里有，建议轮换）；xiaomi key 已死。
- 本机网络：代理 127.0.0.1:7890 可能宕机（git push 失败按 memory/build.md
  的绕行命令直连）；release-assets 下载偶发 TLS 超时，重试再定性；
  验证安装/升级链路用本地发布镜像（verification.md「upgrade 全链路实测」）。
- 已知失败：Windows 专属 8 个（external_directory/PowerShell 5 +
  stdio-exit-observe 3）+ TUI sessions 可见性 1 个既有失败。

硬约束：
- Bun 固定 1.3.14；依赖用 bun ci，不要随意改 lockfile。
- 不改已发布的 packages/cli/migration/*/migration.sql；新 schema 用新迁移目录。
- 第一方标识用 ymcode；Xiaomi MiMo provider/model、opencode 上游、.opencode 兼容根、
  第三方品牌保留。
- 代码标识符/内部日志英文；用户可见文案中文。
- 运行时数据目录完全独立：只使用 ~/.config/ymcode、~/.local/share/ymcode、~/.ymcode；
  项目配置 .ymcode/。
- 不要把 token/凭据写入仓库或打印到会话。
- 不要用"跳过测试"冒充通过；区分功能失败和环境清理失败。
- 发布版本号时用无 BOM 的 UTF-8 写 package.json。

先跑门禁确认基线：
cd F:/AllProjects/ymcode
bun run check:brand
bun run check:i18n
bun run check:skills
bun run check:prompts
bun run typecheck

建议顺序（详见 memory/next-steps.md）：
1. 用几天真实会话，按数据回顾（token-efficient 节省、技能触发命中、instinct usage）。
2. 修 Windows 专属 8 个测试。
3. 可选：TUI 像素级人工验收、Linux 全量对照、Authenticode 签名。

不要重做：改名、instincts 核心、44 个技能、核心 TUI 汉化、记忆隔离与 memory doctor、
v0.2.7–v0.2.12 的已交付内容。

完成后更新 memory/MEMORY.md、memory/next-steps.md、memory/verification.md、
memory/handoff.json 和 docs/PROGRESS.md，并提交。
```
