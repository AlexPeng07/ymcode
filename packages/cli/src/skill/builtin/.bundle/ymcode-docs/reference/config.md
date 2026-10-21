# ymcode 配置参考

## 文件位置与优先级

配置为 JSON 或 JSONC。ymcode 从 cwd 向上走到工作树根来发现配置，然后回退到全局配置。

- 项目级：`.ymcode/ymcode.json` 或 `.ymcode/ymcode.jsonc`
- 全局：`~/.config/ymcode/ymcode.jsonc` 或 `ymcode.json`（XDG 配置目录）。新安装会生成 `ymcode.jsonc`。
- 额外的配置目录也会通过 `$YMCODE_CONFIG_DIR` 搜索。

项目配置**覆盖**全局配置。始终包含 `"$schema": "https://mimo.xiaomi.com/ymcode/config.json"` 以获得校验。

## 磁盘数据布局

基础目录优先由 `YMCODE_HOME` 解析（必须是绝对路径 → `<home>/{data,cache,config,state}`），否则由 XDG 解析：

| 类别 | 默认位置 | 存放内容 |
|------|------------------|-------|
| data | `~/.local/share/ymcode/` | 记忆、日志、`builtin_skills/<version>/`、bin |
| config | `~/.config/ymcode/` | 全局 `ymcode.jsonc` / `ymcode.json` |
| cache | `~/.cache/ymcode/` | 缓存、下载的二进制 |
| state | `~/.local/state/ymcode/` | 运行时状态，包括 `model.json` 中的 TUI 最近/收藏模型 |

记忆文件位于 `~/.local/share/ymcode/memory/` 下：
- `projects/global/MEMORY.md` — 项目记忆
- `sessions/<id>/checkpoint.md`、`notes.md`、`tasks/<id>/progress.md`
- `global/MEMORY.md` — 跨项目的用户偏好

## 环境变量与标志

- `YMCODE_HOME` — 覆盖所有基础目录（绝对路径）。
- `YMCODE_CONFIG_DIR` — 额外要搜索的配置目录。
- `YMCODE_PURE` — 不加载外部插件运行（等同于 `mimo --pure`）。**不**改变模型或 Claude Code 继承。
- `YMCODE_DISABLE_LOG_ROTATION` — 保留单个持续增长的日志文件，而不轮转。
- `YMCODE_TEXT_TOOL_CALL_RETRY_LIMIT` — 模型把工具调用作为散文标记而非结构化调用发出时的重试次数（默认 2）。
- `YMCODE_EXPERIMENTAL_CRON` — 定时提示词（cron/loop）；**默认开启**。`YMCODE_DISABLE_CRON` 在运行时关闭它。用 `YMCODE_LOOP_KEEPALIVE_BUDGET`（默认 1）与 `YMCODE_LOOP_KEEPALIVE_DELAY_S`（默认 1200）调整循环保活。
- `YMCODE_EXPERIMENTAL_TOKEN_EFFICIENCY_HEURISTIC` — 基于形状的 bash 输出压缩以节省 token；默认关闭。
- `YMCODE_MIMO_ONLY` — 纯 MiMo 模式：不继承 Claude Code 设置（CLAUDE.md、`~/.claude/CLAUDE.md`），不从环境读取提供方 API key，回退到 mimo-auto 模型。
- **外部技能根目录** — 默认加载面为 `.ymcode` + 开放标准 `.agents`。品牌根目录需显式开启：`YMCODE_ENABLE_CLAUDE_CODE_SKILLS`、`YMCODE_ENABLE_CODEX_SKILLS`、`YMCODE_ENABLE_OPENCODE_SKILLS`。用 `YMCODE_DISABLE_AGENTS_SKILLS` 关闭 agents。外部扫描会跳过 `skills/` 下的点号路径段。
- `YMCODE_ENABLE_CLAUDE_IMPORT` — 启动时自动导入 Claude Code 会话；默认关闭。设为 `true` 或 `1` 启用。手动导入会话仍可用；Codex 会话仅在显式请求时导入。
- `YMCODE_DISABLE_BUILTIN_SKILLS`、`_PROJECT_CONFIG` — 功能开关。

## 顶层配置键

全部可选。

