# ymcode Instincts 记忆层 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **状态（2026-10-24 回填）**：本计划已执行完毕并随 v0.2.0 交付。复选框未逐项回填，实际交付状态以 `docs/PROGRESS.md` 与 `memory/verification.md` 为准。

**Goal:** 在现有 `MEMORY.md` / `checkpoint.md` / FTS5 / dream / distill 之上，增加带证据与置信度的 instincts（直觉规则）捕获、晋升、降级、衰减和预算注入。

**Architecture:** Markdown 文件为唯一存储（不新增数据库表）；`instinct` 类型复用现有 FTS 索引。独立 `instinct-observer` 子代理在 checkpoint 成功后节流捕获候选；`instinct` 工具与 CLI 做确定性晋升/降级；`llm.ts` 只注入 active 规则。

**Tech Stack:** Effect、zod、gray-matter、ulid、现有 SQLite FTS5、现有 actor/subagent 机制。

**Spec:** `docs/superpowers/specs/2026-10-21-ymcode-harness-design.md`

## Global Constraints

- 不新增数据库表；不改已发布 migration。
- 候选必须有证据（session id + 日期）；无证据不落盘。
- 只有 `active` 自动注入；candidates 只可检索。
- 自动捕获失败不得影响会话；所有捕获路径可被 `instincts.capture=off` 关闭。
- 代码注释英文；用户可见文案中文（汉化计划负责）。
- 每个 Task 结束提交一次。

---

### Task 1: Instinct 文件格式与解析

**Files:**
- Create: `packages/cli/src/memory/instinct.ts`
- Test: `packages/cli/test/memory/instinct.test.ts`

**Interfaces:**
- Consumes: 无
- Produces: `Instinct.Info`（zod schema）、`parse(text) => { info, body }`、`serialize(info, body) => string`、`clampConfidence(n)`

- [ ] **Step 1: 写失败测试**

```ts
// packages/cli/test/memory/instinct.test.ts
import { describe, expect, test } from "bun:test"
import { Info, parse, serialize, clampConfidence } from "../../src/memory/instinct"

const sample = `---
id: ins_abc12345
description: 提交前必须跑 typecheck
status: candidate
confidence: 0.4
evidence:
  - session: ses_1
    date: 2026-10-21
    quote: "以后都先跑 typecheck"
source: correction
created_at: 2026-10-21T00:00:00.000Z
updated_at: 2026-10-21T00:00:00.000Z
last_seen_at: 2026-10-21T00:00:00.000Z
contradictions: 0
---
适用所有改动。`

describe("instinct format", () => {
  test("round-trips frontmatter and body", () => {
    const { info, body } = parse(sample)
    expect(info.id).toBe("ins_abc12345")
    expect(info.source).toBe("correction")
    expect(body).toBe("适用所有改动。")
    expect(parse(serialize(info, body)).info).toEqual(info)
  })

  test("clamps confidence", () => {
    expect(clampConfidence(-1)).toBe(0)
    expect(clampConfidence(2)).toBe(1)
    expect(clampConfidence(0.42)).toBe(0.42)
  })

  test("rejects missing evidence", () => {
    expect(() => Info.parse({ id: "ins_abc12345", description: "x", status: "candidate", confidence: 0.4, evidence: [], source: "correction", created_at: "x", updated_at: "x", last_seen_at: "x", contradictions: 0 })).toThrow()
  })
})
```

- [ ] **Step 2: 运行并确认失败**

Run: `bun test packages/cli/test/memory/instinct.test.ts`
Expected: 失败（模块不存在）。

- [ ] **Step 3: 实现**

```ts
// packages/cli/src/memory/instinct.ts
import matter from "gray-matter"
import { z } from "zod"

export const Status = z.enum(["candidate", "active", "retired"])
export const Source = z.enum(["correction", "repetition", "decision"])

export const Evidence = z.object({
  session: z.string().min(1),
  date: z.string().min(1),
  quote: z.string().optional(),
})

export const Info = z.object({
  id: z.string().regex(/^ins_[a-z0-9]{8,}$/),
  description: z.string().min(1).max(200),
  status: Status,
  confidence: z.number().min(0).max(1),
  evidence: z.array(Evidence).min(1),
  source: Source,
  created_at: z.string(),
  updated_at: z.string(),
  last_seen_at: z.string(),
  contradictions: z.number().int().min(0).default(0),
})
export type Info = z.infer<typeof Info>

export function clampConfidence(value: number): number {
  return Math.min(1, Math.max(0, value))
}

export function parse(text: string): { info: Info; body: string } {
  const fm = matter(text)
  return { info: Info.parse(fm.data), body: fm.content.trim() }
}

export function serialize(info: Info, body: string): string {
  return matter.stringify(body.trim() + "\n", Info.parse(info))
}
```

- [ ] **Step 4: 运行测试**

