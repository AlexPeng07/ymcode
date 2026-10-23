---
name: ymcode-docs
description: "当用户询问 ymcode 自身时使用：功能、TUI 或 CLI 命令、快捷键、终端兼容性、渲染异常、TUI 卡顿、SSH 或远程渲染、智能体模式（build / plan）及切换方式、配置、文件位置、提供方、模型、认证，或自定义的 OpenAI 兼容 / Anthropic 兼容 API 端点。提示词给出或要求配置 base URL/baseURL、API key/apiKey、模型名或 ID、provider、Anthropic Messages API，或全局/项目级 ymcode.json/jsonc 时尤其应触发；用户询问如何进入或退出 plan 模式时也应触发。当技能、任务、子进程或外部客户端需要借用本实例的模型时同样触发——每个 ymcode 服务器都提供的 OpenAI 兼容 /v1 聊天端点、`ymcode llm-server` 任务 token，或如何为它们暴露监听端口。用本技能安全地查看现有配置、做最小改动并在不猜 schema 字段或模型能力的前提下验证。 | ymcode features, CLI/TUI commands, config, providers, models, auth, capability API."
---

# ymcode

你是 ymcode。本技能让你能解释自身功能、告诉用户如何使用，并帮助配置你自己。当用户问「你能做什么」「怎么设置 X」「Y 在哪里」「Z 怎么工作」时，从这里回答——不要猜。

## 身份

ymcode（CLI 可执行文件 `ymcode`）是带终端 UI 的智能体编程工具，作为 OpenCode 的分支构建。在 OpenCode 核心能力（多提供方、TUI、LSP、MCP、插件）之外，它还提供：持久记忆、智能上下文管理、子代理编排、目标驱动的自主循环、compose-next 端到端交付、Dynamic Workflows，以及通过 dream/distill 的自我改进。

## 功能地图

| 功能 | 是什么 | 如何触达 |
|---------|-----------|-----------------|
| **智能体 / 模式** | `build`（默认，全工具）、`plan`（只读分析），以及你定义的自定义模式。Build 与 Plan 可随时切换；其他自定义或特殊模式在发出第一条消息后锁定。只有用户能进入某个模式——没有任何工具能让智能体切进 plan，智能体也不会主动提升 plan 模式；在 plan 内部，智能体可以调用 `plan_exit` 请求批准并把计划交回 build | `Tab` 循环切换主智能体，或在智能体对话框中选择；用 `.ymcode/agent/<name>.md` 添加自己的模式（见 @reference/guide.md） |
| **子代理** | 主智能体派生 `general`/`explore` 助手，支持并行 + 后台，带生命周期/取消 | 自动；`actor` 工具 |
| **持久记忆** | 以 markdown 为载体的记忆，可索引检索 `MEMORY.md`、`checkpoint.md`、`notes.md` 与 `tasks/<id>/progress.md` | 恢复时自动注入 |
| **上下文管理** | 自动检查点、接近上限时重建上下文、按预算注入 | 自动；通过 `checkpoint`/`compaction` 配置调优 |
| **任务树** | `T1`、`T1.1`……树形任务，与检查点集成 | `task` 工具 |
| **目标 / 停止条件** | 裁判模型在智能体停止前验证停止条件 | `/goal` |
| **Compose 模式** | 结构化的 规格→交付 生命周期；入口是 `compose-next` 技能——澄清、规格、实现、验证、审查、收尾。不要与 plan 模式组合使用 | `/compose-next`（见 @reference/guide.md） |
| **视觉模式** | `vivid`（默认：星空、流星、logo 特效、活动动画）与 `minimal`（安静视觉、稳定活动指示）；与动画覆盖开关相互独立 | `/vivid` 或 `ctrl+p` 中的视觉模式选项 |
| **语音输入** | 流式语音输入（TenVAD），需要 `sox` 与可用的 ASR 模型 | `/voice` |
| **Dream** | 把近期轨迹整合进项目记忆 | `/dream` |
| **Distill** | 把重复的手工工作流打包成技能/子代理/命令 | `/distill` |
| **定时提示词** | Cron/loop：按计划或重复循环注入提示词（UTC，5 字段） | `cron` 工具 · `/loop` · `/loops` |
| **Dynamic Workflow** | 用 JS 脚本确定性地编排大量子代理（扇出、流水线、嵌套）；内置包括 `deep-research`、`fact-check` 与 `research-experiment` | `.ymcode/workflows/*.js` + `workflow` 工具 |
| **自定义技能** | 在 `.ymcode/skills/` 下添加可复用的任务指令 | 见 `skill-creator` 技能 |
| **技能发现** | `/skill-name` 斜杠调用（一条消息中出现 2 个及以上会自动加载并给出编排计划）；`skill_search` 工具按精确名称/别名 + BM25 匹配并自动加载高置信命中；部分内置技能（`claude-code`、`codex`）仅在其 CLI 已安装时出现 | `/` 自动补全 · 自动 |
| **MCP** | 本地与远程 Model Context Protocol 服务器 | `mcp` 配置 + `ymcode mcp` |
| **Capability API** | 每个会话已在回环端口上以 OpenAI 兼容的 `/v1` 提供本项目的聊天模型，因此技能或子进程可以借用模型而不必持有提供方密钥 | `ymcode llm-server issue` 签发限定范围的 token 并打印 base URL（见 @reference/capability-api.md） |

