# ymcode

ymcode 是一个个人自用的 AI 编程 harness，基于 [MiMo-Code](https://github.com/XiaomiMiMo/MiMo-Code)（进一步源自 [opencode](https://github.com/anomalyco/opencode)）改造。目标不是重写引擎，而是在现有 checkpoint / memory / dream / distill 闭环上补一层可审计的**直觉规则（instincts）**，并把界面与内置内容汉化。

- 上游基线：MiMo-Code `88673c41732fcd57bf46abe485b547c00ba78221`（2026-10-21，MIT）
- 归属与许可：见 [NOTICE](NOTICE)、[LICENSE](LICENSE)、[UPSTREAM.md](UPSTREAM.md)

## 特性

- **记忆体系**：沿用 `MEMORY.md`、`checkpoint.md`、`notes.md`、任务 progress、SQLite FTS5、`/dream`、`/distill`。
- **直觉规则**：带证据、置信度、状态（candidate / active / retired）的 instincts；支持晋升、降级、衰减、按预算注入。
- **全中文内容**：核心 TUI（含侧栏面板、常用对话框、输入框与工作流视图）、agent 提示词、工具描述与用户可见错误为中文；内置技能的名称、介绍、适用场景与触发方式为中文，Anthropic 官方技能的正文保留英文以保证命令与脚本准确。
- **内置技能**：44 个技能目录，包含 Anthropic 官方示例技能（Apache-2.0，LICENSE 随技能保留）、中文写作/办公技能，以及调试、代码审查、Git 工作流等工程技能。
- **独立数据目录**：只使用 ymcode 自己的配置与数据目录，不读取、不迁移旧 mimocode 的任何内容。
- **可验证门禁**：品牌检查、i18n 字典检查、技能代码围栏检查、提示词受保护 token 检查。
- **确定性 hooks**：在 `ymcode.json` 里声明 shell 命令钩子（编辑后 lint、拦截危险命令），与文件级 TS hooks 走同一分发路径（超时、熔断、输出回滚）。
- **后台长任务**：bash 工具 `run_in_background` 让全量测试/长构建立即返回任务 id，`bg` 操作随时轮询输出或停止，退出自动通知会话（最多 5 个并发，30 分钟硬超时）。

## 用户级 hooks

在项目 `.ymcode/ymcode.json`（或全局配置）中声明 shell 钩子。命令在项目目录下用默认 shell 执行，
stdin 收到 JSON 载荷 `{tool, sessionID, callID, args}`，超时 5 秒，连续失败 3 次熔断：

```json
{
  "hooks": {
    "tool.execute.before": [
      { "match": "bash", "command": "node scripts/block-dangerous.js" }
    ],
    "tool.execute.after": [
      { "match": "edit", "command": "node scripts/lint-changed.js" }
    ]
  }
}
```

- `tool.execute.before`：退出码非 0 → 取消本次工具调用，stderr 作为原因反馈给模型。
- `tool.execute.after`：退出码为 0 时 stdout 追加到工具结果，模型下一轮可见。

两个配方脚本都从 stdin 读 JSON 载荷：`lint-changed.js` 取 `args.filePath` 跑 lint 并把结论打到 stdout；
`block-dangerous.js` 取 `args.command`，命中危险模式时 `process.exit(2)` 并把原因写到 stderr。需要更复杂的
逻辑（改参数、订阅事件）时改用 `.ymcode/hooks/*.ts` 文件级钩子（TS 模块，默认导出 hook 对象）。

## 安装

发布资产托管在 GitHub Releases。仓库需公开（或提供可匿名访问、布局一致的镜像）：

```bash
# macOS / Linux
curl -fsSL https://raw.githubusercontent.com/AlexPeng07/ymcode/main/install | bash

# Windows PowerShell
powershell -ep Bypass -c "irm https://raw.githubusercontent.com/AlexPeng07/ymcode/main/install.ps1 | iex"
```

指定版本：Unix 追加 `-s -- --version 0.2.5`，Windows 设置 `$env:VERSION`。
镜像或私有托管：设置 `YMCODE_RELEASE_BASE`，并可用 `YMCODE_RELEASE_LATEST_URL` 指向返回 `tag_name` JSON 或纯版本文本的地址。`ymcode upgrade` 会从同一发布通道获取最新版本。

## 构建

需要 Bun `1.3.14`（仓库已锁定版本）。

```bash
bun ci
bun run typecheck
bun run --cwd packages/cli build:local
```

Windows x64 产物：

```text
packages/cli/dist/ymcode-windows-x64/bin/ymcode.exe
```

如果构建机无法访问 `models.dev`，可在 `packages/cli` 下复用本地模型快照并跳过依赖重装：

```bash
MODELS_DEV_API_JSON=/path/to/models.json bun run script/build.ts --single --skip-install
```

## 运行

```bash
ymcode setup           # 首次运行向导：服务商、API Key、默认模型
ymcode                 # 启动 TUI
ymcode run "..."       # 非交互执行
ymcode serve           # headless server
ymcode doctor          # 检查环境、配置与凭据
ymcode instinct list   # 查看直觉规则
```

隔离测试时设置 `YMCODE_HOME=/tmp/example`。强制界面语言可用 `YMCODE_LOCALE=zh` 或 `YMCODE_LOCALE=en`。

## 目录

- 配置：`~/.config/ymcode`
- 数据与记忆：`~/.local/share/ymcode`（数据库 `ymcode.db`，记忆在 `memory/`）
- 项目级配置：`.ymcode/`

## 记忆与 instincts

- 项目记忆：`memory/projects/<project_id>/MEMORY.md`；非 Git 项目使用 `dir-<hash>` 隔离，避免不同目录互相污染。
- 体检：`ymcode memory doctor` 检查记忆文件数/体积、重复行、陈旧文件与 FTS 索引一致性。
- 直觉规则：`memory/projects/<project_id>/instincts/*.md`，索引 `INSTINCTS.md`
- 捕获：checkpoint 成功后由 `instinct-observer` 子代理节流生成候选；只写候选，不晋升。
- 晋升：`ymcode instinct promote <id>`（需达到置信度与证据阈值）或 `/instinct`；`/dream` 会执行 review。
- 面板：TUI 中 `/instincts` 浏览候选与生效规则，支持晋升/强制晋升/降级/删除/review，并可切换项目与全局范围。
- 快捷记忆：会话中 `/remember <规则>` 直接写入带当前会话证据的候选（不带参数会打开输入框），之后可在 `/instincts` 中晋升。
- 注入：只有 `active` 规则进入上下文（默认 1200 token 预算）；候选通过 `memory` 工具检索。
- 配置：`instincts.enabled`、`capture`、`promote_threshold`、`min_evidence`、`decay_days`、`inject_token_budget`、`observe_interval_minutes`。

## 发布

1. 让 `packages/{cli,sdk,plugin,shared}/package.json` 的版本一致（例如 `0.2.8`）。
2. 提交后打 tag 并推送：`git tag v0.2.8 && git push origin main --tags`。

`release.yml` 会校验 tag 与版本、跑门禁与测试、构建 12 个平台的 archive，并创建 GitHub Release。npm 与 FDS 是可选通道，分别由仓库变量 `YMCODE_PUBLISH_NPM=1`、`YMCODE_PUBLISH_FDS=1` 开启。

### 关于杀毒软件告警

`ymcode upgrade` 在 Windows 上会**原地替换正在运行的可执行文件**（先把当前 exe
改名，再把新版本复制到原路径）——这是自更新程序的常见做法，但它与文件感染型恶意
软件的行为特征相同。实测卡巴斯基会给出行为判定 `PDM:Trojan.Win32.Generic.nblk`
并删除文件（`PDM` 前缀表示行为判定，不是对文件内容的签名命中；官方发布资产的
哈希可自行核对）。

如果遇到：把 ymcode 安装目录加入排除列表即可；更彻底的办法是等待发布二进制
加入 Authenticode 代码签名。若你从 Releases 下载压缩包手工使用（不跑 `upgrade`），
不会触发该行为。

## 汉化门禁

```bash
bun run check:brand
bun run check:i18n
bun run check:skills
bun run check:prompts
```

- `check:brand`：第一方旧品牌 token 扫描（外部 Xiaomi MiMo 模型、opencode 上游与第三方品牌在允许清单内）。
- `check:i18n`：en/zh 字典对齐、空值、内置技能描述，并扫描 TUI 组件中静态 `t()` 引用是否都有对应词条。
- `check:skills`：90 个内置 `SKILL.md` 的代码围栏、行内代码、URL 与中文正文。
- `check:prompts`：提示词的代码围栏、受保护路径/工具名与中文正文。

## 上游同步

本仓库是独立历史，不自动合并上游。上游只读副本位于 `_upstream_mimo/`（gitignore），同步流程与改名边界见 [UPSTREAM.md](UPSTREAM.md)。上游英文 README 快照保存在 `docs/upstream/`。

## 交接记忆

`memory/` 保存本次构建的上下文、架构、验证证据和下一步。下一个 harness 先读 `memory/MEMORY.md`；可直接使用 `memory/continue-prompt.md` 作为续作提示词。运行时记忆在 `~/.local/share/ymcode/memory/`，两者不要混淆。

## 开发说明

- 测试：`bun test`（TUI 测试默认使用英文 locale，避免断言依赖系统语言；生产环境按系统语言自动选择）。
- 已发布的 `packages/cli/migration/*/migration.sql` 不再修改；新 schema 变更使用新迁移目录。
- 所有用户可见文案中文；代码注释、内部日志、协议字段保持英文。