Run: `bun test packages/cli/test/memory/instinct.test.ts`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add packages/cli/src/memory/instinct.ts packages/cli/test/memory/instinct.test.ts
git commit -m "feat(memory): add instinct file format"
```

---

### Task 2: 路径类型与 FTS 索引

**Files:**
- Modify: `packages/cli/src/memory/paths.ts`
- Modify: `packages/cli/test/memory/paths.test.ts`

**Interfaces:**
- Consumes: Task 1
- Produces: `MemoryType` 包含 `"instinct"`；`parsePath` 识别 `instincts/<id>.md`

- [ ] **Step 1: 写失败测试**

```ts
// 追加到 packages/cli/test/memory/paths.test.ts
test("classifies instincts/<id> as instinct", () => {
  const loc = parsePath("/data/memory/projects/p1/instincts/ins_abc12345.md")
  expect(loc?.type).toBe("instinct")
  expect(loc?.key).toBe("instincts/ins_abc12345")
})
```

- [ ] **Step 2: 运行并确认失败**

Run: `bun test packages/cli/test/memory/paths.test.ts`
Expected: 失败（type 为 `free`）。

- [ ] **Step 3: 实现**

```ts
// packages/cli/src/memory/paths.ts
export type MemoryType =
  | "free" | "memory" | "checkpoint" | "progress" | "notes"
  | "feedback" | "project" | "reference" | "user" | "instinct"

const TYPE_PATTERNS: Array<{ match: RegExp; type: MemoryType }> = [
  { match: /^memory$/i, type: "memory" },
  { match: /^memory-/i, type: "memory" },
  { match: /^checkpoint$/, type: "checkpoint" },
  { match: /^checkpoint-/, type: "checkpoint" },
  { match: /^tasks\/[^/]+\/progress$/, type: "progress" },
  { match: /^tasks\/[^/]+\/notes$/, type: "notes" },
  { match: /^instincts\/[^/]+$/, type: "instinct" },
]
```

- [ ] **Step 4: 运行测试**

Run: `bun test packages/cli/test/memory/paths.test.ts packages/cli/test/memory/reconcile.test.ts`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add packages/cli/src/memory/paths.ts packages/cli/test/memory/paths.test.ts
git commit -m "feat(memory): index instinct files in FTS"
```

---

### Task 3: Instinct Service（CRUD/晋升/降级/衰减/注入）

**Files:**
- Create: `packages/cli/src/memory/instinct-service.ts`
- Test: `packages/cli/test/memory/instinct-service.test.ts`

**Interfaces:**
- Consumes: Task 1, Task 2
- Produces: `Instinct.Service`，方法：
  - `list({ scope, projectID, status? })`
  - `get({ scope, projectID, id })`
  - `write({ scope, projectID, id?, description, source, confidence, evidence, body })`
  - `promote({ scope, projectID, id, force? })`
  - `demote({ scope, projectID, id, reason })`
  - `forget({ scope, projectID, id })`
  - `decay({ scope, projectID })`
  - `review({ scope, projectID })`
  - `renderInjection({ scope, projectID, budget })`

- [ ] **Step 1: 写失败测试**

```ts
// packages/cli/test/memory/instinct-service.test.ts
import { describe, expect, test } from "bun:test"
import { Effect } from "effect"
import fs from "fs/promises"
import path from "path"
import os from "os"
import { make } from "../../src/memory/instinct-service"

describe("instinct service", () => {
  test("writes, promotes and renders active rules", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ymcode-instinct-"))
    await fs.mkdir(path.join(root, "projects", "p1"), { recursive: true })
    await fs.writeFile(path.join(root, "projects", "p1", "MEMORY.md"), "# Project memory\n\n## Rules\n\n(none)\n\n## Architecture decisions\n\n(none)\n\n## Discovered durable knowledge\n\n(none)\n")

    const inst = make(root)
    const written = await Effect.runPromise(inst.write({
      scope: "projects", projectID: "p1", description: "提交前必须跑 typecheck",
      source: "correction", confidence: 0.9,
      evidence: [{ session: "ses_1", date: "2026-10-21" }, { session: "ses_2", date: "2026-10-22" }],
      body: "所有代码改动适用。",
    }))
    expect(written.status).toBe("candidate")

    const promoted = await Effect.runPromise(inst.promote({ scope: "projects", projectID: "p1", id: written.id }))
    expect(promoted.info.status).toBe("active")
    expect(promoted.appended).toBe(true)

    const memory = await fs.readFile(path.join(root, "projects", "p1", "MEMORY.md"), "utf8")
    expect(memory).toContain("提交前必须跑 typecheck")
    expect(memory).toContain(written.id)

    const injection = await Effect.runPromise(inst.renderInjection({ scope: "projects", projectID: "p1", budget: 1200 }))
    expect(injection).toContain("提交前必须跑 typecheck")
  })
})
```

- [ ] **Step 2: 运行并确认失败**

Run: `bun test packages/cli/test/memory/instinct-service.test.ts`
Expected: 失败（模块不存在）。

- [ ] **Step 3: 实现基础类型与路径**

