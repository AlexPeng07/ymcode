# ymcode 使用指南

针对用户最常询问功能的操作说明。配置键见 @config.md；权限见 @permissions.md；命令见 @commands.md。

## 快速开始与认证

1. **登录** —— `mimo account login <url>` 执行设备流：打印 URL + 验证码并打开浏览器。`/connect` 可在 TUI 内完成同样操作（例如添加 OpenRouter）。小米 MiMo、Codex（ChatGPT Pro/Plus）与 xAI（Grok）支持 OAuth 登录；Claude Code 认证可从 `~/.claude/settings*.json` 导入。其他账户子命令：`logout`、`switch`、`orgs`、`open`、`console`。
2. **选择模型** —— 在配置中设置 `"model": "provider/model"`，或在 TUI 模型对话框中实时切换。提供方 API key 会从环境变量自动探测（除非 `YMCODE_MIMO_ONLY=1`）。
3. **列出可用内容** —— `ymcode models`、`mimo providers`。

对于自定义 base URL、API key 或 OpenAI/Anthropic 兼容模型，编辑配置前请阅读 @providers.md；它涵盖协议选择、适配器名称、提供方复用、密钥处理与本地验证。

## TUI 渲染、卡顿与远程使用

**macOS 默认终端** —— ymcode 不支持内置的 Terminal.app。若出现输出错位、闪烁或其他渲染问题，请使用 VS Code 集成终端或安装 iTerm2：

```bash
brew install --cask iterm2
```

**SSH 渲染** —— 如果直接通过 SSH 运行 TUI 很慢，可在本地渲染，只在远程项目目录运行服务器：

```bash
# Remote host
ymcode serve --port 4096

# Local host: keep this tunnel open
ssh -N -L 4096:127.0.0.1:4096 user@remote-host

# Local host: connect from another terminal
ymcode attach http://127.0.0.1:4096
```

**装饰动画** —— 运行 `/vivid`，或配置 `ctrl+p` 中的视觉模式选项，按需在 Vivid 与 Minimal 视觉之间切换。独立的动画覆盖开关可以在不改变所选视觉模式的情况下停止高频运动。

## 记忆：让 ymcode 记住

记忆跨会话持久，并在恢复时自动注入，因此智能体不必重新学习项目背景。

- **项目规则 / 架构** —— 编辑 `MEMORY.md`（项目记忆）。持久规则放在 `## Rules` 下，设计决策放在 `## Architecture decisions` 下。智能体也可能在检查点写入这里。
- **`/dream`** —— 扫描近期会话轨迹，把持久知识晋升到 `MEMORY.md`，并清理陈旧条目。按 `dream.interval_days` 自动运行（默认 7 天）。
- **检查点**（`checkpoint.md`）*只*由检查点写入子代理维护——不要手工编辑。
- **草稿笔记**（`notes.md`）是智能体的自由草稿区。
- 若想让某条规则立即生效而不等检查点，直接告诉智能体——它可以直接编辑 `MEMORY.md`。

用 `checkpoint.*`、`compaction.*` 与 `memory.cc_index` 调整记忆行为（见 @config.md）。

## 自定义斜杠命令

把 markdown 文件放到 `.ymcode/command/<name>.md`（`.ymcode/commands/`、`.claude/command(s)/` 也会读取）。frontmatter 配置该命令；正文是提示词模板。

```markdown
---
description: Review the current diff for security issues
agent: build
model: standard
subtask: false
---
Review the staged diff. Focus on: $ARGUMENTS
```

- 用 `/name your args here` 调用。
- 占位符：`$ARGUMENTS`（全部参数）、`$1`、`$2`、……（位置参数）。若都不存在，参数会被追加到末尾。
- `agent` 选择由哪个智能体运行；`model` 接受 `provider/model` 或组名；`subtask: true` 以子代理方式运行。

命令会在下一轮热重载。

## 自定义智能体与模式（基于文件的系统提示词）

「模式」就是一个带自己系统提示词的**主智能体**。要给 ymcode 增加自定义模式（例如在面向编码的 `build` 之外增加一个 `general` 聊天模式），放一个 markdown 文件即可——无需代码，无需改服务器。frontmatter 是配置；**markdown 正文成为智能体的系统提示词**。

```markdown
---
description: A friendly general-purpose assistant for everyday chat and Q&A
mode: primary
temperature: 0.7
---
You are "General" — a warm, concise, general-purpose assistant.
Keep replies short unless asked to elaborate; you are not focused on coding.
```

文件放置位置（均在下一轮热重载；`.claude/agent(s)` 也会读取）：

| 路径 | 作用域 |
|------|-------|
| `.ymcode/agent/<name>.md`（或 `agents/`） | 项目智能体——最常见 |
| `.ymcode/mode/<name>.md`（或 `modes/`） | 项目模式——等同于强制 `mode: primary` 的智能体 |
| `~/.config/ymcode/agent/<name>.md` | 全局智能体，在所有项目中可用 |

frontmatter 字段（除正文应非空外均可选）：

- `mode` —— `primary`（可用 `Tab` 选择，替换该会话的基础提示词）、`subagent`（可由主智能体通过 `actor`/`task` 工具派生）或 `all`。`mode/` 下的文件始终为 primary。
- `model` —— `provider/model` 或组名（`ultra`/`standard`/`lite`）；`variant`、`temperature`、`top_p` 调节生成。
- `description` —— 何时使用（在子代理的 `@` 自动补全中显示）。
- `permission`、`tool_allowlist`、`tools`、`steps`、`color`、`hidden` —— 见 @config.md。

