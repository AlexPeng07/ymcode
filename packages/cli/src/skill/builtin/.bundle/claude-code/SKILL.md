---
name: claude-code
description: "仅在用户明确要求使用 Claude Code 或点名本技能时，才通过终端操作 Claude Code CLI（v2.1+）。涵盖 print 模式（-p）、交互式 tmux 会话，以及后台（--bg）编排。 | Trigger keywords: Claude Code CLI, claude -p, tmux session, claude --bg, claude agents, claude ultrareview."
version: 2.0.0
license: MIT
platforms: [linux, macos, windows]
---

# Claude Code 委派

把编码工作委派给 Claude Code——Anthropic 的自主编码智能体 CLI。

**安装配置（一次）：** `npm install -g @anthropic-ai/claude-code && claude auth login` · 用 `claude auth status` / `claude doctor` 验证。CI token：`claude setup-token`。完整的认证/安装变体 → `references/flags.md`。

**平台检查（运行任何东西之前）：** 先检测操作系统。本技能中所有 shell 示例都是 POSIX（bash），Linux/macOS 可直接照用。在 **Windows** 上，print 模式和后台模式可在 PowerShell/Git Bash 中原生运行 Claude Code，但交互式 tmux 编排需要 **WSL**。shell 语法对照表（引号、环境变量、管道、路径）→ `references/platforms.md`。

## 模式选择（先做决定）

| 任务形态 | 模式 | 原因 |
|---|---|---|
| 一次性任务：修 bug、加功能、审查差异、提取数据 | **Print `-p`** ← 默认 | 无 PTY、无对话框、结构化输出 |
| 多轮迭代：重构 → 审查 → 修复 → 测试；需要斜杠命令 | **交互式 tmux** → `references/interactive-tmux.md` | 完整 REPL，需要处理对话框 |
| 长时运行、不应阻塞；大规模扇出监督 | **后台 `--bg`** | 通过 `claude agents` 原生监督 |
| 高风险 PR 审查 | **`claude ultrareview [pr#]`** | 云端多智能体，由退出码驱动（会把差异上传到云端——绝不要在含密钥的分支上使用） |

不要为并行工作手工拼 tmux 扇出——优先使用 `--bg` + `claude agents --json --all`。

## Print 模式（覆盖 90% 的场景）

```
terminal(command="claude -p 'Fix the auth bug in src/auth.py' \
  --allowedTools 'Read,Edit' --max-turns 10 --output-format json",
  workdir="/path/to/project", timeout=180)
```

**务必设置：** `workdir` · `--max-turns`（5–10；仅 print 模式）· `--allowedTools`（最小权限：`Read,Edit,Write,Bash`，以及 `Bash(git *)` 这类模式）。

**JSON 结果字段：** `result`（文本）· `session_id`（用于恢复）· `subtype`（`success` | `error_max_turns` | `error_budget`）· `total_cost_usd` · `num_turns` · `structured_output`（配合 `--json-schema`）。

**常见变体：**

```bash
git diff main... | claude -p 'Review for bugs' --max-turns 1     # pipe input, cheapest review
claude -p 'Continue: add pooling' --resume <session_id>          # resume; --continue = latest in cwd; --fork-session = branch
claude -p 'List functions' --output-format json --json-schema '<schema>' --max-turns 5   # structured extraction (needs turns to read files)
claude --bare -p 'task' --settings ci.json                       # CI: skips hooks/plugins/CLAUDE.md; auth = ANTHROPIC_API_KEY only
claude -p 'task' --max-budget-usd 0.50 --fallback-model haiku    # cost cap (min ~$0.05) + overload fallback
```

流式输出、stream-json 事件、双向输入、缓存复用（`--exclude-dynamic-system-prompt-sections`）→ `references/print-mode.md`。

## 后台模式

```bash
claude --bg 'investigate flaky test in tests/api.test.ts'   # NOT compatible with -p
claude agents --json --all                                   # list/inspect
claude attach <id> | logs <id> | stop <id> | respawn <id> | rm <id>
```

## 护栏与坑点（违反会搞坏智能体）

1. **`-p` 会自动跳过信任/权限对话框**（任何非 TTY 环境都会如此）——只在受信任的目录中运行。
2. **交互模式必须用 tmux**（Windows 上只能在 WSL 内使用——绝不要在 PowerShell/cmd 中尝试 tmux；请改用 `-p` 或 `--bg`）；启动时有两个对话框，且 `--dangerously-skip-permissions` 对话框默认选中 **"No, exit"**（必须先发送 `Down` 再发送 `Enter`）。完整模式 → `references/interactive-tmux.md`。
3. **会话恢复按目录隔离**——`--continue` 只能找到同一 cwd 下的会话。
4. **斜杠命令在 `-p` 中不生效**——改用自然语言描述任务。
5. **上下文超过 70% 会降低质量**——在交互式会话中监控 `/context`，使用 `/compact`。
6. **清理**：完成后 kill 掉 tmux 会话，并用 `claude stop/rm` 停掉后台会话。
7. **不要杀掉慢会话**——先抓取进度（`tmux capture-pane` / `claude logs`）。
8. **回报结果**：完成后总结改了什么（使用 JSON 的 `result` + `git diff`）。

## 参考资料（按需阅读）

| 文件 | 何时阅读 |
|---|---|
| `references/print-mode.md` | 流式输出、stream-json 事件、管道、schema、会话管理、缓存复用 |
| `references/interactive-tmux.md` | 任何 tmux/PTY 会话：对话框、send-keys、监控、斜杠命令、快捷键 |
| `references/flags.md` | 完整 CLI 参数与子命令表、认证变体、环境变量、模型/推理强度选择 |
| `references/config.md` | CLAUDE.md/记忆、设置层级、自定义智能体、hooks、MCP、插件、项目清理 |
| `references/platforms.md` | 在 Windows（PowerShell/Git Bash/WSL）或 macOS 上运行：shell 语法转换、路径、各系统特有的坑 |
