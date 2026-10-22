# ymcode

ymcode 是一个个人自用的 AI 编程 harness，基于 [MiMo-Code](https://github.com/XiaomiMiMo/MiMo-Code)（进一步源自 [opencode](https://github.com/anomalyco/opencode)）改造。目标不是重写引擎，而是在现有 checkpoint / memory / dream / distill 闭环上补一层可审计的**直觉规则（instincts）**，并把界面与内置内容汉化。

- 上游基线：MiMo-Code `88673c41732fcd57bf46abe485b547c00ba78221`（2026-10-21，MIT）
- 归属与许可：见 [NOTICE](NOTICE)、[LICENSE](LICENSE)、[UPSTREAM.md](UPSTREAM.md)

## 特性

- **记忆体系**：沿用 `MEMORY.md`、`checkpoint.md`、`notes.md`、任务 progress、SQLite FTS5、`/dream`、`/distill`。
- **直觉规则**：带证据、置信度、状态（candidate / active / retired）的 instincts；支持晋升、降级、衰减、按预算注入。
- **全中文内容**：核心 TUI、内置技能正文、agent 提示词、工具描述与用户可见错误为中文；代码标识符、内部日志、命令、路径保持英文。
- **数据迁移**：首次启动把旧 mimocode 配置、记忆与数据库复制到 ymcode 目录，旧目录不删除。
- **可验证门禁**：品牌检查、i18n 字典检查、技能代码围栏检查、提示词受保护 token 检查。

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
ymcode migrate --dry-run
```

隔离测试时设置 `YMCODE_HOME=/tmp/example`。强制界面语言可用 `YMCODE_LOCALE=zh` 或 `YMCODE_LOCALE=en`。

## 目录

- 配置：`~/.config/ymcode`
- 数据与记忆：`~/.local/share/ymcode`（数据库 `ymcode.db`，记忆在 `memory/`）
- 项目级配置：`.ymcode/`（只读回退 `.mimocode/`）
- 旧安装目录：`~/.mimocode`（迁移时复制到 `~/.ymcode`，不删除）

## 记忆与 instincts

- 项目记忆：`memory/projects/<project_id>/MEMORY.md`
- 直觉规则：`memory/projects/<project_id>/instincts/*.md`，索引 `INSTINCTS.md`
- 捕获：checkpoint 成功后由 `instinct-observer` 子代理节流生成候选；只写候选，不晋升。
- 晋升：`ymcode instinct promote <id>`（需达到置信度与证据阈值）或 `/instinct`；`/dream` 会执行 review。
- 注入：只有 `active` 规则进入上下文（默认 1200 token 预算）；候选通过 `memory` 工具检索。
- 配置：`instincts.enabled`、`capture`、`promote_threshold`、`min_evidence`、`decay_days`、`inject_token_budget`、`observe_interval_minutes`。

## 汉化门禁

```bash
bun run check:brand
bun run check:i18n
bun run check:skills
bun run check:prompts
```

- `check:brand`：第一方旧品牌 token 扫描（外部 Xiaomi MiMo 模型、opencode 上游与第三方品牌在允许清单内）。
- `check:i18n`：en/zh 字典对齐、空值、内置技能描述。
- `check:skills`：70 个内置 `SKILL.md` 的代码围栏、行内代码、URL 与中文正文。
- `check:prompts`：提示词的代码围栏、受保护路径/工具名与中文正文。

## 上游同步

本仓库是独立历史，不自动合并上游。上游只读副本位于 `_upstream_mimo/`（gitignore），同步流程与改名边界见 [UPSTREAM.md](UPSTREAM.md)。上游英文 README 快照保存在 `docs/upstream/`。

## 交接记忆

`memory/` 保存本次构建的上下文、架构、验证证据和下一步。下一个 harness 先读 `memory/MEMORY.md`；可直接使用 `memory/continue-prompt.md` 作为续作提示词。运行时记忆在 `~/.local/share/ymcode/memory/`，两者不要混淆。

## 开发说明

- 测试：`bun test`（TUI 测试默认使用英文 locale，避免断言依赖系统语言；生产环境按系统语言自动选择）。
- 已发布的 `packages/cli/migration/*/migration.sql` 不再修改；新 schema 变更使用新迁移目录。
- 所有用户可见文案中文；代码注释、内部日志、协议字段保持英文。