### 模型与提供方
| 键 | 用途 |
|-----|---------|
| `model` | 主模型，`provider/model`（例如 `anthropic/claude-2`） |
| `small_model` | **旧版 / 不推荐** —— 为向后兼容从 OpenCode 沿用。建议改为配置 `lite` 组。若设置，其字面 `provider/model` 仍在廉价任务（标题生成等）中优先；若未设置，廉价任务走 `lite` 组 |
| `model_groups` | 可在任何接受模型字符串的位置使用的命名能力层级——见 [Model groups](#model-groups) |
| `provider` | 自定义提供方配置与模型覆盖 |
| `enabled_providers` / `disabled_providers` | 允许列表 / 阻止列表提供方 |

关于自定义端点、适配器选择、提供方复用、凭据处理与验证，编辑前请阅读 @providers.md。

### Model groups

`model_groups` 允许你定义命名能力层级，并在任何接受 `provider/model` 字符串的位置按名称引用（例如 `"ultra"`）——包括 `model` 键、某个智能体的模型、`actor` 子代理的 `model` 参数，以及工作流模型层级。

每个组把名称映射为单个默认模型（字符串简写），或一个带 `default` 与可选成员 `models` 的对象：

```jsonc
{
  "$schema": "https://mimo.xiaomi.com/ymcode/config.json",
  "model_groups": {
    // string shorthand: the group IS its default model
    "lite": "anthropic/claude-haiku",
    // object form: a default plus alternates on other providers
    "standard": {
      "default": "anthropic/claude-sonnet",
      "models": ["anthropic/claude-sonnet", "openrouter/xiaomi/mimo-v2.5"]
    },
    "ultra": "anthropic/claude-opus-4-8"
  },
  "model": "standard"
}
```

**解析规则：**
- 含 `/` 的引用是字面 `provider/model`，按原样使用。
- 不含 `/` 的引用是组名。若已配置，ymcode 是**提供方感知**的：优先使用调用方当前提供方上的成员，否则回退到该组的 `default`。
- `ultra`、`standard`、`lite` 是**内置层级名**。引用但未配置时，会静默回退到默认模型（零配置永不报错）。
- 其他任何未配置的名称都会报错，并模糊提示你已定义的组。
- 廉价任务（小模型）：**配置 `lite` 组**——这是推荐路径。旧版 `small_model` 字面值若已设置仍优先以保持向后兼容，但不建议在新配置中使用。

当你希望一个标签（`"standard"`）在不同提供方上映射到不同具体模型，或全局更换层级而不必逐个修改每个智能体/模型引用时，使用组。

### 智能体
| 键 | 用途 |
|-----|---------|
| `default_agent` | 未指定时使用的主智能体（回退到 `build`） |
| `agent` | 逐智能体配置：`plan`、`build`、`general`、`explore`、`title`、`summary`、`compaction`，以及自定义 |
| `username` | 对话中的显示名称 |

定义自定义智能体/模式时，优先使用 markdown 文件（`.ymcode/agent/<name>.md`，正文 = 系统提示词）——见 @guide.md 的「自定义智能体与模式」一节。短小的逐智能体内联覆盖使用 `agent` 配置键。

### 工具、技能、MCP、扩展
| 键 | 用途 |
|-----|---------|
| `skills` | `paths[]` 额外技能文件夹 + `urls[]` 远程技能索引 |
| `mcp` | MCP 服务器：`local`（command/env）或 `remote`（url/headers/oauth）；`{ "enabled": false }` 禁用其中一个；`sampling` 设置客户端采样策略（`deny`/`ask`/`allow`，默认 `ask`） |
| `tools` | 工具 id → 布尔值的启用/停用记录 |
| `command` | 自定义斜杠命令 |
| `plugin` | 插件规格 |
| `formatter`, `lsp` | 格式化器与语言服务器配置 |
| `instructions` | 要包含的额外指令文件/glob |
| `permission` | 权限规则，包括 `external_directory` 允许列表 |

### 上下文管理

随着上下文被填满，ymcode 会自动检查点（后台写入器把对话提炼进 `checkpoint.md`），并在接近上限时**重建**：在最后一个成功检查点处插入边界，使更早的消息坍缩为检查点摘要，而近期消息逐字保留。若需要重建时检查点写入器仍在运行，重建会等待它（显示「Preparing conversation context…」状态）——已有可用检查点时等待很短，首次检查点则更久——然后继续；若无法产出检查点，则回退到有损压缩。你随时可以用 `/rebuild` 斜杠命令手动触发重建。

触发点是模型的提示词容量（提供方公布时用 `limit.input`，否则 `limit.context`）减去各项预留，可再由 `compaction.max_context` 下调。`ymcode models <provider>` 会为每个模型打印解析后的窗口与触发点，`/status` 同时显示两者以及当前用量。这里有两点用户常碰到：模型可用窗口取决于路由（ChatGPT/Codex 订阅、直连 API key、OpenRouter 之类转售商，对同一模型名可能各不相同；目录里标 1M 不代表该路由提供 1M），且提供方可能对超长提示词收更高价（OpenAI 对超过 272K 输入的 GPT-5.6 请求按 2 倍输入 / 1.5 倍输出计费）——`compaction.max_context` 是应对这两点的旋钮。

| 键 | 用途 |
|-----|---------|
| `compaction.auto` | 上下文满时自动压缩（默认 true） |
| `compaction.prune` | 修剪旧的工具输出（默认 true） |
| `compaction.tail_turns` | 逐字保留的近期用户轮次（默认 2） |
| `compaction.preserve_recent_tokens` | 逐字保留的近期 token 上限 |
| `compaction.reserved` | 用于避免溢出的 token 缓冲 |
| `compaction.max_context` | 比模型窗口更早压缩。所有模型共用一个值，或使用以 `"<providerID>/<modelID>"` 为键的映射（允许通配，最长模式优先）。取值：token 数、`"300K"`、`"1M"`，或窗口的 `"50%"`。总是被夹紧到提供方上限——只能降低触发点，绝不提高。`0` = 无预算。可在 TUI 中用 `/context-limit` 设置 |
| `checkpoint.thresholds` | 上下文填充触发点，例如 `["40%","60%","80%"]` |
| `checkpoint.reserved` | 检查点操作的 token 缓冲（默认 20000） |
| `checkpoint.fork` | 把父前缀分叉进写入器会话以复用缓存（默认 true） |
| `checkpoint.push_caps.*` | 重建上下文的逐段 token 上限（tasks_ledger、focus_task、checkpoint、memory、notes、global、recent_user、……） |
| `checkpoint.task_archive_days` | 已完成/已放弃任务被过滤掉前的天数（默认 7） |
| `checkpoint.memory_search_score_floor` | 记忆检索的 BM25 相对下限（默认 0.15） |
| `memory.cc_index` | 在 `cc` 作用域下索引 Claude Code 记忆（默认 false；隐私说明见 schema） |
| `history` | 对话历史 FTS 索引配置 |

### 自治 / 自我改进
| 键 | 用途 |
|-----|---------|
| `dream.auto` / `dream.interval_days` | 会话启动时自动整合记忆（默认 true / 7 天） |
| `distill.auto` / `distill.interval_days` | 自动打包工作流（默认 true / 30 天） |
| `voice.asr_model` | ASR 模型（默认 `xiaomi/mimo-v2.5-asr`） |
| `voice.control_model` | 语音控制模型（默认 `xiaomi/mimo-v2.5`） |
| `workflow.maxConcurrentAgents` | 进程级子代理并发上限（默认 min(16, 2×cores)） |
| `workflow.maxDepth` | 工作流最大嵌套深度（默认 8） |

### 实验特性
| 键 | 用途 |
|-----|---------|
| `experimental.maxMode` | `max` 智能体并行运行 N 个推理候选，由裁判选出优胜者（`candidates`，默认 5） |
| `experimental.batch_tool` | 启用 batch 工具 |
| `experimental.predict_next_prompt` | 行内幽灵文本式下一提示词预测（默认开启） |
| `experimental.continue_loop_on_deny` | 工具调用被拒时继续循环 |
| `experimental.primary_tools` | 限制为主智能体可用的工具 |
| `experimental.mcp_timeout` | MCP 请求超时（毫秒） |

### 杂项
| 键 | 用途 |
|-----|---------|
| `autoupdate` | `true` / `false` / `"notify"` |
| `share` | `"manual"` / `"auto"` / `"disabled"` |
| `snapshot` | 用于撤销/重做的文件系统快照跟踪（默认 true） |
| `logLevel` | 日志详细程度 |
| `server` | `ymcode serve` 的配置 |
| `enterprise.url` | 企业端点 |

## 示例：常见调整

```jsonc
{
  "$schema": "https://mimo.xiaomi.com/ymcode/config.json",
  "model": "anthropic/claude-opus-4-8",
  "model_groups": { "lite": "anthropic/claude-haiku" },
  "dream": { "auto": true, "interval_days": 3 },
  "compaction": { "tail_turns": 3 },
  "permission": { "external_directory": { "/tmp/**": "allow" } },
  "mcp": {
    "my-server": { "type": "local", "command": ["node", "server.js"] }
  }
}
```
