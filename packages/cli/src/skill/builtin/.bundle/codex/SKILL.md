---
name: codex
description: "在非交互式无头环境中运行、配置并排查 OpenAI Codex CLI。适用于在 Bash 或 PowerShell、原生 Windows 或 WSL2、shell 脚本、CI/CD、Docker、Kubernetes、远程服务器、智能体运行框架或批处理任务中自动化 Codex；构造 `codex exec` 命令；选择沙箱与审批模式；消费 JSONL 事件或结构化输出；恢复会话；通过 stdin 传入提示词；以及处理因交互式输入不可用（例如 `request_user_input`）而导致的失败。 | Trigger keywords: Codex CLI, codex exec, headless automation, JSONL events, WSL2, sandbox mode, approval mode."
---

# Codex CLI

把 Codex CLI 当作确定性的非交互式执行器来使用，它适合自动化与智能体编排。

## 操作规则

1. 使用 `codex exec`，而不是交互式的 `codex` TUI。
2. 把任务作为位置参数 `PROMPT` 传入。不要用 `-p` 传提示词；`-p` 是用来选择 profile 的。
3. 对于常规的无人值守代码改动，优先使用：

```bash
codex exec \
  -C /path/to/repo \
  --sandbox workspace-write \
  --ask-for-approval never \
  "<TASK>"
```

4. 仅在经过外部加固且一次性可弃的执行器内使用 `--yolo`。它会禁用 Codex 的审批与沙箱。
5. 在运行框架和 CI 中，优先使用 `--json` 加 `--output-last-message`。
6. 不要让运行依赖人工回答问题。用仓库中的证据和保守的默认值来消解歧义。
7. 把凭据当作机密。尽可能只把 `CODEX_API_KEY` 注入单个 `codex exec` 进程。
8. 在给出对版本敏感的建议之前，先查看 `codex exec --help`，或在可用时查阅当前官方 Codex 文档。
9. 在 Windows 上，每个任务只选一种执行环境：Windows 工具链用原生 PowerShell，Linux 工具链用 WSL2。不要在这两者之间随意混用路径、安装或认证。

## 选择执行模式

### 只读分析

当任务不得修改文件时使用：

```bash
codex exec \
  -C /path/to/repo \
  --sandbox read-only \
  --ask-for-approval never \
  "Analyze the repository and report risks. Do not modify files."
```

### 工作区范围内的实现

作为自主仓库工作的默认模式：

```bash
codex exec \
  -C /path/to/repo \
  --sandbox workspace-write \
  --ask-for-approval never \
  "Implement the task, run relevant tests, and report unresolved blockers."
```

### 外部隔离的无限制执行

仅当外层容器、虚拟机或沙箱真正承担安全边界时使用：

```bash
codex exec \
  -C /workspace/repo \
  --yolo \
  "Implement the task and validate the result."
```

绝不要在普通开发机上，或在含有无关密钥、宿主机挂载、SSH 密钥、云凭据或 Docker socket 的执行器上推荐 `--yolo`。

## 构造自主提示词

当无头执行可能遇到需要做选择的情况时，在提示词前面加上这些指令：

```text
Work fully autonomously.

Do not ask the user questions and do not request interactive input.
Inspect the repository and available context before making assumptions.
When several valid approaches exist, choose the option that:
1. minimizes unrelated changes,
2. preserves backward compatibility,
3. introduces the fewest new dependencies,
4. avoids destructive or irreversible actions.

Continue until the task is complete or a concrete blocking error is reached.
Record assumptions, validation performed, and unresolved blockers in the final response.
```

不要模拟“总是选第一项”的做法。选项顺序并不是安全或质量策略。请改用上面明确的决策规则。

## 处理 `request_user_input` 失败

当 Codex 报告在 Default 模式或非交互模式下 `request_user_input` 不可用时：

1. 确认调用使用的是 `codex exec`，且是有意以无头方式运行。
2. 加上上文所述的自主提示词策略。
3. 如果这些决策事先已知，就在任务提示词或 `AGENTS.md` 中补齐。
4. 把“告诉我用哪种方案”这类开放式请求替换为确定性的选择标准。
5. 如果该选择关乎安全、具有破坏性，或根本无法推断，就让运行明确失败，而不是随机选择。
6. 不要尝试模拟终端按键，除非需要输入的是子进程本身（而非 Codex），并且工作流明确定义了安全答案。

## 传递提示词与上下文

直接使用位置参数提示词：

```bash
codex exec "Summarize the repository structure."
```

从 stdin 读取提示词：

```bash
codex exec - < prompt.md
```

在保留显式任务的同时，通过管道传入动态上下文：

```bash
npm test 2>&1 | codex exec "Analyze this test output and fix the repository."
```

仅在有意处理 Git 之外的一次性目录时使用 `--skip-git-repo-check`：

```bash
codex exec \
  --skip-git-repo-check \
  -C /tmp/task \
  "Analyze the files in this directory."
```

## 产出便于运行框架解析的输出

### 只捕获最终消息

```bash
codex exec \
  -C /workspace/repo \
  --output-last-message /output/final.md \
  "Review the codebase."
```

### 以流式输出 JSONL 事件

```bash
codex exec \
  -C /workspace/repo \
  --json \
  --sandbox workspace-write \
  --ask-for-approval never \
  "Run tests and fix failures." \
  > /output/events.jsonl
```

预期会看到 `thread.started`、`turn.started`、`turn.completed`、`turn.failed`、`item.*` 和 `error` 等事件族。