```ts
// packages/cli/src/memory/instinct-service.ts
import { Context, Effect, Layer } from "effect"
import fs from "fs/promises"
import path from "path"
import { ulid } from "ulid"
import { Global } from "../global"
import { Token } from "@/util"
import { Info, parse, serialize, clampConfidence, type Source, type Status } from "./instinct"

export type Scope = "global" | "projects"

export interface Interface {
  readonly list: (input: { scope: Scope; projectID: string; status?: Status }) => Effect.Effect<Info[]>
  readonly get: (input: { scope: Scope; projectID: string; id: string }) => Effect.Effect<{ info: Info; body: string; file: string }>
  readonly write: (input: {
    scope: Scope; projectID: string; id?: string; description: string; source: Source
    confidence: number; evidence: Info["evidence"]; body: string
  }) => Effect.Effect<Info>
  readonly promote: (input: { scope: Scope; projectID: string; id: string; force?: boolean }) => Effect.Effect<{ info: Info; appended: boolean }>
  readonly demote: (input: { scope: Scope; projectID: string; id: string; reason: string }) => Effect.Effect<Info>
  readonly forget: (input: { scope: Scope; projectID: string; id: string }) => Effect.Effect<void>
  readonly decay: (input: { scope: Scope; projectID: string }) => Effect.Effect<number>
  readonly review: (input: { scope: Scope; projectID: string }) => Effect.Effect<{ promoted: string[]; decayed: number }>
  readonly renderInjection: (input: { scope: Scope; projectID: string; budget: number }) => Effect.Effect<string>
}

export class Service extends Context.Service<Service, Interface>()("@ymcode/Instinct") {}
```

路径：

```ts
const ID_RE = /^ins_[a-z0-9]{8,}$/

// 以下 helper 全部定义在 make(root) 闭包内。
function base(scope: Scope, projectID: string) {
  return path.join(root, scope === "global" ? "global" : path.join("projects", projectID))
}
function dir(scope: Scope, projectID: string) { return path.join(base(scope, projectID), "instincts") }
function indexFile(scope: Scope, projectID: string) { return path.join(base(scope, projectID), "INSTINCTS.md") }
function memoryFile(scope: Scope, projectID: string) { return path.join(base(scope, projectID), "MEMORY.md") }
```

- [ ] **Step 4: 实现 write/list/get/index**

```ts
async function readAll(scope: Scope, projectID: string): Promise<Array<{ info: Info; body: string; file: string }>> {
  const files = await fs.readdir(dir(scope, projectID)).catch(() => [] as string[])
  const out = []
  for (const name of files.filter((x) => x.endsWith(".md"))) {
    const file = path.join(dir(scope, projectID), name)
    const { info, body } = parse(await fs.readFile(file, "utf8"))
    out.push({ info, body, file })
  }
  return out
}

async function rebuildIndex(scope: Scope, projectID: string) {
  const items = (await readAll(scope, projectID)).sort((a, b) => b.info.confidence - a.info.confidence)
  const lines = ["# Instincts", "", "| id | status | confidence | updated | rule |", "|---|---|---|---|---|"]
  for (const { info } of items.slice(0, 100)) {
    lines.push(`| ${info.id} | ${info.status} | ${info.confidence.toFixed(2)} | ${info.updated_at.slice(0, 10)} | ${info.description} |`)
  }
  await fs.mkdir(base(scope, projectID), { recursive: true })
  await fs.writeFile(indexFile(scope, projectID), lines.join("\n") + "\n")
}
```

```ts
const write = (input: Parameters<Interface["write"]>[0]) =>
  Effect.promise(async () => {
    const now = new Date().toISOString()
    const id = input.id ?? `ins_${ulid().toLowerCase().slice(0, 12)}`
    const existing = input.id
      ? (await readAll(input.scope, input.projectID)).find((x) => x.info.id === input.id)
      : undefined
    const evidence = [...(existing?.info.evidence ?? []), ...input.evidence]
      .filter((e, i, all) => all.findIndex((x) => x.session === e.session && x.date === e.date) === i)
    const info = Info.parse({
      id,
      description: input.description,
      status: existing?.info.status ?? "candidate",
      confidence: clampConfidence(input.confidence),
      evidence,
      source: input.source,
      created_at: existing?.info.created_at ?? now,
      updated_at: now,
      last_seen_at: now,
      contradictions: existing?.info.contradictions ?? 0,
    })
    await fs.mkdir(dir(input.scope, input.projectID), { recursive: true })
    await fs.writeFile(path.join(dir(input.scope, input.projectID), `${id}.md`), serialize(info, input.body))
    await rebuildIndex(input.scope, input.projectID)
    return info
  })
```

- [ ] **Step 5: 实现 promote/demote/decay/review/forget**

