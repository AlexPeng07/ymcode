# ymcode 全面汉化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **状态（2026-10-24 回填）**：本计划已执行完毕并随 v0.2.0–v0.2.3 交付（Anthropic 官方技能正文按 PROGRESS.md 记录保留英文）。复选框未逐项回填，实际交付状态以 `docs/PROGRESS.md` 为准。

**Goal:** 把 ymcode 的界面、内置技能正文、agent/工具提示词、用户可见错误提示全部改为中文；代码标识符、内部日志、命令、路径保持英文。

**Architecture:** 内容层与代码层分开：UI 文案抽到 en/zh 字典；技能与提示词做文件级翻译，用“代码块 hash 不变 + 受保护 token 不变”的机械校验兜底；所有检查接入 `package.json` 脚本与 CI。

**Tech Stack:** TypeScript、Solid/OpenTUI、现有 i18n 字典、Bun test、git show 基线对比。

**Spec:** `docs/superpowers/specs/2026-10-21-ymcode-harness-design.md`

## Global Constraints

- 只翻译用户可见内容；不翻译代码标识符、内部日志、异常堆栈、JSON 字段、工具名、路径、URL、API 名。
- 技能 frontmatter `name` 与目录名不变；`description` 中英双语；正文中文。
- 提示词中的代码围栏、行内代码、§ 标记、工具名、路径必须逐字保留。
- 每个 Task 结束提交一次；技能翻译按批次提交，单批不超过 10 个 `SKILL.md`。
- 汉化完成后 `bun run check:i18n`、`check:skills`、`check:prompts` 必须全绿。

---

### Task 1: 术语表、审计与检查脚本

**Files:**
- Create: `docs/i18n-glossary.md`
- Create: `script/i18n-audit.ts`
- Create: `script/check-i18n.ts`
- Create: `script/check-skills.ts`
- Create: `script/check-prompts.ts`
- Create: `script/i18n-allowlist.json`
- Modify: `package.json`
- Test: `packages/cli/test/i18n/check.test.ts`

**Interfaces:**
- Consumes: 改名计划完成
- Produces: `bun run check:i18n`、`check:skills`、`check:prompts`；审计清单

- [ ] **Step 1: 写术语表**

`docs/i18n-glossary.md` 至少包含：skill=技能（`SKILL.md` 不译）、agent/subagent=智能体/子代理、checkpoint=检查点、memory=记忆、instinct=直觉规则（代码标识符不译）、compaction=上下文压缩、workflow=工作流、session=会话、task=任务、prompt=提示词、tool=工具。

- [ ] **Step 2: 写字典检查**

```ts
// script/check-i18n.ts
import { dict as en } from "../packages/cli/src/cli/cmd/tui/i18n/en"
import { dict as zh } from "../packages/cli/src/cli/cmd/tui/i18n/zh"

const BASELINE = (await Bun.file("docs/i18n/baseline-commit.txt").text()).trim()

const missing = Object.keys(en).filter((k) => !(k in zh))
const empty = Object.keys(zh).filter((k) => !zh[k]?.trim())
const extra = Object.keys(zh).filter((k) => !(k in en) && !k.startsWith("tui.skill."))
if (missing.length || empty.length || extra.length) {
  console.error({ missing, empty, extra })
  process.exit(1)
}
```

（按 en.ts/zh.ts 实际导出名调整；若字典是 `export const dict`，导入 `dict`。）

- [ ] **Step 3: 写 UI 审计**

```ts
// script/i18n-audit.ts
import { Glob } from "bun"

const allow = new Set(JSON.parse(await Bun.file("script/i18n-allowlist.json").text()))
const glob = new Glob("packages/cli/src/cli/cmd/tui/**/*.{ts,tsx}")
const hits: string[] = []
for await (const file of glob.scan(".")) {
  if (allow.has(file)) continue
  const text = await Bun.file(file).text()
  const lines = text.split("\n")
  lines.forEach((line, i) => {
    if (/\bt\(/.test(line)) return
    const m = line.match(/(?:title|placeholder|description|message|label|text)\s*[:=]\s*["'`]([^"'`{]{2,})["'`]/)
    if (m && /[A-Za-z]/.test(m[1]) && !/^(http|\.|\/|[a-z-]+$)/.test(m[1])) hits.push(`${file}:${i + 1}: ${m[1]}`)
  })
}
console.log(hits.join("\n"))
console.log(`\n${hits.length} candidates`)
```

先跑一遍，把误报写入 `script/i18n-allowlist.json`（每条附原因注释不合法，JSON 用对象数组 `{ path, reason }`）。

- [ ] **Step 4: 写技能检查**

```ts
// script/check-skills.ts
import { $ } from "bun"
import matter from "gray-matter"