### 同时捕获事件与最终答案

```bash
codex exec \
  -C /workspace/repo \
  --json \
  --sandbox workspace-write \
  --ask-for-approval never \
  --output-last-message /output/final.md \
  "Complete the task autonomously." \
  | tee /output/events.jsonl
```

在 `--json` 可用时，不要去解析人类可读的进度文本。

## 要求结构化的最终输出

创建一个 JSON Schema，并通过 `--output-schema` 传入：

```bash
codex exec \
  -C /workspace/repo \
  --sandbox workspace-write \
  --ask-for-approval never \
  --output-schema /input/result.schema.json \
  --output-last-message /output/result.json \
  "Implement the task, validate it, and return the requested structured result."
```

一个实用的运行框架 schema 通常包含：

- `status`：`success`、`partial` 或 `failed`
- `summary`：简洁的结果概述
- `changed_files`：相对于仓库的路径
- `validation`：运行过的命令及其结果
- `assumptions`：在无用户输入情况下做出的决定
- `blockers`：具体且未解决的问题

如果下游解析必须严格，就把 `additionalProperties` 设为 `false`。

## 恢复会话或避免持久化

恢复当前工作目录下最近的会话：

```bash
codex exec resume --last "Continue the previous task and fix remaining issues."
```

恢复指定会话：

```bash
codex exec resume "$SESSION_ID" "Continue with the next stage."
```

如果不想保留 rollout 持久化记录，就使用临时运行：

```bash
codex exec --ephemeral "Analyze the repository."
```

不要在不同工作目录之间依赖 `--last`，除非你刻意使用已安装 CLI 所支持的全目录选项。

## 安全地认证

本地交互式登录：

```bash
codex login
```

已启用设备码登录的无头机器：

```bash
codex login --device-auth
```

单次自动化调用：

```bash
CODEX_API_KEY="$OPENAI_API_KEY" \
codex exec --json "Triage the repository."
```

在执行仓库所控制代码的任务中，不要把 API 密钥暴露为宽泛的任务级环境变量。绝不要提交或打印 `~/.codex/auth.json`。

## Windows、PowerShell 与 WSL2

原生 Windows 无头使用：

- 用官方 PowerShell 安装器或 npm 安装。
- 做 JSONL 重定向时优先使用 PowerShell 7.4 或更新版本。
- 构造参数数组，并用 `& codex @args` 调用；避免使用脆弱的、满是反引号的命令拼接。
- 每次调用 Codex 后都要检查 `$LASTEXITCODE`。仅靠 PowerShell 的错误首选项无法替代检查原生进程的退出码。
- 把 stdout 的 JSONL 与 stderr 的诊断信息分开。当 stdout 必须保持为可解析的 JSONL 时，不要用 `2>&1`。
- 在可用时于 `%USERPROFILE%\.codex\config.toml` 中配置 `[windows] sandbox = "elevated"`；仅在兜底时使用 `unelevated`。
- 常规自主编辑请保留任务级策略 `--sandbox workspace-write --ask-for-approval never`。原生 Windows 沙箱实现与 CLI 任务策略是两套独立的控制。

WSL 方面：

- 使用 WSL2，而不是 WSL1。
- 在 WSL 内按 Linux 安装方式安装并认证 Codex。
- 把仓库放在 `~/code/...` 下，而不是 `/mnt/c/...`，以获得更好的性能并减少权限、符号链接和文件监听方面的问题。
- 不要通过可见的 `wsl.exe` 命令行字符串传递凭据。

安装、PowerShell 包装脚本、JSONL 解析、沙箱配置、WSL2 模式以及 Windows 专有排查方法见 [references/windows.md](references/windows.md)。

## 容器与 CI 要求

在生成 Docker、Kubernetes 或 CI 设计时：

- 只挂载预期的工作区和输出目录。
- 在可行时以非 root 用户运行。
- 不要挂载宿主机的 Docker socket。
- 不要挂载主目录、SSH 密钥或云凭据目录。
- 除非任务明确需要，否则限制网络访问。
- 在 Codex 之外施加 CPU、内存、进程数和执行时长限制。
- 分别保留 stdout、stderr、退出状态、JSONL 事件和最终消息。
- 在判定一次运行成功之前，先校验仓库差异和测试结果。
- 每个任务优先使用全新的工作树或一次性检出。

可直接使用的 shell、Docker、CI 和解析器模式见 [references/recipes.md](references/recipes.md)。

## 诊断故障

按此顺序排查：

1. 运行 `codex --version` 和 `codex exec --help`。
2. 确认命令使用的是位置参数提示词，还是用 `-` 从 stdin 读取。
3. 确认工作目录和 Git 仓库状态。
4. 确认认证情况，且不要打印机密内容。
5. 检查沙箱策略是否拦截了所需的读取、写入、命令、socket 或网络访问。
6. 检查审批策略是否在无头模式下造成了无法回答的提示。
7. 查看 stderr 以及 JSONL 中的 `error` 或 `turn.failed` 事件。
8. 用一个更小、确定性的任务复现该失败并重跑。
9. 不要把切到 `--yolo` 当作排查捷径悄悄使用。

## 完成标准

对于实现类任务，只有当 Codex 完成以下各项时，才可认为这次运行结束：

1. 检查了相关的仓库上下文，
2. 完成了所要求的改动，
3. 运行了当前可用的、最相关的校验，
4. 审查了产生的差异中是否含无关改动，
5. 报告了假设与未解决的阻塞项，
6. 在运行框架要求时产出了机器可读的状态。