```ts
function insertAfterSection(markdown: string, section: string, line: string): string {
  const lines = markdown.split("\n")
  const start = lines.findIndex((l) => l.trim() === section)
  if (start < 0) throw new Error(`section not found: ${section}`)
  let end = lines.length
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].startsWith("## ")) { end = i; break }
  }
  const body = lines.slice(start + 1, end).filter((l) => l.trim() !== "" && l.trim() !== "(none)")
  body.push(line)
  return [...lines.slice(0, start + 1), "", ...body, "", ...lines.slice(end)].join("\n")
}
```

```ts
const promote = (input: { scope: Scope; projectID: string; id: string; force?: boolean }) =>
  Effect.promise(async () => {
    if (!ID_RE.test(input.id)) throw new Error("invalid instinct id")
    const item = (await readAll(input.scope, input.projectID)).find((x) => x.info.id === input.id)
    if (!item) throw new Error(`instinct not found: ${input.id}`)
    if (!input.force) {
      const sessions = new Set(item.info.evidence.map((e) => e.session))
      if (item.info.confidence < 0.8 || sessions.size < 2) throw new Error("instinct does not meet promotion threshold")
    }
    const section = item.info.source === "correction" ? "## Rules"
      : item.info.source === "repetition" ? "## Discovered durable knowledge"
      : "## Architecture decisions"
    const file = memoryFile(input.scope, input.projectID)
    const current = await fs.readFile(file, "utf8")
    const normalized = current.toLowerCase().replace(/\s+/g, " ")
    const line = `- ${item.info.description} (instinct: ${item.info.id}, confidence: ${item.info.confidence.toFixed(2)}, updated: ${new Date().toISOString().slice(0, 10)})`
    const appended = !normalized.includes(item.info.description.toLowerCase().replace(/\s+/g, " "))
    const next = appended ? insertAfterSection(current, section, line) : current
    if (appended && Buffer.byteLength(next) > 10_000) throw new Error("MEMORY.md over 10KB; run /dream first")
    if (appended) await fs.writeFile(file, next)
    const info = Info.parse({ ...item.info, status: "active", updated_at: new Date().toISOString() })
    await fs.writeFile(item.file, serialize(info, item.body))
    await rebuildIndex(input.scope, input.projectID)
    return { info, appended }
  })
```

```ts
const demote = (input: { scope: Scope; projectID: string; id: string; reason: string }) =>
  Effect.promise(async () => {
    const item = (await readAll(input.scope, input.projectID)).find((x) => x.info.id === input.id)
    if (!item) throw new Error(`instinct not found: ${input.id}`)
    const confidence = clampConfidence(item.info.confidence - 0.3)
    const info = Info.parse({
      ...item.info, confidence,
      status: confidence < 0.8 ? "candidate" : item.info.status,
      contradictions: item.info.contradictions + 1,
      updated_at: new Date().toISOString(),
    })
    await fs.writeFile(item.file, serialize(info, `${item.body}\n\n- contradiction: ${input.reason}`))
    await rebuildIndex(input.scope, input.projectID)
    return info
  })
```

```ts
const decay = (input: { scope: Scope; projectID: string }) =>
  Effect.promise(async () => {
    const items = await readAll(input.scope, input.projectID)
    let changed = 0
    for (const item of items) {
      if (item.info.status === "retired") continue
      const days = (Date.now() - Date.parse(item.info.last_seen_at)) / 86_400_000
      if (days <= 60) continue
      const confidence = clampConfidence(item.info.confidence - 0.1)
      const status = confidence < 0.2 ? "retired" : item.info.status
      await fs.writeFile(item.file, serialize(Info.parse({ ...item.info, confidence, status, updated_at: new Date().toISOString() }), item.body))
      changed++
    }
    if (changed) await rebuildIndex(input.scope, input.projectID)
    return changed
  })
```

`review` = `decay` + list candidates + attempt promote for those meeting thresholds:

```ts
const review = (input: { scope: Scope; projectID: string }) =>
  Effect.gen(function* () {
    const decayed = yield* decay(input)
    const items = yield* list({ ...input, status: "candidate" })
    const promoted: string[] = []
    for (const item of items) {
      const sessions = new Set(item.evidence.map((e) => e.session))
      if (item.confidence >= 0.8 && sessions.size >= 2) {
        yield* promote({ ...input, id: item.id })
        promoted.push(item.id)
      }
    }
    return { promoted, decayed }
  })
```

`renderInjection`:

```ts
const renderInjection = (input: { scope: Scope; projectID: string; budget: number }) =>
  Effect.gen(function* () {
    const active = (yield* list({ ...input, status: "active" }))
      .sort((a, b) => b.confidence - a.confidence || a.id.localeCompare(b.id))
    if (active.length === 0) return ""
    const lines = ["# Active instincts", "", "Promoted rules only. Search candidates with `memory` type=instinct.", ""]
    let left = input.budget
    for (const item of active.slice(0, 12)) {
      const line = `- (${item.confidence.toFixed(2)}) ${item.description} [${item.id}]`
      const cost = Token.estimate(line)
      if (cost > left) break
      lines.push(line)
      left -= cost
    }
    for (const item of active.slice(0, 3)) {
      const body = `### ${item.id}\n${item.description}`
      const cost = Token.estimate(body)
      if (cost > left) break
      lines.push(body)
      left -= cost
    }
    return lines.join("\n")
  })
