# ymcode 命令参考

## CLI（`mimo <command>`）

从 shell 调用。不带命令的 `mimo` 会打开 TUI。

| 命令 | 用途 |
|---------|---------|
| `mimo` | 启动交互式 TUI |
| `ymcode run` | 无头、非交互运行（脚本/评测） |
| `mimo mcp` | 管理 / 查看 MCP 服务器 |
| `ymcode agent` | 管理智能体 |
| `ymcode models` | 列出可用模型 |
| `mimo providers` | 列出 / 管理提供方 |
| `mimo account`（console） | 账户 / 登录控制台 |
| `ymcode upgrade` | 更新到最新版本 |
| `ymcode uninstall` | 卸载 ymcode |
| `ymcode serve` | 运行服务器 |
| `mimo llm-server issue`/`list`/`revoke` | 签发与管理 token，让任务能通过 `/v1` 访问本实例的模型；它不启动任何东西——见 @capability-api.md |
| `mimo stats` | 使用统计 |
| `mimo export` / `ymcode import` | 导出 / 导入会话 |
| `mimo session` | 管理会话 |
| `ymcode github` / `mimo pr` | GitHub / 拉取请求集成 |
| `mimo generate` | 代码生成入口 |
| `mimo plugin`（plug） | 管理插件 |
| `ymcode db` | 数据库工具 |
| `mimo acp` / `ymcode attach` | ACP / 附着到运行中的会话 |
| `mimo debug` | 调试工具 |
| `mimo completion` | 生成 shell 补全脚本 |

运行 `mimo <command> --help` 可查看任何命令的参数。

值得注意的 TUI 参数：`--continue`/`-c`（恢复上次会话）、`--session`/`-s`、`--model`/`-m`、`--agent`、`--never-ask`、`--trust`，以及 `--dangerously-skip-permissions`/`--yolo`（自动批准所有未被明确拒绝的操作；会提示确认一次——见 permissions.md）。

关于终端兼容性、TUI 渲染或卡顿，以及用 `ymcode serve` + `ymcode attach` 通过 SSH 本地渲染，见 @guide.md。

## 斜杠命令（TUI 内）

输入 `/` 查看当前上下文可用的命令。也可以直接在聊天里问，例如「有哪些斜杠命令可用？」或「怎么切换模型？」。ymcode 会解释相关命令，无需你记住命令名。

大多数客户端命令仅当整个输入就是该命令时才执行。`/btw <question>` 以及接受参数的提示词命令是例外。

### 应用命令

| 命令 | 别名 | 用途 / 可用性 |
|---------|---------|------------------------|
| `/sessions` | `/resume`, `/continue` | 列出并继续之前的会话 |
| `/workflows` | — | 打开工作流列表；仅在启用 workflow 实验特性时显示 |
| `/new` | `/clear` | 开始新会话 |
| `/models` | — | 切换模型 |
| `/agents` | — | 切换智能体 |
| `/modalities` | — | 配置自定义模型的输入模态（图像/音频/视频/PDF） |
| `/never-ask` | — | 切换 never-ask 权限模式 |
| `/skip-permissions` | — | 切换运行时对权限询问的自动允许；显式拒绝仍会阻挡 |
| `/mcps` | — | 显示 MCP 服务器状态 |
| `/variants` | — | 切换模型变体；仅在存在变体时显示 |
| `/login` | — | 登录小米 MiMo |
| `/connect` | — | 连接或登录模型提供方 |
| `/logout` | — | 登出小米 MiMo |
| `/org` | `/orgs`, `/switch-org` | 切换组织；在存在多个组织时显示 |
| `/status` | — | 显示系统与会话状态 |
| `/worktree` | `/wt` | 列出并切换工作树 |
| `/themes` | — | 选择配色主题 |
| `/background` | — | 选择主页背景 |
| `/logo` | — | 选择主页 logo 样式 |
| `/vivid` | — | 切换 Vivid 与 Minimal 视觉 |
| `/dark` | — | 切换到深色模式 |
| `/light` | — | 切换到浅色模式 |
| `/help` | — | 打开命令帮助 |
| `/doc` | `/docs` | 打开用户文档 |
| `/exit` | `/quit`, `/q` | 退出 ymcode |
| `/language` | `/lang` | 切换 TUI 语言 |

### 提示词命令

