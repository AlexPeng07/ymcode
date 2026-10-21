# 下一步（按优先级）

## P0：真实 provider 下的 observer 冒烟

**为什么**：目前只验证了候选写入/晋升/注入的确定性路径，没有验证 LLM 能否稳定抽出高质量候选。

**做法**：

1. 使用隔离的 `YMCODE_HOME`，不要让测试污染真实记忆。
2. 配置一个可用的 provider（凭据由用户输入，不写入仓库）。
3. 在一个临时项目里做一次明确纠正（例如“以后提交前必须跑 typecheck”），触发 checkpoint。
4. 等 observer 节流窗口（或把 `observe_interval_minutes` 调小）。
5. 检查 `instinct list` 是否出现 candidate；检查证据/日期/置信度。
6. `promote` 后重启会话，检查 system prompt/rebuild 是否含 `# Active instincts`。
7. 记录输出到 `docs/verification/`。

**验收**：candidate 有证据、晋升后 MEMORY.md 正确、重启后注入可见、`memory` 工具 `type=instinct` 能命中。

## P1：补齐顶层 CLI help 与次级英文

- `packages/cli/src/cli/cmd/*.ts` 的顶层 `describe` 与常用子命令/选项。
- provider 错误、插件 API 文案、`README_npm.md`、`CONTRIBUTING.md`、`SECURITY.md`。
- 不要翻译命令、路径、工具名、provider/model 名。

**验收**：`ymcode --help` 与常用子命令帮助中文；`check:i18n`/`typecheck` 仍绿。

## P2：Windows 全量测试

- 先定位 `test/cli/tui/plugin-*` 的 EBUSY：是模块缓存、子进程，还是 afterEach 顺序。
- 不要用“跳过”冒充通过；要么修 cleanup，要么在测试里明确标注 Windows-only skip 并记录原因。
- 在 Linux/CI 跑一次全量 `bun test`，确认不是代码问题。

**验收**：全量测试在至少一个平台全绿；Windows 的例外有清单和原因。

## P3：TUI 视觉验收

- 在 Terminal/iTerm2 启动，检查首屏、命令面板、权限对话框、provider/status 对话框、错误页。
- 截取中文界面；检查中文字符宽度、换行、对齐。
- 若发现英文残留，按 `localization.md` 加 key。

**验收**：核心路径中文可读，无 key 原名/乱码/溢出。

## P4：上游同步与发布

- 写一个 `script/upstream-diff.ts`：对比 `_upstream_mimo` 与当前树的差异，按目录分类。
- 如果要发布：建立自有远端、release 渠道，更新 `UPSTREAM.md` 和安装/升级逻辑。
- 不要恢复指向 Xiaomi 的默认安装脚本/FDS；当前本地构建已移除这些默认值。

**验收**：能一键查看上游差异；发布流程不依赖 Xiaomi CDN。

## P5：记忆系统增强（可选）

- 把工具/注入的配置阈值统一走 `Config.Service`（目前工具直接 `make()` 用默认值）。
- observer 节流状态从 JSON 文件换成 SQLite/原子写，避免并发丢计数。
- candidate 的 `last_seen_at` 更新策略：目前 `write` 会更新；考虑“仅证据变化才更新”。
- 为 `instinct` 增加 `export/import`，便于跨机器迁移。

**验收**：配置一致、并发安全、有迁移测试。