```

- [ ] **Step 6: 组装 layer**

```ts
export function make(root: string): Interface {
  // 上面所有 helper 与 const 方法都放进这个闭包。
  // base/dir/indexFile/memoryFile 从 root 派生：root 是 memory 根目录
  // （生产为 Global.Path.data/memory，测试为临时目录）。
  return { list, get, write, promote, demote, forget, decay, review, renderInjection }
}

export const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    return Service.of(make(path.join(Global.Path.data, "memory")))
  }),
)
```

测试隔离：`make(tmpRoot)` 直接注入 memory 根目录，不依赖 `YMCODE_HOME` 或导入时解析的 `Global.Path`；生产 `layer` 使用 `Global.Path.data/memory`。

- [ ] **Step 7: 运行测试**

Run: `bun test packages/cli/test/memory/instinct-service.test.ts`
Expected: PASS。

- [ ] **Step 8: 提交**

```bash
git add packages/cli/src/memory/instinct-service.ts packages/cli/test/memory/instinct-service.test.ts
git commit -m "feat(memory): add instinct service with promotion and decay"
```

---

### Task 4: 配置与模型工具

**Files:**
- Modify: `packages/cli/src/config/config.ts`
- Create: `packages/cli/src/tool/instinct.ts`
- Modify: `packages/cli/src/tool/registry.ts`
- Modify: `packages/cli/src/agent/agent.ts`
- Test: `packages/cli/test/tool/instinct.test.ts`

**Interfaces:**
- Consumes: Task 3
- Produces: `instincts` 配置；模型工具 `instinct`，操作 `list/get/write/promote/demote/forget/review`

- [ ] **Step 1: 加配置**

```ts
// packages/cli/src/config/config.ts，放在 memory 之后
instincts: Schema.optional(
  Schema.Struct({
    enabled: Schema.optional(Schema.Boolean),
    capture: Schema.optional(Schema.Literal("auto", "manual", "off")),
    promote_threshold: Schema.optional(Schema.Number),
    min_evidence: Schema.optional(PositiveInt),
    decay_days: Schema.optional(PositiveInt),
    inject_token_budget: Schema.optional(PositiveInt),
    observe_interval_minutes: Schema.optional(PositiveInt),
  }),
),
```

- [ ] **Step 2: 写工具测试**

```ts
// packages/cli/test/tool/instinct.test.ts
import { describe, expect, test } from "bun:test"
import { InstinctTool } from "../../src/tool/instinct"

describe("instinct tool", () => {
  test("declares list/get/write/promote/demote/forget/review operations", async () => {
    const tool = await Bun.file("packages/cli/src/tool/instinct.ts").text()
    for (const op of ["list", "get", "write", "promote", "demote", "forget", "review"]) {
      expect(tool).toContain(op)
    }
    expect(InstinctTool).toBeDefined()
  })
})
```

- [ ] **Step 3: 实现工具**

```ts
// packages/cli/src/tool/instinct.ts
import { Effect } from "effect"
import z from "zod"
import * as Instinct from "@/memory/instinct-service"
import * as Tool from "./tool"

const parameters = z.object({
  operation: z.enum(["list", "get", "write", "promote", "demote", "forget", "review"]),
  id: z.string().optional(),
  description: z.string().optional(),
  source: z.enum(["correction", "repetition", "decision"]).optional(),
  confidence: z.number().min(0).max(1).optional(),
  evidence: z.array(z.object({ session: z.string(), date: z.string(), quote: z.string().optional() })).optional(),
  body: z.string().optional(),
  status: z.enum(["candidate", "active", "retired"]).optional(),
  scope: z.enum(["global", "projects"]).default("projects"),
  projectID: z.string().optional(),
  force: z.boolean().optional(),
  reason: z.string().optional(),
})

