# ymcode 权限参考

权限管控智能体在不询问的情况下可以做什么。在顶层 `permission` 键下配置。

## 动作

每条规则都解析为三种动作之一：

| 动作 | 含义 |
|--------|---------|
| `allow` | 不提示直接运行 |
| `ask` | 提示用户确认（风险操作的默认值） |
| `deny` | 完全阻止 |

## 两种形态

权限规则**要么**是单个动作字符串，**要么**是以 glob 为键的动作字符串映射（适用于参数是路径、命令或其他值得匹配的名称的工具）：

```jsonc
{
  "permission": {
    // whole-tool action
    "webfetch": "allow",
    // glob-keyed: match on the tool's path/command argument.
    // Later rules win, so put the catch-all FIRST and specifics after it.
    "bash": {
      "*": "ask",
      "git *": "allow",
      "rm -rf *": "deny"
    }
  }
}
```

顶层裸字符串（`"permission": "allow"`）会变成 `{ "*": action }`——对一切的一揽子默认。

## 可配置的工具

以 glob 为键（接受 glob 映射形式）：`read`、`edit`、`glob`、`grep`、`list`、`bash`、`task`、`actor`、`external_directory`、`lsp`、`skill`、`mcp_sampling`。键是该工具的路径或命令参数，但 `mcp_sampling` 例外，其键是 MCP 服务器名。

仅用简单动作：`question`、`webfetch`、`websearch`、`codesearch`、`doom_loop`。

`doom_loop` 是当重复的相同工具调用看起来像死循环时升起的安全闸门。除非周边自动化另有可靠的停止条件，否则保持为 `ask`（默认值）。

`mcp_sampling` 管控 MCP 的**客户端采样**：MCP 服务器请求 ymcode 代其执行一次模型调用（`sampling/createMessage`），因此服务器自身无需 API key。glob 参数是 MCP 服务器名，所以你可以允许一个服务器而让其余保持 `ask`：

```jsonc
{
  "permission": {
    "mcp_sampling": { "*": "ask", "mimo-cut": "allow" }
  }
}
```

提示会显示是哪个服务器请求、将运行哪个模型、内容类型与音频大小，以及系统提示词与用户提示词的预览。逐服务器的 `mcp.<name>.sampling` 取值 `deny` 会在任何提示或模型工作之前拒绝；`allow` 跳过提示但仍执行大小上限、请求超时与模型能力检查。任一控制给出 `deny` 都胜出：`mcp.<name>.sampling: "allow"` **不会**覆盖 `permission.mcp_sampling` 对该服务器的拒绝。见 @mcp-sampling.md。

未知键会落入 catch-all 记录，因此未来/自定义工具也可以具名配置。

## 常用配方

自动允许只读 git，阻止破坏性 shell：
```jsonc
{ "permission": { "bash": { "git status": "allow", "git log *": "allow", "git diff *": "allow", "rm -rf *": "deny" } } }
```

允许系统临时目录（需主动选择；有已知风险——临时目录全局可写）：
```jsonc
{ "permission": { "external_directory": { "/tmp/**": "allow" } } }
```

每次编辑文件前询问：
```jsonc
{ "permission": { "edit": "ask" } }
```

## 跳过权限提示

对于可信、可弃的环境（容器、沙箱、CI），可以自动批准智能体的一切操作。

| 入口 | 方式 |
|---------|-----|
| TUI（`ymcode`） | `ymcode --dangerously-skip-permissions` 或 `ymcode --yolo` |
| 运行时 TUI | `/skip-permissions` —— 会话中途切换，实例级生效，子代理继承 |
| 无头（`ymcode run`） | `ymcode run --dangerously-skip-permissions "<prompt>"` 或 `ymcode run --yolo "<prompt>"` |
| 任意入口（环境变量） | `YMCODE_PERMISSION='"allow"'` 或 `YMCODE_DANGEROUSLY_SKIP_PERMISSIONS=1` |

`/skip-permissions` 开关会自动允许权限询问，但 `deny` 规则仍然有效；强制询问的操作（例如破坏性 bash）仍会提示，并在 60 秒后自动拒绝（`YMCODE_SKIP_ALL_FORCED_ASK_TIMEOUT_MS`），附带模型可据以行动的反馈，使无人值守运行不会挂死。

语义：一个**允许一切的基底被注入到你的配置之下**，因此没有规则的工具会自动批准。由于注入的 `*: allow` 位于你的规则之前，且最后匹配的规则胜出，**你写的任何显式规则仍然优先**——`deny` 会阻止，遗留的 `ask` 仍会提示。有两点后果值得了解：

- 像 `"permission": { "*": "ask" }` 这样的顶层 catch-all 会让 TUI/环境变量形式失效（你的 `*: ask` 压过注入的 `*: allow`）。移除它，或使用 `ymcode run --dangerously-skip-permissions`，后者在事件层自动应答，也会覆盖 `ask`。
- 通过 `tools` 键禁用的工具（`"tools": { "codesearch": false }`）会被「允许一切」重新启用，因为该开关弱于真正的 `permission` 规则。如果需要它保持关闭，请用 `permission: { codesearch: "deny" }`。

在 TUI 中，该标志受启动时一次红色确认的约束（你必须显式接受风险）；没有 TTY 时会跳过提示，因此在 CI / 管道 stdin 中危险模式会无确认地激活。这确实危险——恶意提示词、文件或插件可以无需确认地运行任意命令。只在完全信任工作区的地方使用。

## 备注

- 规则按你原始插入顺序求值，**最后匹配的规则胜出**。把 `*` catch-all 放在**最前**，更具体的模式放在后面——放在最后的 `*` 会遮蔽其上方的一切（例如末尾的 `"*": "ask"` 会让前面的 `allow`/`deny` 规则变成死代码）。
- `external_directory` 管控项目工作目录之外的读写——默认会提示，因此 ymcode 绝不会悄悄扩大范围。
- 权限不能由自定义工具/hook 修改——它们是自我扩展面唯一无法覆盖的系统。
