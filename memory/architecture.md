# 架构与关键路径

## 仓库结构

```text
packages/cli/          CLI/TUI 主体（server、session、tool、agent、memory）
packages/plugin/       plugin SDK
packages/sdk/          TypeScript SDK
packages/shared/       global paths、通用工具
packages/cli/src/memory/         记忆服务与 instincts
packages/cli/src/session/        checkpoint、llm、compaction、instinct-observer
packages/cli/src/tool/           模型工具（含 instinct/memory）
packages/cli/src/agent/          agent 定义与 prompt
packages/cli/src/cli/            yargs 命令与 TUI
packages/cli/src/skill/builtin/  内置技能（.bundle）
```

## 记忆数据流

```text
会话
  → checkpoint writer（11 段 checkpoint.md + MEMORY.md）
  → checkpoint 成功
      → instinct-observer（节流，最多每 3 次 checkpoint / 30 分钟）
          → instinct 工具 operation=write
              → projects/<pid>/instincts/<id>.md（candidate）
  → /dream 或 ymcode instinct review
      → decay + 达到阈值的 candidate 晋升
          → 写入 MEMORY.md 的 Rules / Architecture decisions / Discovered durable knowledge
          → instinct status=active
  → 下次请求
      → llm.ts 读取 active instincts
          → 注入 system prompt（默认 1200 token 预算）
  → memory 工具
      → FTS5 搜索（type=instinct 可只搜直觉规则）
```

## 关键文件

| 责任 | 文件 |
|---|---|
| instinct 文件格式/YAML | `packages/cli/src/memory/instinct.ts` |
| instincts CRUD/晋升/衰减/注入 | `packages/cli/src/memory/instinct-service.ts` |
| FTS 路径类型 | `packages/cli/src/memory/paths.ts` |
| memory FTS 服务 | `packages/cli/src/memory/service.ts`、`reconcile.ts` |
| 非 Git 记忆项目 ID | `packages/cli/src/memory/project-id.ts`（`dir-<hash>`） |
| 记忆健康检查 | `packages/cli/src/cli/cmd/memory.ts`（`ymcode memory doctor`） |
| instinct 模型工具 | `packages/cli/src/tool/instinct.ts` |
| 工具注册 | `packages/cli/src/tool/registry.ts` |
| CLI 命令 | `packages/cli/src/cli/cmd/instinct.ts` |
| 斜杠命令 | `packages/cli/src/command/index.ts` |
| observer 触发/节流 | `packages/cli/src/session/instinct-observer.ts` |
| observer 提示词 | `packages/cli/src/agent/prompt/instinct-observer.txt` |
| observer agent 定义 | `packages/cli/src/agent/agent.ts`（`instinct-observer`） |
| 注入 active instincts | `packages/cli/src/session/llm.ts` |
| checkpoint 成功后触发 | `packages/cli/src/session/checkpoint.ts` |
| instincts 配置 schema | `packages/cli/src/config/config.ts` |
| 全局路径 | `packages/shared/src/global.ts`、`packages/cli/src/global/index.ts` |
| 数据库文件名 | `packages/cli/src/storage/db.ts` |
| 配置发现 | `packages/cli/src/config/paths.ts`、`config/config.ts` |
| i18n 字典 | `packages/cli/src/cli/cmd/tui/i18n/{en,zh}.ts` |
| 语言上下文 | `packages/cli/src/cli/cmd/tui/context/language.tsx` |
| 系统语言检测 | `packages/cli/src/cli/cmd/tui/util/system-locale.ts` |
| 内置技能 | `packages/cli/src/skill/builtin/.bundle/**/SKILL.md` |
| 提示词/工具描述 | `packages/cli/src/{agent/prompt,tool,command/template,session/prompt}/*.txt` |

## 服务层接线

- `Instinct.Service` 的 layer 在 `packages/cli/src/effect/app-runtime.ts` 与 `bootstrap-runtime.ts` 注册，CLI 通过 `AppRuntime` 使用。
- `llm.ts` 和 `tool/instinct.ts` 为了减少测试层依赖，直接调用 `Instinct.make(path.join(Global.Path.data, "memory"))`；工具/注入默认使用配置里的阈值（服务层）或默认值（直接 make）。
- `instinct-observer` 在 checkpoint 成功分支被调用，传入 `Config.Service` 与 `Session.Service`，失败只 ignore，不影响会话。
- `SYSTEM_SPAWNED_AGENT_TYPES` 包含 `instinct-observer`，因此它不会被普通会话列表/prune 当作普通对话。

## 重要行为

- observer 只写 candidate，**不晋升**；晋升是确定性代码，避免模型随意把规则写进规则层。
- 晋升前检查 `confidence >= promote_threshold` 与不同 session 证据数 `>= min_evidence`；`--force` 可绕过阈值。
- `MEMORY.md` 超过 10KB 时拒绝晋升，要求先 `/dream` 合并。
- 去重按规范化 description；同一规则重复晋升返回 `appended=false`。
- 注入只包含 `active`；candidate 不自动注入，只能通过 `memory` 工具检索。