export const InstinctTool = Tool.define("instinct", Effect.gen(function* () {
  const instinct = yield* Instinct.Service
  return {
    description: "Manage instinct rules: list/get/write candidates, promote/demote/forget, review with decay.",
    parameters,
    execute: (args: z.infer<typeof parameters>) => Effect.gen(function* () {
      const projectID = args.projectID ?? "global"
      const scope = args.scope
      if (args.operation === "list") {
        const items = yield* instinct.list({ scope, projectID, status: args.status })
        return { title: `Instincts: ${items.length}`, output: items.map((x) => `${x.id} ${x.status} ${x.confidence.toFixed(2)} ${x.description}`).join("\n"), metadata: { count: items.length } }
      }
      if (args.operation === "get") {
        const item = yield* instinct.get({ scope, projectID, id: args.id! })
        return { title: item.info.id, output: `# ${item.info.description}\n\n${item.body}`, metadata: {} }
      }
      if (args.operation === "write") {
        const info = yield* instinct.write({
          scope, projectID, id: args.id, description: args.description!, source: args.source!,
          confidence: args.confidence ?? 0.4, evidence: args.evidence!, body: args.body ?? "",
        })
        return { title: `Wrote ${info.id}`, output: `${info.id} (${info.status}, ${info.confidence})`, metadata: { id: info.id } }
      }
      if (args.operation === "promote") {
        const out = yield* instinct.promote({ scope, projectID, id: args.id!, force: args.force })
        return { title: `Promoted ${args.id}`, output: `${args.id} -> active; appended=${out.appended}`, metadata: { appended: out.appended } }
      }
      if (args.operation === "demote") {
        const info = yield* instinct.demote({ scope, projectID, id: args.id!, reason: args.reason ?? "user correction" })
        return { title: `Demoted ${args.id}`, output: `${info.id} -> ${info.status} (${info.confidence})`, metadata: {} }
      }
      if (args.operation === "forget") {
        yield* instinct.forget({ scope, projectID, id: args.id! })
        return { title: `Forgot ${args.id}`, output: "deleted", metadata: {} }
      }
      const out = yield* instinct.review({ scope, projectID })
      return { title: "Instinct review", output: `promoted=${out.promoted.join(",") || "none"}; decayed=${out.decayed}`, metadata: out }
    }),
  }
}))
```

- [ ] **Step 4: 注册工具**

在 `packages/cli/src/tool/registry.ts`：

```ts
import { InstinctTool } from "./instinct"
const instincttool = yield* InstinctTool
// 在返回的 tools 映射中，与 memory 并列：
instinct: instincttool,
```

- [ ] **Step 5: 给 dream/distill 放权**

在 `agent/agent.ts` 的 dream、distill `toolAllowlist` 中加入 `"instinct"`；权限中加入 `instinct: "allow"`。

- [ ] **Step 6: 运行测试**

Run: `bun test packages/cli/test/tool/instinct.test.ts && bun run typecheck`
Expected: PASS。

- [ ] **Step 7: 提交**

```bash
git add packages/cli/src/config/config.ts packages/cli/src/tool/instinct.ts packages/cli/src/tool/registry.ts packages/cli/src/agent/agent.ts packages/cli/test/tool/instinct.test.ts
git commit -m "feat(tool): expose instinct operations"
```

---

### Task 5: CLI 与斜杠命令

**Files:**
- Create: `packages/cli/src/cli/cmd/instinct.ts`
- Modify: `packages/cli/src/index.ts`
- Modify: `packages/cli/src/command/index.ts`
- Test: `packages/cli/test/cli/instinct.test.ts`

- [ ] **Step 1: 实现 CLI**

```ts
// packages/cli/src/cli/cmd/instinct.ts
import { cmd } from "./cmd"
import { Instance } from "../../project/instance"
import { AppRuntime } from "@/effect/app-runtime"
import * as Instinct from "../../memory/instinct-service"

async function run(fn: (scope: "projects", projectID: string) => Promise<void>) {
  await Instance.provide({
    directory: process.cwd(),
    async fn() {
      await fn("projects", Instance.project.id)
    },
  })
}

const List = cmd({
  command: "list",
  describe: "list instincts",
  builder: (y) => y.option("status", { choices: ["candidate", "active", "retired"] as const }),
  handler: async (args) => run(async (scope, projectID) => {
    const items = await AppRuntime.runPromise(Instinct.Service.use((svc) => svc.list({ scope, projectID, status: args.status })))
    for (const item of items) console.log(`${item.id}\t${item.status}\t${item.confidence.toFixed(2)}\t${item.description}`)
  }),
})

const Promote = cmd({
  command: "promote <id>",
  describe: "promote an instinct to MEMORY.md",
  builder: (y) => y.option("force", { type: "boolean", default: false }),
  handler: async (args) => run(async (scope, projectID) => {
    const out = await AppRuntime.runPromise(Instinct.Service.use((svc) => svc.promote({ scope, projectID, id: args.id, force: args.force })))
    console.log(`${out.info.id} active; appended=${out.appended}`)
  }),
})

