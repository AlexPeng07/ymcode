# ymcode Harness 设计规格

- 日期：2026-10-21
- 状态：已获用户批准，进入实施
- 基线：MiMo-Code `88673c41732fcd57bf46abe485b547c00ba78221`（2026-10-21，MIT）
- 工作目录：`F:\AllProjects\ymcode`

## 1. 目标

在 MiMo-Code 的基础上做一个自用 harness，满足三件事：

1. **全面改名 ymcode**：产品名、命令、包名、配置目录、环境变量、数据库、文档、测试与构建产物全部使用 ymcode；不保留 `mimo` 品牌作为日常入口。
2. **有体系的记忆**：沿用 MiMo 已有的 `MEMORY.md`、`checkpoint.md`、`notes.md`、任务 progress、SQLite FTS5、`/dream`、`/distill`，增加 ECC 式的、带置信度的 instincts（直觉规则）捕获、晋升、降级与按预算注入。
3. **全面汉化**：界面、内置技能正文、agent 提示词、工具描述、用户可见错误提示全部中文；代码标识符、内部日志、命令、路径、协议字段保持英文。

## 2. 非目标

- 不做桌面端；只做 CLI/TUI。
- 不重写 checkpoint、dream、distill 的存储模型，不新增数据库表，不引入向量库。
- 不翻译内部运行日志、异常堆栈、代码标识符、JSON 字段、工具名、路径。
- 不自动合并上游；只保留 diff 审阅能力。
- 不把第三方品牌（Salesforce、HubSpot、Claude Code、Codex、Xiaomi MiMo 模型等）改名为 ymcode。

## 3. 仓库与全面改名

### 3.1 仓库形态

- 当前目录初始化为独立 git 仓库，首个提交 `00bc4f9` 导入上游基线。
- `_upstream_mimo/` 保留为只读上游 clone，已在 `.gitignore` 中排除；用于 `git diff --no-index` 审阅上游变化。
- 新增 `UPSTREAM.md`：记录基线 commit、上游 URL、同步流程、品牌改名允许清单。
- 保留 MIT `LICENSE`；新增 `NOTICE`，注明基于 MiMo-Code（及其上游 opencode）修改，保留原作者版权。
- 主 README 改为 ymcode 中文说明；上游 README 的多语言版本可以保留，但品牌与安装命令必须改为 ymcode。

### 3.2 改名映射

| 旧 | 新 | 范围 |
|---|---|---|
| `MiMoCode` / `MiMo Code` | `ymcode` | 所有第一方文案、文档、提示词、技能 |
| `MiMo`（指 harness 时） | `ymcode` | 同上 |
| `mimocode` | `ymcode` | 路径、文件名、配置、文档 |
| `MIMOCODE` | `YMCODE` | 环境变量、常量 |
| `@mimo-ai/cli` | `@ymcode/cli` | 包名与 workspace 引用 |
| `@mimo-ai/plugin` | `@ymcode/plugin` | 同上 |
| `@mimo-ai/sdk` | `@ymcode/sdk` | 同上 |
| `@mimo-ai/shared` | `@ymcode/shared` | 同上 |
| 根 `package.json` 的 `name: "opencode"` | `"ymcode"` | 根 workspace 包名；删除指向上游的 `repository` 字段，等有自有远端再补 |
| `mimo` 命令 | `ymcode` | `bin`、安装/卸载、测试、文档 |
| `ymcode.js` | `ymcode.js` | CLI 入口 |
| `mimo`（无前缀的路径/目录） | `ymcode` | `.ymcode`、`~/.ymcode`、`ymcode-worktrees` |
| `mimocode.db` | `ymcode.db` | 数据库文件名 |
| `mimocode.json(c)` | `ymcode.json(c)` | 配置文件 |
| `mimo-docs` / `mimocode-docs` | `ymcode-docs` | 内置文档技能 |
| `drive-mimo` | `drive-ymcode` | 仓库开发技能与脚本 |
| `MIMOCODE_MIMO_ONLY` | `YMCODE_ONLY` | 语义改为“只使用 ymcode 自身上下文” |