**它如何到达模型：** 对主智能体而言，正文被用作基础系统提示词，替代模型默认提示词；常规的环境/技能/指令块仍会追加。选择模式是会话级的——通过 TUI 的 `Tab` 选择器，或在 SDK 中通过 `session.prompt` 上的 `agent` 字段。因此桌面/SDK 客户端按会话发送 `agent: "general"` 或 `agent: "build"` 来切换模式；提示词本身在服务端文件中。

用 `ymcode agent list` 验证文件是否加载——你的智能体会带着 `(primary)` / `(subagent)` 模式出现。

配置文件的替代方式：除了 `.md` 文件，也可以把智能体内联在 `agent` 配置键下（`agent.<name>.prompt`，外加 `model`、`mode`、……）；超过几行的内容仍首选 markdown 形式。

## 快捷键

所有 TUI 快捷键都可以在 `keybinds` 配置下重映射。leader 键默认是 `ctrl+x`，因此绑定中的 `<leader>` 表示「先按 ctrl+x，再按……」 。

常用默认值：`Tab` 循环切换智能体 · `<leader>n` 新会话 · `<leader>l` 列出会话 · `<leader>e` 打开外部编辑器 · `<leader>t` 主题 · `<leader>b` 切换侧栏 · `ctrl+r` 重命名会话。把绑定设为 `"none"` 可禁用它。

```jsonc
{ "keybinds": { "session_new": "<leader>c", "sidebar_toggle": "none" } }
```

## MCP 服务器

在 `mcp` 键下添加服务器。两种类型：

```jsonc
{
  "mcp": {
    // local: spawn a process over stdio
    "fs": { "type": "local", "command": ["npx", "-y", "@modelcontextprotocol/server-filesystem", "."] },
    // remote: connect to an HTTP endpoint (OAuth auto-detected; set "oauth": false to disable)
    "docs": { "type": "remote", "url": "https://mcp.example.com", "headers": { "Authorization": "Bearer ..." } },
    // disable one without deleting it
    "old": { "enabled": false }
  }
}
```

用 `mimo mcp` 查看/管理。请求超时默认 5000ms（逐服务器 `timeout`，或全局 `experimental.mcp_timeout`）。

## Compose 模式

端到端功能交付使用 `compose-next` 技能：

- **`compose-next`** —— 一个自包含技能，覆盖 质询 → 工作区 → 规格 → 实现 → 验证 → 审查 → 定稿 → 收尾，功能文档位于工作区根目录的 `docs/compose/spec/<feature>.md`。不要与 plan 模式组合使用。

产物默认落在 `docs/compose/spec/` 下。

对于可拆分为独立子任务、定义明确的任务，优先使用确定性的**工作流**（发射后不管、自动并行化）——见 @workflows.md。

## Jupyter notebook

`notebook-edit` 工具直接编辑 `.ipynb` 单元（替换 / 插入 / 删除单个单元），同时保留周边 JSON、输出与元数据——对 notebook 优先用它而不是原始文本编辑。

## 定时提示词（cron）与循环

**Cron** 按周期或一次性方式把提示词注入会话。它由 `cron` 工具驱动（没有 `/cron` 斜杠命令）；`YMCODE_EXPERIMENTAL_CRON` **默认开启**（关闭开关：`YMCODE_DISABLE_CRON`）。

`cron` 工具有六个动词：

| 动词 | 用途 |
|------|---------|
| `schedule` | 添加任务：`cron`（5 字段表达式）、`prompt`，可选 `one_shot`、`durable`、`session_id` |
| `loop` | 用 `delay_seconds`（夹紧在 60–3600）+ `prompt` 武装一个重复循环 |
| `list` | 列出任务（按 `kind`、`durable_only` 过滤） |
| `get` | 按 `id` 查看单个任务 |
| `rename` | 替换任务的提示词正文 |
| `delete`（别名 `cancel`） | 按 `id` 移除任务 |

- **表达式为 5 字段**（`minute hour dom month dow`），按 **UTC** 求值——没有时区配置。
- **Durable** 任务持久化到 `<project>/.ymcode/scheduled_tasks.json` 并能在重启后存活；非 durable 任务仅在会话内存在。
- 任务触发时，提示词会带 `[cron fire @ <ISO>]` 前缀注入；TUI 会在回复前显示一行 `🕒 cron fire` 时钟行。

**循环** —— `/loop [interval] <prompt>`（一个内置技能）是友好的前端：它解析间隔（例如 `30m`、`2h`），映射为周期性 cron 任务，并立即执行一次提示词。用 `/loops` 管理循环（列出任务；`/loops cancel <id>` 停止一个）。循环在错过轮次的保活预算耗尽或达到 7 天上限后会自动停止。

`/loop`（节奏）与 `/goal`（停止条件）互补且相互独立：`/goal` 决定自主智能体*是否*可以停止；`/loop` 决定它多久运行一次。

## 扩展 ymcode

要添加可复用的任务指令，使用 `skill-creator` 技能，并保存到 `.ymcode/skills/<name>/SKILL.md`。要增加工具，配置 MCP 服务器或使用插件 API。