export const InstinctCommand = cmd({
  command: "instinct",
  describe: "manage instinct rules",
  builder: (y) => y.command(List).command(Promote).demandCommand(),
  handler: () => {},
})
```

同文件补 `demote <id> --reason`、`forget <id> --yes`、`review`。`forget` 必须 `--yes` 才执行。

- [ ] **Step 2: 注册 CLI**

在 `packages/cli/src/index.ts` 导入并 `.command(InstinctCommand)`。

- [ ] **Step 3: 加斜杠命令**

`command/index.ts` 的 `Default` 增加 `INSTINCT: "instinct"`，并注册：

```ts
commands[Default.INSTINCT] = {
  name: Default.INSTINCT,
  description: "review, promote or forget instinct rules",
  source: "command",
  subtask: false,
  get template() {
    return [
      "Use the `instinct` tool to handle this request.",
      "Operations: list, get, promote, demote, forget, review.",
      "Never promote without evidence; never forget without explicit user confirmation.",
      "",
      "Request: $ARGUMENTS",
    ].join("\n")
  },
  hints: ["$ARGUMENTS"],
}
```

- [ ] **Step 4: 运行**

Run: `bun run --cwd packages/cli dev -- instinct list`
Expected: 输出空列表或现有 instincts，不崩溃。

- [ ] **Step 5: 提交**

```bash
git add packages/cli/src/cli/cmd/instinct.ts packages/cli/src/index.ts packages/cli/src/command/index.ts packages/cli/test/cli/instinct.test.ts
git commit -m "feat(cli): add instinct commands"
```

---

### Task 6: Observer 捕获

**Files:**
- Create: `packages/cli/src/agent/prompt/instinct-observer.txt`
- Create: `packages/cli/src/session/instinct-observer.ts`
- Modify: `packages/cli/src/agent/agent.ts`
- Modify: `packages/cli/src/agent/config.ts`
- Modify: `packages/cli/src/session/checkpoint.ts`
- Test: `packages/cli/test/session/instinct-observer.test.ts`

- [ ] **Step 1: 写节流测试**

```ts
// packages/cli/test/session/instinct-observer.test.ts
import { describe, expect, test } from "bun:test"
import { shouldObserve } from "../../src/session/instinct-observer"

describe("shouldObserve", () => {
  test("requires auto capture and every third checkpoint", () => {
    expect(shouldObserve({ enabled: true, capture: "auto", checkpoints: 2, lastRunAt: undefined, now: 1000, intervalMs: 60000 })).toBe(false)
    expect(shouldObserve({ enabled: true, capture: "auto", checkpoints: 3, lastRunAt: undefined, now: 1000, intervalMs: 60000 })).toBe(true)
    expect(shouldObserve({ enabled: true, capture: "off", checkpoints: 3, lastRunAt: undefined, now: 1000, intervalMs: 60000 })).toBe(false)
  })
  test("honors interval", () => {
    expect(shouldObserve({ enabled: true, capture: "auto", checkpoints: 3, lastRunAt: 900, now: 1000, intervalMs: 60000 })).toBe(false)
    expect(shouldObserve({ enabled: true, capture: "auto", checkpoints: 3, lastRunAt: 1, now: 100000, intervalMs: 60000 })).toBe(true)
  })
})
```

- [ ] **Step 2: 实现纯函数与状态**

```ts
// packages/cli/src/session/instinct-observer.ts
import fs from "fs/promises"
import path from "path"
import { Global } from "../global"

export function shouldObserve(input: {
  enabled: boolean
  capture: "auto" | "manual" | "off"
  checkpoints: number
  lastRunAt?: number
  now: number
  intervalMs: number
}): boolean {
  if (!input.enabled || input.capture !== "auto") return false
  if (input.checkpoints % 3 !== 0) return false
  if (input.lastRunAt && input.now - input.lastRunAt < input.intervalMs) return false
  return true
}

type State = Record<string, { lastRunAt: number; checkpoints: number }>
const file = () => path.join(Global.Path.state, "instinct-observer.json")

export async function readState(): Promise<State> {
  return JSON.parse(await fs.readFile(file(), "utf8").catch(() => "{}"))
}
export async function writeState(state: State) {
  await fs.mkdir(Global.Path.state, { recursive: true })
  await fs.writeFile(file(), JSON.stringify(state, null, 2))
}
```

- [ ] **Step 3: 写 observer 提示词**

```text
You are the instinct observer. Read the session checkpoint and extract at most 3 candidate instinct rules.

Inputs:
- Checkpoint: <CHECKPOINT_PATH>
- Instinct index: <INSTINCTS_DIR>/INSTINCTS.md
- Existing instincts: <INSTINCTS_DIR>