### 3.3 保留的外部名称（不得改名）

- Xiaomi MiMo 模型与 provider：`mimo`、`xiaomi`、`MiMo-V2.6-*`、`MiMo Platform` 等外部标识。
- 上游归属：`XiaomiMiMo/MiMo-Code`、`anomalyco/opencode`、`opencode.ai`、`@opencode-*` 外部包。
- 生态兼容目录：`.opencode`、`.claude`、`.agents`、`.codex` 等外部约定。
- 第三方产品名与 API 名：Salesforce、HubSpot、ZoomInfo、Apollo、Claude Code、Codex 等。
- 迁移模块中必须出现的旧路径/旧环境变量（见 3.4），只在迁移模块内允许。

### 3.4 数据与配置迁移

本机已存在 `~/.config/mimocode`、`~/.local/share/mimocode`、`~/.mimocode`。首次启动 ymcode 时执行一次性迁移：

- 目标目录：`~/.config/ymcode`、`~/.local/share/ymcode`、`~/.local/state/ymcode`、`~/.cache/ymcode`、`~/.ymcode`。
- 仅当新目录不存在且旧目录存在时执行 **复制**，绝不移动或删除旧目录。
- 复制内容：配置、数据、状态、缓存、记忆树、数据库及其 `-wal`/`-shm` 文件。
- 数据库：`mimocode.db` → `ymcode.db`，`mimocode.db-wal` → `ymcode.db-wal`，`mimocode.db-shm` → `ymcode.db-shm`。
- 配置文件：`mimocode.json(c)` → `ymcode.json(c)`。
- 完成后写入 `~/.local/share/ymcode/.migrated-from-mimocode`，记录时间与来源路径。
- 若新旧目录同时存在：不覆盖新目录，记录警告，继续使用新目录。
- 环境变量兼容：进程启动时把 `MIMOCODE_*` 映射到同名 `YMCODE_*`（仅当新变量未设置），打印一次弃用提示；映射逻辑集中在一个模块，供品牌检查脚本白名单引用。
- 项目级：优先读 `.ymcode/`，不存在时回退读 `.mimocode/`；新写入一律写 `.ymcode/`。不自动重命名用户项目目录。
- 提供 `ymcode migrate --dry-run`，输出将要复制/跳过的路径，便于核对；默认首次启动自动执行。

### 3.5 改名验证

新增 `script/check-brand.ts`：

- 扫描 git 跟踪的文本文件，命中第一方旧品牌 token 即失败。
- 允许清单集中在 `script/brand-allowlist.json`，每条必须写明原因（迁移、归属、外部 provider、第三方品牌）。
- 必须验证 `@mimo-ai`、`MIMOCODE_`、`mimocode`、`MiMoCode`、`mimo` 命令入口在非允许位置为 0。
- 构建产物名、安装脚本 PATH 行、README 命令示例全部为 ymcode。

## 4. 记忆系统：instincts

### 4.1 定位

MiMo 已有“会话 checkpoint → 项目 MEMORY.md → 定期 dream 合并 → distill 打包技能”的闭环。instincts 是中间层：

- 比 checkpoint 更持久，比 MEMORY.md 更可撤销。
- 每条都有证据、置信度、状态；只有晋升后的规则才自动注入。
- 不替代 dream/distill，而是给它们提供带分级的输入。

### 4.2 存储

- 项目级：`<data>/memory/projects/<project_id>/instincts/<id>.md`
- 全局级：`<data>/memory/global/instincts/<id>.md`
- 索引：同级 `INSTINCTS.md`，最多 100 行，一行一条：
  `- [ins_xxx] (active, 0.86) 规则摘要 — updated YYYY-MM-DD`
- 单条文件 frontmatter：

```yaml
---
id: ins_xxx
description: 一句话规则
status: candidate | active | retired
confidence: 0.0-1.0
evidence:
  - session: ses_xxx
    date: YYYY-MM-DD
    quote: "用户原话或轨迹摘要"
source: correction | repetition | decision
created_at: ISO8601
updated_at: ISO8601
last_seen_at: ISO8601
contradictions: 0
---
正文：规则、适用场景、反例、验证方式。
```