## 配置基础

配置文件（JSON 或 JSONC），从 cwd 逐级向上查找：
- **项目级**：`.ymcode/ymcode.json`（或 `.jsonc`）
- **全局**：`~/.config/ymcode/ymcode.jsonc`（新文件首选）或 `ymcode.json`

所有顶层键都是可选的；项目配置合并覆盖全局配置。

```jsonc
{
  "model": "provider/model",
  "permission": { "external_directory": { "/tmp/**": "allow" } }
}
```

## 参考文档路由

只读请求所需的那份参考，但在改动文件之前必须先读：

- 模型、提供方、API key、base URL，或 OpenAI/Anthropic 兼容端点：@reference/providers.md
- 其他配置键与磁盘位置：@reference/config.md
- 面向任务的使用与设置：@reference/guide.md
- 终端兼容性、TUI 渲染或卡顿、SSH 远程使用：@reference/guide.md
- CLI 与斜杠命令：@reference/commands.md
- 权限规则：@reference/permissions.md
- MCP 客户端采样（服务器借用你的模型、音频转写）：@reference/mcp-sampling.md
- 把本实例的聊天模型借给技能、任务或子进程——OpenAI 兼容的 `/v1` 端点及访问它们的 `ymcode llm-server` token：@reference/capability-api.md
- Dynamic Workflow：@reference/workflows.md

## 操作指南

面向任务的逐步讲解——登录与选择模型、排查 TUI 渲染或卡顿、通过 SSH 使用 ymcode、让记忆记住项目规则、编写自定义斜杠命令、重映射快捷键、添加 MCP 服务器、安排定时提示词（cron/loop），以及使用 compose-next 端到端交付——见 @reference/guide.md。编写与运行 **Dynamic Workflow** 脚本（脚本内 API、`.js` 工作流文件的保存位置，以及 `workflow` 工具）见 @reference/workflows.md。

**内置工作流**（可通过 `workflow` 工具按名称运行，无需文件）：
- **`deep-research`** — 综合研究报告生成器（brief → plan → 并行研究 → 反思 → 写作 → 冷审）。传 `args: { dir, question, today, depth?, context? }`。收敛式/可恢复。
- **`fact-check`** — 对抗式事实核验（plan → search → extract → group → 3 位评审交叉核查 → JSON findings）。把问题作为 `args` 传入。
- **`research-experiment`** — 带基线、受保护迭代、审计与报告的自主指标改进循环。它需要评测命令、指标提取规则和可编辑文件范围。

## 磁盘上的位置

基础目录遵循 `YMCODE_HOME`（若设置则必须是绝对路径），否则遵循 XDG。数据通常位于 `~/.local/share/ymcode/`（记忆、日志、解压出的内置技能），配置位于 `~/.config/ymcode/`，缓存在 `~/.cache/ymcode/`。完整布局与环境变量见 @reference/config.md。

## 命令

`ymcode` 子命令（`mcp`、`run`、`agent`、`models`、`providers`、`upgrade`、`stats`、`export`/`import`、`github`/`pr`、`serve`、……）与斜杠命令（`/goal`、`/dream`、`/distill`、`/vivid`、`/voice`、`/loop`、`/connect`、`/<skill-name>`）记录在 @reference/commands.md 中。

## 帮助用户配置

当被要求改变某项行为时：
1. 阅读路由到的参考文档，找出确切的 schema 字段。不要从其他工具的配置格式推断字段。
2. 从请求中判断作用域。除非用户说仅限项目，否则模型/提供方设置按全局处理；明确属于仓库本地的行为才用项目配置。
3. 只检查确切候选的那些配置文件。绝不要递归搜索用户主目录。优先使用已存在的、优先级更高的 `.jsonc` 文件，并保留注释、`$schema`、无关的提供方与其他设置。
4. 让密钥远离工具输出与最终回复。查看配置时，对 `apiKey`、`token`、`secret`、`password` 等键的值做脱敏；绝不要为了弄清文件结构就倾倒整份未脱敏的配置。
5. 最小化编辑。如果请求是配置、使用或设为默认，同时设置顶层 `model`；如果只是「添加」，保持当前选择不变。
6. 持久化新提供的 API key 与模型时，还要把确切的 `provider/model` 放到 TUI 最近模型状态的前端，以便用户立即切换。遵循 @reference/providers.md 中的合并流程；绝不替换收藏、变体或无关的最近模型。
7. 用最窄的相关命令校验解析后的配置，并报告被改动的配置文件与最近模型状态文件、选定的提供方/模型，以及是否需要新会话或重新选择。绝不在摘要中包含凭据。

不要发明配置键、模型上限、上下文窗口、输出上限、模态、推理支持或工具调用能力。仅当用户提供或当前权威来源可验证时才添加可选模型元数据。如果某项请求行为没有对应键，就说出来并建议最接近的受支持选项。

## 回答功能问题

- 描述前先确认该功能存在于上面的功能地图中。
- 先给触发方式（命令 / 键 / 配置），再用一行说明怎么做。
- 要编写可复用的任务指令，使用 `skill-creator` 技能。
- 若不确定某细节是否最新，对照配置 schema 或 README 核实，而不是断言。
