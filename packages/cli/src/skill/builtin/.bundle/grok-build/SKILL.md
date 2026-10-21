---
name: grok-build
description: "Grok Build CLI（`grok`）的参考与工作流指南，涵盖交互式与无头运行、认证、会话、工作树、权限、沙箱、MCP 服务器、插件、检查、更新以及自动化输出。仅在用户明确要求 `grok-build` 技能、明确要求使用 Grok Build CLI，或已选定的工作流需要 Grok Build 时才调用；不要为通用编码、普通 shell 任务或其他智能体 CLI 调用本技能。 | Trigger keywords: Grok Build CLI, grok -p, grok agent stdio, grok worktree, xAI agent CLI."
---

# Grok Build CLI

在终端中操作 Grok Build，同时把执行模式、权限、沙箱、会话状态和输出处理都显式化。

## 从本地证据开始

1. 确认该 CLI 可用：

   ```bash
   command -v grok
   grok version
   ```

2. 在给出对版本敏感的建议之前，先查看已安装命令的帮助：

   ```bash
   grok --help
   grok <subcommand> --help
   ```

3. 当行为取决于规则、技能、插件、hooks 或 MCP 服务器时，检查为目标工作区发现的配置：

   ```bash
   grok --cwd /path/to/repo inspect
   grok --cwd /path/to/repo inspect --json
   ```

4. 当前官方文档和已安装帮助若与本随附参考不一致，以官方文档和已安装帮助为准。

## 选择执行模式

- 不带参数运行 `grok` 进入交互式 TUI。
- 运行 `grok "<initial prompt>"` 以带初始任务打开 TUI。
- 运行 `grok -p "<prompt>"` 执行一轮非交互运行，打印结果后退出。
- 运行 `grok agent stdio` 启动通过 stdin/stdout 通信的 ACP 客户端。
- 运行 `grok dashboard` 打开 Agent Dashboard。

脚本、CI、机器人和智能体编排优先使用无头模式。仅当调用方实现了 ACP JSON-RPC 生命周期并消费 `session/update` 分片时才使用 ACP。

## 认证

在开发机上使用交互式登录：

```bash
grok login
```

在无头或远程环境中使用设备码认证：

```bash
grok login --device-auth
```

使用本地缓存的登录，或只把 `XAI_API_KEY` 提供给需要它的进程。绝不要打印、持久化或提交凭据。用 `grok logout` 清除缓存的凭据。

## 无头运行

显式指定工作目录和输出格式：

```bash
grok --no-auto-update \
  --cwd /path/to/repo \
  --sandbox workspace \
  -p "Inspect the repository and explain the failing test." \
  --output-format json
```

按消费方选择输出：

- 供人阅读时使用 `plain`。
- 需要一个最终机器可读对象时使用 `json`。
- 需要按行分隔的增量事件时使用 `streaming-json`。
- 当已安装的 CLI 支持受约束的结构化输出时，加上 `--json-schema '<schema>'`。

在脚本和 CI 中传入 `--no-auto-update`，以关闭后台更新检查。不要在自动化中解析交互式 TUI 的渲染结果。

## 控制权限与隔离

把权限和沙箱视为两套独立的控制：

- 用权限规则决定某次工具调用是否允许运行。
- 用沙箱 profile 限制已批准的调用可以访问什么。
- 常规仓库改动优先使用 `--sandbox workspace`。
- 审查和审计优先使用 `--sandbox read-only`。
- 面对不受信任的仓库优先使用 `--sandbox strict`，再补充收窄的权限规则。
- 用 `--allow <RULE>` 和 `--deny <RULE>` 设置单次运行策略；记住 deny 规则优先。
- 仅当环境和命令范围都足以支撑无人值守执行时才使用 `--always-approve`。同时应把它与合适的沙箱和显式 deny 规则搭配使用。

不要把 `--always-approve` 说成等同于沙箱。除非经过配置或主动选择，沙箱默认是关闭的。

## 管理会话与工作树

有意识地继续或恢复：

```bash
grok -c
grok --resume <session-id>
grok --resume
```

用 `--session-id <UUID>` 创建新的具名会话，而不是用它恢复已有会话。从恢复的会话分叉时加上 `--fork-session`。

当并发工作可能相互冲突时使用工作树：

```bash
grok --worktree --ref main "Fix the flaky test"
grok --worktree=feature-name "Implement the feature"
```

删除工作树之前，先用 `grok worktree rm --dry-run <id>` 预览删除结果。不要以为删除会话就会连带删除它的工作树。

## 改配置之前先诊断

优先使用内置的检查与诊断能力：

```bash
grok inspect --json
grok mcp list --json
grok mcp doctor
grok plugin list
grok models
```

当 CLI 支持所需操作时，优先使用 `grok mcp add`、`grok mcp remove` 和插件子命令，而不是手工编辑配置。把密钥保存在环境变量中，而不是命令历史或已提交的配置里。

## 阅读随附参考

- 子命令与常用参数索引见 [references/cli-reference.md](references/cli-reference.md)。
- 无头执行、会话、工作树、权限、沙箱和 MCP 示例见 [references/workflows.md](references/workflows.md)。

在执行会话删除、插件移除、MCP 移除、记忆清除和工作树删除这类破坏性命令之前，先与用户或所遵循的工作流确认。
