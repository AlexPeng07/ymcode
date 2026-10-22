# 下一步（按优先级）

## 本轮已完成

- 移除小米条款弹窗与 `auth whoami`；默认模型改为优先选择已有凭据的 provider。
- CLI `--help` 全量汉化（顶层 + 33 个命令文件）。
- observer 抽取路径新增 scripted-LLM 集成测试（真实工具执行 + candidate 落盘）。
- TUI 蓝色主题与登录对话框自动化验收；插件入口保留为 API Key。
- instincts：配置阈值统一、observer 状态原子写、`last_seen_at` 稳定策略、export/import。
- `bun run upstream:diff` 上游差异脚本。
- Windows plugin loader 测试按平台跳过（Bun 模块缓存锁目录，见 PROGRESS.md）。

## P0：真实 provider 下的 observer 冒烟（仅剩人工）

**为什么**：自动化测试用 scripted SSE 验证了“LLM 返回 tool-call → instinct 工具 → candidate”，但还没有验证真实模型能否稳定抽出高质量候选。

**做法**：

1. 使用隔离的 `YMCODE_HOME`，不要污染真实记忆。
2. 配置一个可用 provider（凭据由用户输入，不写入仓库）。
3. 在临时项目里做一次明确纠正（例如“以后提交前必须跑 typecheck”），触发 checkpoint。
4. 等 observer 节流窗口（或把 `observe_interval_minutes` 调小）。
5. 检查 `instinct list` 是否出现 candidate；检查证据/日期/置信度。
6. `promote` 后重启会话，检查 system prompt 是否含 `# Active instincts`。
7. 结果记录到 `docs/PROGRESS.md`。

**验收**：candidate 有证据、晋升后 MEMORY.md 正确、重启后注入可见、`memory` 工具 `type=instinct` 能命中。

## P1：TUI 像素级人工验收（可选）

自动化已覆盖主题色解析、登录对话框文本、既有权限框与主界面测试；仍建议在真实终端检查：

- 首屏、命令面板、权限对话框、provider/status 对话框、错误页。
- 中文字符宽度、换行、对齐，以及蓝色主题在深浅模式下的对比度。

## P2：发布与上游同步（可选）

- `bun run upstream:diff` 已可用；同步上游时按目录查看差异。
- 若要发布：建立自有远端、release 渠道，更新 `UPSTREAM.md` 和安装/升级逻辑。
- 不要恢复指向 Xiaomi 的默认安装脚本/FDS；当前本地构建已移除这些默认值。

## P3：记忆系统后续（可选）

- 为 instinct 增加 HTTP/工具层面的过滤（例如按 source/status 批量导出）。
- observer 节流状态目前是单进程原子写；多进程并发写仍以最后写入者为准，如需多实例共享需改用 SQLite。
- 为 export/import 增加 bundle 版本迁移策略（当前 version=1）。

## Windows 已知例外

- `test/cli/tui/plugin-*.test.ts` 的 23 个用例在 Windows 上 `skip`：插件入口被 Bun 模块缓存持有，fixture 目录清理报 EBUSY；断言本身在 macOS/Linux 正常运行。
- `test/workflow/workspace.test.ts` 的 `resolveInWorkspace` 4 个用例在 Windows 上 `skip`：断言使用 POSIX 绝对路径。