- 路径类型新增 `instinct`；FTS 索引复用现有 `memory_fts`，不新增表。
- `memory` 工具的 `type` 过滤支持 `instinct`。

### 4.3 捕获

- 新增独立子代理 `instinct-observer`，提示词 `packages/cli/src/agent/prompt/instinct-observer.txt`。
- 触发点：checkpoint 成功写入后，且 `instincts.capture=auto`、记忆写入未禁用。
- 节流：同一 session 至少间隔 `observe_interval_minutes`（默认 30 分钟），且每 3 次 checkpoint 最多一次；异步执行，不阻塞主流程。
- 输入：最新 checkpoint、最近一段用户消息（只读轨迹库）、现有 INSTINCTS.md 索引。
- 输出：最多 3 条候选；必须带证据 session id、日期、用户原话或轨迹摘要；初始置信度 0.3–0.6；重复规则只更新 `last_seen_at` 和证据，不新建。
- 禁止：写 MEMORY.md、晋升、删除、记录密钥/令牌/完整连接串。
- 失败只记日志，不影响会话。

### 4.4 晋升、降级与衰减

- 晋升条件（代码判定，不靠模型自由发挥）：
  - `status=candidate`
  - `confidence >= instincts.promote_threshold`（默认 0.8）
  - 不同 session 证据数 `>= instincts.min_evidence`（默认 2）
  - 或用户显式执行 `ymcode instinct promote <id> --force`
- 晋升动作：
  - `source=correction` → 追加到 `MEMORY.md ## Rules`
  - `source=repetition` → 追加到 `MEMORY.md ## Discovered durable knowledge`
  - `source=decision` → 追加到 `MEMORY.md ## Architecture decisions`
  - 追加前做规范化去重；已存在则只把 instinct 标记为 active 并建立引用。
  - 不新增 MEMORY.md 章节，保持现有 4 段结构与预算校验。
- 降级：
  - 用户明确纠正 → `confidence -= 0.3`，`contradictions += 1`；低于阈值回到 candidate。
  - `dream` 运行时执行衰减：超过 `decay_days`（默认 60 天）未 `last_seen_at` → 每次 `confidence -= 0.1`。
  - `confidence < 0.2` 且超过 60 天 → `retired`；不自动删除文件。
- 删除只能通过 `ymcode instinct forget <id>`，需显式确认。

### 4.5 注入

- 只注入 `active`，按 `confidence` 降序、`id` 升序稳定排序，避免破坏 prompt 缓存。
- 注入格式：索引行 + 最多 3 条高置信度规则的正文。
- token 预算：`instincts.inject_token_budget`（默认 1200），超出时截断正文、保留索引行。
- candidates 不自动注入；提示词告知可用 `memory` 工具按 `type=instinct` 检索。
- 注入位置：`session/llm.ts` 的 memory instructions 与 checkpoint rebuild 的 memory dump 之间，作为独立小节 `# Active instincts`。

### 4.6 工具与命令

- 新增模型工具 `instinct`（`packages/cli/src/tool/instinct.ts`），操作：
  - `list`：按 status/scope 列索引
  - `get`：读单条正文
  - `write`：仅 observer 使用的候选写入/更新
  - `promote` / `demote` / `forget`
- 新增 CLI 子命令 `ymcode instinct list|promote|demote|forget|review`，复用同一 service，确定性执行；迁移核对命令 `ymcode migrate --dry-run` 同批注册。
- 新增内置斜杠命令 `/instinct`，template 引导 agent 调用 `instinct` 工具；`/dream` 提示词增加“复核 instincts”阶段，通过工具晋升，不直接编辑 MEMORY.md。
- 配置（`packages/cli/src/config/config.ts`）：

```jsonc
{
  "instincts": {
    "enabled": true,
    "capture": "auto",              // auto | manual | off
    "promote_threshold": 0.8,
    "min_evidence": 2,
    "decay_days": 60,
    "inject_token_budget": 1200,
    "observe_interval_minutes": 30
  }
}
```