Rules:
- Only extract a rule when there is explicit user correction, a repeated preference, or a durable decision.
- Every candidate MUST include evidence: session id, date, and a verbatim quote when available.
- Confidence starts at 0.3-0.6. Never promote. Never edit MEMORY.md.
- Skip secrets, tokens, connection strings, one-off task facts.
- If the same rule exists, update its last_seen_at and evidence via the instinct tool instead of creating a duplicate.
- Write candidates with the `instinct` tool operation=write. Do not write files directly.
- If nothing qualifies, write nothing and stop.
```

- [ ] **Step 4: 注册 agent**

在 `agent/agent.ts` 加入 `"instinct-observer"`：

```ts
"instinct-observer": {
  name: "instinct-observer",
  mode: "subagent" as const,
  options: {},
  native: true,
  hidden: true,
  prompt: PROMPT_INSTINCT_OBSERVER,
  permission: Permission.merge(defaults, Permission.fromConfig({
    "*": "deny",
    read: "allow",
    memory: "allow",
    instinct: "allow",
    external_directory: {
      [path.join(Global.Path.data, "memory")]: "allow",
      [path.join(Global.Path.data, "memory", "*")]: "allow",
    },
  }), user),
  toolAllowlist: ["read", "memory", "instinct"],
},
```

在 `agent/config.ts` 的 `SYSTEM_SPAWNED_AGENT_TYPES` 加入 `"instinct-observer"`。

- [ ] **Step 5: 触发**

在 `checkpoint.ts` 的 writer 成功分支（更新 `last_checkpoint_message_id` 之后）调用：

```ts
yield* Effect.fork(
  startInstinctObserver({
    sessionID: input.sessionID,
    projectID: projectID as ProjectID,
    model: input.model,
    checkpointPath: checkpointPath(input.sessionID),
  }).pipe(Effect.ignore),
)
```

`startInstinctObserver` 读取配置、state，判断 `shouldObserve`；满足时创建子会话并 `actor.spawn`，`agentType: "instinct-observer"`、`tools: ["read","memory","instinct"]`、`background: true`。失败只记日志。

- [ ] **Step 6: 测试**

Run: `bun test packages/cli/test/session/instinct-observer.test.ts && bun run typecheck`
Expected: PASS。

- [ ] **Step 7: 提交**

```bash
git add packages/cli/src/agent packages/cli/src/session/instinct-observer.ts packages/cli/src/session/checkpoint.ts packages/cli/test/session/instinct-observer.test.ts
git commit -m "feat(memory): add throttled instinct observer"
```

---

### Task 7: 注入与 dream 集成

**Files:**
- Modify: `packages/cli/src/session/llm.ts`
- Modify: `packages/cli/src/agent/prompt/dream.txt`
- Modify: `packages/cli/src/session/checkpoint.ts`（memory keys 索引自然包含 instincts，无需额外代码）
- Test: `packages/cli/test/session/llm-system-prompt.test.ts`

- [ ] **Step 1: 注入**

在 `llm.ts` 的 `servesCheckpoint` 分支：

```ts
const instincts = yield* Instinct.Service
const instinctText = yield* instincts.renderInjection({
  scope: "projects",
  projectID,
  budget: 1200,
}).pipe(Effect.orElseSucceed(() => ""))
system.push(buildMemoryInstructions(yield* memory.root(), instinctText))
```

`buildMemoryInstructions(memoryRoot, instinctText?)` 在返回内容末尾追加：

```ts
...(instinctText ? [instinctText] : [])
```

并在 memory 文件列表中加一条：

```ts
"- Instincts at `<memory>/projects/<project_id>/INSTINCTS.md` — promoted rules are auto-injected; candidates are searchable with the `memory` tool (type=instinct).",
```

- [ ] **Step 2: dream 提示词加复核阶段**

在 `dream.txt` 的 Phase 4 前加：

```text
## Phase 3.5 - Review Instincts

Call the `instinct` tool with operation="review" for the current project. This applies decay and promotes only candidates that meet confidence and evidence thresholds. Do not edit INSTINCTS.md or MEMORY.md directly. Report promoted/decayed counts in the summary.
```

- [ ] **Step 3: 测试**

```ts
// 追加到 llm-system-prompt.test.ts
test("active instincts are injected", async () => {
  // 用临时 memory root 写一条 active instinct，调用导出的 buildMemoryInstructions
  // 断言输出包含 "# Active instincts" 与规则文本
})
```

将 `buildMemoryInstructions` 导出以便测试。

- [ ] **Step 4: 运行**

Run: `bun test packages/cli/test/session/llm-system-prompt.test.ts && bun run typecheck`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add packages/cli/src/session/llm.ts packages/cli/src/agent/prompt/dream.txt packages/cli/test/session/llm-system-prompt.test.ts
git commit -m "feat(memory): inject active instincts and review in dream"
```

---

### Task 8: 回归与端到端

- [ ] **Step 1: 全量测试**

Run: `bun test`
Expected: 全绿；若 checkpoint 相关失败，先修复再继续。

- [ ] **Step 2: 迁移 + 记忆端到端**

在临时项目：
1. 启动 `ymcode`，写入一条用户规则并触发 checkpoint。
2. `ymcode instinct list` 看到 candidate。
3. `ymcode instinct promote <id>`。
4. 检查 `MEMORY.md` 出现规则。
5. 重启会话，检查 system prompt/rebuild 上下文含 `# Active instincts`。
6. 用 `memory` 工具 `type=instinct` 检索命中。
7. 执行 `ymcode instinct demote <id> --reason "用户纠正"`，确认 confidence 下降、status 回到 candidate。

记录每一步命令与输出到 `docs/verification/instincts.md`。

- [ ] **Step 3: 提交**

```bash
git add docs/verification/instincts.md
git commit -m "test: verify instinct capture, promotion and injection"
```

## Self-Review

- 覆盖 spec 4.1–4.7：存储、捕获、晋升、降级、衰减、注入、工具、配置、测试。
- 未覆盖：汉化（独立计划）、改名（前置计划）。
- 类型一致性：`Info`、`Scope`、`Status`、`Source` 在 schema、service、tool 中同名。