const BASELINE = (await Bun.file("docs/i18n/baseline-commit.txt").text()).trim()
const files = (await $`git ls-files "packages/cli/src/skill/builtin/**/SKILL.md"`.text()).trim().split("\n").filter(Boolean)
let bad = 0
for (const file of files) {
  const now = await Bun.file(file).text()
  const old = await $`git show ${BASELINE}:${file}`.text().catch(() => "")
  const fm = matter(now)
  if (!fm.data.name) { console.error(`${file}: missing name`); bad++; continue }
  const fences = (s: string) => [...s.matchAll(/```[\s\S]*?```/g)].map((m) => m[0])
  const oldFences = fences(old)
  const newFences = fences(now)
  if (oldFences.length !== newFences.length) { console.error(`${file}: fence count changed`); bad++; continue }
  for (let i = 0; i < oldFences.length; i++) {
    if (oldFences[i] !== newFences[i]) { console.error(`${file}: fence ${i} changed`); bad++ }
  }
  if (!/[\u4e00-\u9fa5]/.test(fm.content)) { console.error(`${file}: body not translated`); bad++ }
}
if (bad) process.exit(1)
```

`BASELINE` 从 `docs/i18n/baseline-commit.txt` 读取（改名完成后的提交哈希）。

- [ ] **Step 5: 写提示词检查**

```ts
// script/check-prompts.ts
import { $ } from "bun"