| 命令 | 用途 |
|---------|---------|
| `/editor` | 在外部编辑器中编辑当前提示词 |
| `/skills` | 浏览并选择可用技能 |
| `/revoke-consent` | 撤销对免费服务的同意 |
| `/voice` | 切换流式语音输入（需要 `sox` 与 MiMo 登录） |
| `/voice-send` | 允许语音控制在你说「发送」/ "send it" 时提交（ASR 始终负责听写） |
| `/voice-control` | 切换语音控制 |

### 会话命令

查看会话时可用。部分命令仅在其动作可行时出现。

| 命令 | 别名 | 用途 / 可用性 |
|---------|---------|------------------------|
| `/share` | — | 分享会话；共享被禁用时不可用 |
| `/rename` | — | 重命名会话 |
| `/timeline` | — | 打开消息时间线 |
| `/fork` | — | 从较早的消息分叉会话 |
| `/compact` | `/summarize` | 总结长会话以释放上下文 |
| `/btw <question>` | — | 提一个旁支问题，不加入主对话上下文 |
| `/unshare` | — | 停止共享；仅对已共享会话显示 |
| `/undo` | — | 撤销最近一条消息及其文件改动 |
| `/redo` | — | 恢复被撤销的消息及其文件改动 |
| `/timestamps` | `/toggle-timestamps` | 切换消息时间戳 |
| `/thinking` | `/toggle-thinking` | 切换思考块可见性 |
| `/copy` | — | 复制会话记录 |
| `/export` | — | 导出会话记录 |

### 内置提示词命令

这些命令向智能体提交预定义提示词，可接受尾随参数。

| 命令 | 用途 |
|---------|---------|
| `/init` | 根据代码库生成或更新项目的 `AGENTS.md` 指引 |
| `/review [target]` | 审查一次提交、分支或拉取请求；默认审查未提交改动 |
| `/goal <condition>` | 设置由裁判模型验证的停止条件；`/goal clear` 中止它 |
| `/dream [focus]` | 把近期工作中的持久知识整合进项目记忆 |
| `/distill [focus]` | 把重复的工作流打包成技能、子代理或命令 |
| `/rebuild` | 从最新检查点重建对话上下文，同时逐字保留近期消息 |
| `/context-limit` | 选择当前模型在何处压缩（`200K`/`300K`/`500K`/`1M`/自定义，或模型默认值）；按模型持久化为 `compaction.max_context`。会话运行中会拒绝，因为配置写入会重载实例 |
| `/deep-research <question>` | 执行深度多来源研究；该提示词命令的实现需要 workflow 实验特性 |
| `/loops [cancel <id>]` | 列出或取消定时任务；需要 cron 实验特性 |

### 技能与其他动态命令

斜杠菜单还包含运行时发现的命令：

- `/<skill-name>` 调用可用技能；`/loop [interval] <prompt>` 安排重复提示词，`/compose-next` 启动 规格→交付 的编排工作流。
- 来自 `command/**/*.md` 与 `commands/**/*.md` 的项目级和全局 Markdown 命令，以相对文件名作为斜杠名。
- MCP prompts 会成为斜杠命令，并在自动补全中标记 `:mcp`。
- 同名的自定义命令或 MCP prompt 会覆盖内置提示词命令。技能不会覆盖已有命令。
- 在一条聊天消息中提及两个及以上技能，可自动加载最多三个技能并给出编排计划。

## 快捷键

- `Tab` —— 循环切换主智能体（build → plan）。Build 与 Plan 可随时切换；其他自定义或特殊模式在发出第一条消息后锁定。（许多模型会忽略对话中途注入的工具；从会话开始就固定的技能/工具集能提升工具调用可靠性。）
- 进入 plan 模式是用户手势：`Tab`（或智能体对话框）——不存在 `plan_enter` 工具，因此智能体无法把你置入 plan 模式，除非你主动提起也不会提议。离开则两种方式都行：再按 `Tab` 返回，或由智能体调用 `plan_exit` 请你批准完成的计划并回到 build。
- 其他快捷键可配置；由 keybinds 配置模块管理。

## 备注

- web 命令当前已禁用；TUI 是受支持的界面。
- 语音 ASR（`mimo-v2.5-asr`）仅限 MiMo 平台；语音控制（`mimo-v2.5`）也可通过 `voice` 配置在 OpenRouter 及兼容中继上运行（见 config.md 与 README 的语音章节）。