### 4.7 测试

- 单元：frontmatter 解析/序列化、置信度夹取、晋升阈值、去重、衰减、退休、索引重建、token 预算。
- 集成：checkpoint 成功 → 节流判定 → observer 任务创建（不依赖真实 LLM 的部分用确定性函数）；`instinct` 工具 promote/demote/forget 对真实文件与 FTS 生效。
- 迁移：旧 mimocode 数据目录 → 新 ymcode 目录，数据库与 WAL 完整。
- 端到端（需已配置 provider）：新建项目 → 触发规则 → 候选 → 晋升 → 重启会话 → 注入可见 → `memory` 检索命中。
- 回归：现有 checkpoint/dream/distill 测试全绿。

## 5. 全面汉化

### 5.1 界面

- 现状：en 487 key，zh 全覆盖；但只有 14/162 个 TUI 文件接入 i18n、339 处 `t()`。其余文件需要审计，不能假设没有文案。
- 新增 `script/i18n-audit.ts`：
  - 扫描 TUI/CLI 的 JSX 文本、`title`/`placeholder`/`description`/`message`/`label`/`text` 等属性中的用户可见字面量。
  - 输出待处理清单（JSON + 可读表格），技术标签走白名单。
- 所有用户可见文案走 `t()`；新增 key 使用 `tui.<area>.<name>` 命名。
- en.ts 为源；zh.ts 必须 100% 覆盖，不允许空值。
- 用户可见错误提示与 toast 汉化；内部日志、异常堆栈、调试信息保持英文。
- 语言：沿用现有 locale 选择器与 KV 持久化；zh-CN 系统默认 zh；新增首次启动语言确认（若现有 onboarding 已有则复用）。
- 模型回复语言：在系统提示词中加入契约——默认中文，用户改用其他语言时跟随；代码、命令、路径保持原样。

### 5.2 内置技能

- 范围：`packages/cli/src/skill/builtin/.bundle` 下 70 个 `SKILL.md`，9,861 行。
- 保留：frontmatter `name`、目录名、代码块、行内代码、命令、路径、URL、API 名、YAML 结构。
- 翻译：frontmatter `description` 改为中英双语（中文在前，英文触发词在后），正文全部中文。
- 触发词：在 `i18n/skill.ts` 与 zh 字典中补齐中文别名与描述。
- 机械校验 `script/check-skills.ts`：
  - YAML 可解析，`name` 不变。
  - 代码围栏内容逐字不变（按块 hash 对比）。
  - 链接与路径 token 集合不变。
  - 每个技能存在中文描述与至少一个中文触发词。
- 分批提交：按目录分组，每批完成后跑校验与抽样人工复核。

### 5.3 提示词与工具描述

- 范围：9 个 agent prompt、命令模板、27 个 tool 描述（约 2,159 行）、`session/llm.ts` 的 memory instructions、系统提示词中面向用户的段落。
- 保留：工具名（`read`/`write`/`edit`/`task` 等）、XML/§ 标记、JSON 字段、路径、代码标识符、协议名。
- 新增 `script/check-prompts.ts`：对每个文件维护受保护 token 基线，翻译后必须全部存在；代码围栏 hash 不变。
- 语言契约统一写入主系统提示词与高流量 agent prompt，避免每个 prompt 重复。

### 5.4 术语表

新增 `docs/i18n-glossary.md`，固定译法，至少包含：

| 英文 | 中文 |
|---|---|
| skill | 技能（`SKILL.md` 不译） |
| agent / subagent | 智能体 / 子代理 |
| checkpoint | 检查点 |
| memory | 记忆 |
| instinct | 直觉规则（代码标识 `instinct` 不译） |
| compaction | 上下文压缩 |
| workflow | 工作流 |
| session | 会话 |
| task | 任务 |

### 5.5 汉化验证