const BASELINE = (await Bun.file("docs/i18n/baseline-commit.txt").text()).trim()
const files = [
  "packages/cli/src/agent/prompt/checkpoint-writer.txt",
  "packages/cli/src/agent/prompt/compaction.txt",
  "packages/cli/src/agent/prompt/distill.txt",
  "packages/cli/src/agent/prompt/dream.txt",
  "packages/cli/src/agent/prompt/explore.txt",
  "packages/cli/src/agent/prompt/general.txt",
  "packages/cli/src/agent/prompt/generate-gpt.txt",
  "packages/cli/src/agent/prompt/summary.txt",
  "packages/cli/src/agent/prompt/title.txt",
  "packages/cli/src/agent/prompt/instinct-observer.txt",
]
const protectedTokens = ["checkpoint.md", "MEMORY.md", "INSTINCTS.md", "read", "write", "edit", "apply_patch", "glob", "grep", "task", "memory", "instinct", "§1", "§4", "§7", "§10"]
let bad = 0
for (const file of files) {
  const now = await Bun.file(file).text()
  const old = await $`git show ${BASELINE}:${file}`.text().catch(() => "")
  const fences = (s: string) => [...s.matchAll(/```[\s\S]*?```/g)].map((m) => m[0])
  const a = fences(old), b = fences(now)
  if (a.length !== b.length || a.some((x, i) => x !== b[i])) { console.error(`${file}: code fence changed`); bad++ }
  for (const token of protectedTokens) {
    if (old.includes(token) && !now.includes(token)) { console.error(`${file}: lost ${token}`); bad++ }
  }
}
if (bad) process.exit(1)
```

- [ ] **Step 6: 接入 package.json**

```json
{
  "scripts": {
    "check:i18n": "bun run script/check-i18n.ts",
    "check:skills": "bun run script/check-skills.ts",
    "check:prompts": "bun run script/check-prompts.ts",
    "i18n:audit": "bun run script/i18n-audit.ts"
  }
}
```

- [ ] **Step 7: 运行基线审计**

Run: `bun run i18n:audit | tee docs/verification/i18n-audit-baseline.txt`
Expected: 生成待处理清单；记录数量，作为后续清零依据。

- [ ] **Step 8: 提交**

```bash
git add docs/i18n-glossary.md script package.json docs/verification/i18n-audit-baseline.txt
git commit -m "chore(i18n): add glossary, audit and content checks"
```

---

### Task 2: UI 文案抽取（核心界面）

**Files:**
- Modify: `packages/cli/src/cli/cmd/tui/i18n/en.ts`
- Modify: `packages/cli/src/cli/cmd/tui/i18n/zh.ts`
- Modify: 核心界面文件（按 audit 清单，优先 `routes/home`、`component/dialog`、`component/prompt`、`context/onboarding`、`ui/*`）
- Test: `packages/cli/test/i18n/check.test.ts`

**Interfaces:**
- Consumes: Task 1
- Produces: 核心界面零硬编码；zh 字典新增 key

- [ ] **Step 1: 按 audit 清单逐文件处理**

对每个文件：
1. 把用户可见字面量改成 `t(key)`；带变量用 `t(key, { name: value })`。
2. 在 `en.ts` 加 key（英文原文），在 `zh.ts` 加中文。
3. 技术标签（如 `ttft`、`/model`、路径）保持原样并加入 allowlist。

- [ ] **Step 2: 跑检查**

Run: `bun run check:i18n && bun run i18n:audit`
Expected: key 对齐；核心目录候选数下降。

- [ ] **Step 3: 跑相关测试**

Run: `bun test packages/cli/test/cli/tui packages/cli/test/i18n`
Expected: 通过。

- [ ] **Step 4: 提交**

```bash
git add packages/cli/src/cli/cmd/tui packages/cli/test/i18n
git commit -m "i18n(tui): localize core screens"
```

---

### Task 3: UI 文案抽取（其余界面与 CLI 输出）

**Files:**
- Modify: 其余 TUI 文件、`packages/cli/src/cli/ui.ts`、`packages/cli/src/cli/error.ts`、`packages/cli/src/cli/cmd/*.ts` 的 `describe`/用户提示
- Modify: `en.ts`、`zh.ts`

**Interfaces:**
- Consumes: Task 2
- Produces: `i18n:audit` 候选清零（白名单除外）

- [ ] **Step 1: 处理剩余 audit 候选**

重点：命令面板、会话列表、权限对话框、模型选择、MCP/Provider 配置、错误 toast、首次启动、设置页、子代理页脚。

- [ ] **Step 2: CLI 帮助与错误**

- `yargs` 的 `describe`/`help` 文案中文。
- `UI.error`/`UI.warn` 的用户可见消息中文；`Log.*` 内部日志保持英文。
- 配置错误、provider 认证错误、安装/升级错误：用户可见部分中文。

- [ ] **Step 3: 验证**

Run: `bun run check:i18n && bun run i18n:audit`
Expected: 候选清零或全部在 allowlist；zh 无缺失。

- [ ] **Step 4: 提交**

```bash
git add packages/cli/src/cli packages/cli/src/cli/cmd/tui packages/cli/test/i18n
git commit -m "i18n: localize remaining TUI and CLI surfaces"
```

---

### Task 4: 提示词与工具描述

**Files:**
- Modify: `packages/cli/src/agent/prompt/*.txt`（9 个 + instinct-observer）
- Modify: `packages/cli/src/command/template/*.txt`
- Modify: `packages/cli/src/tool/*.txt`（27 个）
- Modify: `packages/cli/src/session/prompt/*.txt`（provider-specific prompts）
- Modify: `packages/cli/src/session/llm.ts`（memory instructions）
- Modify: `packages/cli/src/session/system.ts`（系统提示词中的用户可见段）
- Test: `bun run check:prompts`

**Interfaces:**
- Consumes: Task 1
- Produces: 所有提示词中文，受保护 token 不变

- [ ] **Step 1: 翻译 agent prompts**

逐个文件翻译为简体中文；保留：
- 代码围栏、行内代码、工具名、路径、§ 编号、XML 标签、JSON 字段。
- `checkpoint-writer.txt` 的 11 段结构名与 `MEMORY.md` 4 段结构名保留英文锚点（如 `## §1 Active intent`），只翻译说明文字；否则 validator 会失配。
- `dream.txt`/`distill.txt` 的 SQL 模板与数据库表名保留。

- [ ] **Step 2: 翻译工具描述与命令模板**

- `tool/*.txt` 的说明文字中文；参数名、示例命令、返回格式标记保持。
- `command/template/*.txt` 中文。
- `session/prompt/*.txt`（trinity/minimax/kimi）中文；模型名、provider 名保持。

- [ ] **Step 3: 系统提示词语言契约**

在 `session/system.ts` 或主 general prompt 中加入：

```text
默认使用简体中文回复。用户切换语言时跟随用户。代码、命令、路径、标识符保持原样，不翻译。
```

- [ ] **Step 4: 跑检查**

Run: `bun run check:prompts`
Expected: 0 失败；代码围栏与受保护 token 全部保留。

- [ ] **Step 5: 抽样验证**

对 `checkpoint-writer.txt`、`dream.txt`、`general.txt` 各做一次人工 diff，确认锚点、路径、工具名未被翻译。

- [ ] **Step 6: 提交**

```bash
git add packages/cli/src/agent/prompt packages/cli/src/command/template packages/cli/src/tool packages/cli/src/session
git commit -m "i18n: translate prompts and tool descriptions to Chinese"
```

---

### Task 5: 内置技能翻译（核心包）

**Files:**
- Modify: 以下 bundle 的 `SKILL.md`（每批 ≤10 个）：
  - `compose-next`、`deep-research`、`learn-everything`、`loop`、`mate`、`memory-search`、`skill-creator`、`super-research`
  - `arxiv`、`modern-python-toolchain`、`playwright`、`research-paper-writing`
  - `claude-code`、`codex`、`grok-build`、`ymcode-docs`
- Test: `bun run check:skills`

**Interfaces:**
- Consumes: Task 1
- Produces: 核心技能中文正文

- [ ] **Step 1: 翻译规则**

对每个 `SKILL.md`：
- frontmatter `name` 不变；`description` 改为“中文描述 | English trigger keywords”。
- 正文散文中文；代码围栏、行内代码、命令、路径、URL、API 名、第三方品牌不变。
- 保留标题层级与 workflow 结构。
- 不翻译 assets 中的代码与脚本。

- [ ] **Step 2: 批量翻译并校验**

每批 5–10 个文件，使用统一翻译提示（见 Task 8 附录）。每批后：

Run: `bun run check:skills`
Expected: 代码围栏 hash 不变；正文含中文；YAML 可解析。

- [ ] **Step 3: 更新技能描述与别名**

在 `zh.ts` 补齐 `tui.skill.<name>.description` 与 `.slash`；新增技能若目录改名（`mimocode-docs` → `ymcode-docs`），同步 key 与文档引用。

- [ ] **Step 4: 抽样复核**

人工对比 3 个最长技能（`pptx-official`、`codex`、`html-to-video-pipeline`）的代码块与术语。

- [ ] **Step 5: 提交**

```bash
git add packages/cli/src/skill packages/cli/src/cli/cmd/tui/i18n
git commit -m "i18n(skills): translate core bundled skills"
```

---

### Task 6: 内置技能翻译（办公、数据、产品、销售）

**Files:**
- Modify: `docx-official`、`xlsx-official`、`pdf-official`、`pptx-official`
- Modify: `data-analytics/**`、`product-design/**`、`sales/**`
- Test: `bun run check:skills`

- [ ] **Step 1: 按目录分批翻译**

每批 5–10 个 `SKILL.md`；同一 workflow 的父子技能放在同一批，保持术语一致。

- [ ] **Step 2: 机械校验**

Run: `bun run check:skills`
Expected: 全绿。

- [ ] **Step 3: 抽样复核**

对 `sales/workflows/salesforce`、`data-analytics/workflows/build-dashboard`、`product-design/workflows/design-qa` 抽查 API 名、命令、表格结构未被破坏。

- [ ] **Step 4: 提交**

```bash
git add packages/cli/src/skill packages/cli/src/cli/cmd/tui/i18n
git commit -m "i18n(skills): translate office, data, product and sales skills"
```

---

### Task 7: 文档与最终门禁

**Files:**
- Modify: `README.md`、`README.zh.md`、`AGENTS.md`、`CONTRIBUTING.md`
- Modify: `docs/**`（第一方文档品牌与语言）
- Test: 全部门禁

- [ ] **Step 1: 文档中文化**

主 README 中文；保留上游署名与英文命令示例。`AGENTS.md` 中文项目约定。

- [ ] **Step 2: 全量门禁**

```bash
bun run check:brand
bun run check:i18n
bun run check:skills
bun run check:prompts
bun run typecheck
bun test
bun run --cwd packages/cli build:local
```

Expected: 全部退出码 0。

- [ ] **Step 3: 运行时冒烟**

1. 启动 `ymcode`，确认首屏、命令面板、权限对话框、设置页中文。
2. 切换语言到英文再切回中文，重启后保持。
3. 触发一次用户可见错误（如错误 provider），确认 toast 中文、日志英文。
4. 调用一个中文技能（如 `/论文搜索`），确认加载成功。

将命令、截图/终端输出摘要写入 `docs/verification/i18n.md`。

- [ ] **Step 4: 提交**

```bash
git add README.md README.zh.md AGENTS.md CONTRIBUTING.md docs
git commit -m "docs(i18n): localize project documentation and record verification"
```

---

## 附录：技能翻译提示词

```text
Translate the prose in this SKILL.md to Simplified Chinese.

Hard rules:
- Do NOT change anything inside fenced code blocks or inline code spans.
- Do NOT change commands, paths, URLs, API names, tool names, YAML keys, or the frontmatter `name`.
- Keep the frontmatter `description` bilingual: Chinese first, then " | " and the original English trigger keywords.
- Keep headings and workflow structure.
- Translate explanatory prose only; keep third-party brand names.
- Output the complete file, not a diff.
```

## Self-Review

- 覆盖 spec 5.1–5.5：UI、技能、提示词、术语表、检查。
- 未覆盖：instincts 文案（由 instincts 计划与汉化计划共同覆盖）。
- 风险：技能翻译量 9,861 行，按批次提交与机械校验控制漂移。
