# 下一步（按优先级）

## 本轮已完成（2026-10-22）

- 移除小米条款弹窗与 `auth whoami`；默认模型改为优先选择已有凭据的 provider。
- CLI `--help` 全量汉化（顶层 + 33 个命令文件）。
- observer 抽取路径新增 scripted-LLM 集成测试（真实工具执行 + candidate 落盘）。
- TUI 蓝色主题与登录对话框自动化验收；插件入口保留为 API Key。
- instincts：配置阈值统一、observer 状态原子写、`last_seen_at` 稳定策略、export/import。
- `bun run upstream:diff` 上游差异脚本。
- Windows plugin loader 测试按平台跳过（Bun 模块缓存锁目录，见 PROGRESS.md）。
- **P0 实链路冒烟完成**：headless observer 存活缺陷已修复（f722150，drain 槽位 +
  三路幂等 settle + gate 从 Set 删除）；候选/晋升/注入全链路在真实 provider 下验证通过，
  详见 memory/verification.md「P0 observer 实链路冒烟」。
- **远端备份已建**：github.com/AlexPeng07/ymcode（私有），main 已跟踪 origin。
- CI 品牌残留清理（test.yml git identity、brand-allowlist 补 upstream-diff）。
- **新增 `ymcode doctor`**：检查运行时、目录可写性、配置解析与模型可用性、凭据、
  ripgrep、会话数据库与旧版迁移目录；`--json` 便于提交问题报告，`--network`
  额外探测 models.dev 与 github.com。
- **新增 `ymcode setup`**：非交互/交互两用的首次运行向导（服务商 → API Key →
  默认模型 → 写入 auth.json 与全局配置并验证 provider 加载）；TUI 首次无凭据启动
  时自动打开服务商选择框，且只自动出现一次。

## P1：测试整修轮次（Linux 全量已定性）

Linux 全量（自有服务器逐文件串行）结果：pass=5948 / fail=207 / skip=50，41 个文件有失败；
Windows 为 277 fail。失败面大部分与平台无关（main-wait 46 / config/tui 27 /
turn-queue-admission 20 / ymcode-docs 9 两边都挂），需专门整修：
先按"两边都挂 / 仅 Windows / 仅 Linux"三档拆分，两边都挂的优先修。
运维细节见 memory/verification.md「服务器复用方式」。
GitHub Actions 额度耗尽，若后续要用 CI 需在 Billing 充值，或注册 self-hosted runner。

## P2：TUI 像素级人工验收（可选）

自动化已覆盖主题色解析、登录对话框文本、既有权限框与主界面测试；仍建议在真实终端检查：

- 首屏、命令面板、权限对话框、provider/status 对话框、错误页。
- 中文字符宽度、换行、对齐，以及蓝色主题在深浅模式下的对比度。

## P3：发布与上游同步（可选）

- `bun run upstream:diff` 已可用；同步上游时按目录查看差异。
- release.yml 仍是上游小米 FDS 发布管道（secrets 本仓库不存在，tag 触发才会跑）；
  如需自有发布渠道再改造，平时无影响。
- 不要恢复指向 Xiaomi 的默认安装脚本/FDS；当前本地构建已移除这些默认值。

## P4：记忆系统后续（可选）

- 为 instinct 增加 HTTP/工具层面的过滤（例如按 source/status 批量导出）。
- observer 节流状态目前是单进程原子写；多进程并发写仍以最后写入者为准，如需多实例共享需改用 SQLite。
- 为 export/import 增加 bundle 版本迁移策略（当前 version=1）。

## Windows 已知例外

- `test/cli/tui/plugin-*.test.ts` 的 23 个用例在 Windows 上 `skip`：插件入口被 Bun 模块缓存持有，fixture 目录清理报 EBUSY；断言本身在 macOS/Linux 正常运行。
- `test/workflow/workspace.test.ts` 的 `resolveInWorkspace` 4 个用例在 Windows 上 `skip`：断言使用 POSIX 绝对路径。