- `script/i18n-check.ts`：en/zh key 对齐、无空值、无遗漏技能描述、无未走 `t()` 的 UI 字面量（白名单除外）。
- `script/check-skills.ts` 与 `script/check-prompts.ts` 全绿。
- 抽样人工复核：5 个最长技能 + 3 个核心提示词 + 3 个高流量界面。
- 运行时冒烟：中文界面完成一次完整会话，切换语言后不崩溃、不出现 key 原名。

## 6. 验收与证据

### 6.1 必跑门禁

```bash
bun ci
bun run typecheck
bun test
bun run check:brand
bun run check:i18n
bun run check:skills
bun run check:prompts
bun run --cwd packages/cli build:local
```

- `bun ci` 前允许一次 `bun install` 更新 workspace 包名与 lockfile；之后必须冻结验证。
- 所有检查必须真实执行并记录输出，不允许只写“已通过”。

### 6.2 端到端验收

1. 全新目录启动 `ymcode`，界面为中文，语言设置可切换并持久化。
2. 旧 mimocode 数据迁移：配置、记忆、数据库完整出现在 ymcode 目录，旧目录仍在。
3. 在项目中触发一条用户规则，checkpoint 后生成 candidate；`ymcode instinct list` 可见。
4. `ymcode instinct promote <id>` 后，MEMORY.md 对应章节出现规则；重启会话，注入内容包含该规则。
5. 用户纠正该规则，confidence 下降并回到 candidate；再次晋升路径可复现。
6. `memory` 工具以 `type=instinct` 检索命中。
7. 中文技能可被 `/技能名` 或中文触发词发现并加载。
8. 构建产物名为 ymcode，`ymcode --version` 正常。

无法自动化的 LLM 行为（observer 实际抽取质量、提示词中文化后的模型表现）必须做一次真实 provider 冒烟；若本机无可用凭据，明确记录“未验证”，不得声称通过。

### 6.3 记录

- 新增 `docs/PROGRESS.md`，追加式记录每轮：时间、改动、命令、结果、未决项。
- 每个里程碑单独 commit，提交信息使用 `feat:`/`fix:`/`chore:`/`i18n:` 前缀。
- 验收日志放在 `docs/verification/`，保留原始命令输出摘要。

## 7. 风险与缓解

| 风险 | 缓解 |
|---|---|
| 全面改名遗漏或误改外部 provider | 映射表 + `check-brand.ts` + 允许清单；先小批次跑构建 |
| 迁移复制数据库损坏 | 复制 `db`/`-wal`/`-shm`；只复制不删除；迁移测试覆盖 |
| observer 增加成本/延迟 | 异步 + 节流 + 可关闭；失败不影响会话 |
| 中文化提示词改变模型行为 | 保护 token 检查 + 核心流程对照冒烟 + 可回滚 git |
| 9,861 行技能翻译漂移 | 代码块/路径机械校验 + 术语表 + 抽样复核 + 分批提交 |
| 新仓库无法自动合上游 | `UPSTREAM.md` + 只读上游 clone + diff 脚本；不承诺自动 merge |
| TUI 文案数量被低估 | 先跑 audit 脚本出清单，再按清单清零；不以文件数估算 |

## 8. 实施约束

- 遵循仓库既有风格：Effect 错误通道、Drizzle snake_case、测试少用 mock。
- 不修改已发布的 `packages/cli/migration/*/migration.sql`；新增迁移目录。
- 不新增数据库表；instincts 走 Markdown + 现有 FTS。
- 不修改第三方技能中的代码与 API 名称。
- 所有新增脚本必须可重复执行、幂等、失败非零退出。
- 代码注释保持英文；用户可见文案中文。

## 9. 已确认决策

- 产品名与命令：`ymcode`（用户确认）。
- 仓库：独立新仓库，保留上游只读基线，不做自动合并。
- 改名范围：第一方标识全面改名；外部 provider/上游/第三方品牌保留。
- 记忆：保留 MiMo 现有闭环，新增 instincts 中间层。
- 汉化：界面 + 技能正文 + 提示词全中文；内部日志与代码标识符保持英文。
- 数据：自动复制迁移，旧目录保留。
