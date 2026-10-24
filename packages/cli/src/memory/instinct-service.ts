import { Context, Effect, Exit, Layer } from "effect"
import fs from "fs/promises"
import path from "path"
import { ulid } from "ulid"
import z from "zod"
import { Global } from "../global"
import { Config } from "../config"
import { LocalContext, Token } from "@/util"
import { Info, parse, serialize, clampConfidence, type Source, type Status } from "./instinct"

export type Scope = "global" | "projects"

export type Settings = {
  promoteThreshold: number
  minEvidence: number
  decayDays: number
  injectTokenBudget: number
}

export const defaultSettings: Settings = {
  promoteThreshold: 0.8,
  minEvidence: 2,
  decayDays: 60,
  injectTokenBudget: 1200,
}

export const Bundle = z.object({
  version: z.literal(1),
  exported_at: z.string(),
  items: z.array(z.object({ info: Info, body: z.string() })),
})
export type Bundle = z.infer<typeof Bundle>

export interface Interface {
  readonly list: (input: { scope: Scope; projectID: string; status?: Status }) => Effect.Effect<Info[]>
  readonly get: (input: { scope: Scope; projectID: string; id: string }) => Effect.Effect<{
    info: Info
    body: string
    file: string
  }>
  readonly write: (input: {
    scope: Scope
    projectID: string
    id?: string
    description: string
    source: Source
    confidence: number
    evidence: Info["evidence"]
    body: string
  }) => Effect.Effect<Info>
  readonly promote: (input: { scope: Scope; projectID: string; id: string; force?: boolean }) => Effect.Effect<{
    info: Info
    appended: boolean
    /** Near-duplicate active rules (word-overlap >= 0.6); warning only. */
    similarTo: Array<{ id: string; description: string; score: number }>
  }>
  readonly demote: (input: { scope: Scope; projectID: string; id: string; reason: string }) => Effect.Effect<Info>
  readonly forget: (input: { scope: Scope; projectID: string; id: string }) => Effect.Effect<void>
  readonly decay: (input: { scope: Scope; projectID: string }) => Effect.Effect<number>
  readonly touch: (input: { scope: Scope; projectID: string; id: string }) => Effect.Effect<Exit.Exit<Info, unknown>>
  readonly review: (input: { scope: Scope; projectID: string }) => Effect.Effect<{ promoted: string[]; decayed: number }>
  readonly renderInjection: (input: { scope: Scope; projectID: string; budget?: number }) => Effect.Effect<string>
  readonly exportAll: (input: { scope: Scope; projectID: string; status?: Status }) => Effect.Effect<Bundle>
  readonly importAll: (input: {
    scope: Scope
    projectID: string
    bundle: unknown
    force?: boolean
  }) => Effect.Effect<{ imported: number; skipped: number }>
}

export class Service extends Context.Service<Service, Interface>()("@ymcode/Instinct") {}

const ID_RE = /^ins_[a-z0-9]{8,}$/
const DAY_MS = 86_400_000
const MEMORY_MAX_BYTES = 10_000

type Stored = { info: Info; body: string; file: string }

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim()
}

// Jaccard overlap of normalized description tokens; 0..1. CJK runs (no
// whitespace) are tokenized as character bigrams so Chinese rules compare
// meaningfully without a segmenter. Used to warn about near-duplicate rules
// at promote time and in memory doctor — deterministic, no index dependency.
export function similarity(a: string, b: string): number {
  const tokens = (text: string) => {
    const out = new Set<string>()
    for (const word of normalize(text).split(/\s+/)) {
      const cjk = [...word].filter((char) => /[\u4e00-\u9fff]/.test(char))
      if (cjk.length > 0) {
        for (let i = 0; i + 1 < cjk.length; i++) out.add(cjk[i]! + cjk[i + 1]!)
        if (cjk.length === 1) out.add(cjk[0]!)
      } else if (word.length > 1) {
        out.add(word)
      }
    }
    return out
  }
  const left = tokens(a)
  const right = tokens(b)
  if (left.size === 0 || right.size === 0) return 0
  let shared = 0
  for (const token of left) if (right.has(token)) shared++
  return shared / (left.size + right.size - shared)
}

const SIMILARITY_WARN = 0.6
// Active rules with zero recalls older than this decay one confidence step
// faster than plain evidence-age decay would suggest.
const UNUSED_DECAY_DAYS = 30

function sectionFor(source: Source): string {
  if (source === "correction") return "## Rules"
  if (source === "repetition") return "## Discovered durable knowledge"
  return "## Architecture decisions"
}

function insertAfterSection(markdown: string, section: string, line: string): string {
  const lines = markdown.split("\n")
  const start = lines.findIndex((entry) => entry.trim() === section)
  if (start < 0) return `${markdown.trimEnd()}\n\n${section}\n\n${line}\n`
  let end = lines.length
  for (let index = start + 1; index < lines.length; index++) {
    if (lines[index].startsWith("## ")) {
      end = index
      break
    }
  }
  const body = lines.slice(start + 1, end).filter((entry) => entry.trim() && entry.trim() !== "(none)")
  body.push(line)
  return [...lines.slice(0, start + 1), "", ...body, "", ...lines.slice(end)].join("\n")
}

function memoryTemplate(): string {
  return [
    "# Project memory",
    "",
    "## Rules",
    "",
    "(none)",
    "",
    "## Architecture decisions",
    "",
    "(none)",
    "",
    "## Discovered durable knowledge",
    "",
    "(none)",
    "",
  ].join("\n")
}

/** Resolves the effective instinct settings for the current instance. */
export type SettingsSource = () => Effect.Effect<Settings>

export function make(root: string, settings: Settings | SettingsSource = defaultSettings): Interface {
  // Settings are resolved per operation, not at construction: the layer can be
  // built outside an instance scope (AppLayer provided at the test boundary),
  // while every actual call runs inside one and must read that project's config.
  const readSettings: SettingsSource = typeof settings === "function" ? settings : () => Effect.succeed(settings)
  const base = (scope: Scope, projectID: string) =>
    path.join(root, scope === "global" ? "global" : path.join("projects", projectID))
  const dir = (scope: Scope, projectID: string) => path.join(base(scope, projectID), "instincts")
  const indexFile = (scope: Scope, projectID: string) => path.join(base(scope, projectID), "INSTINCTS.md")
  const memoryFile = (scope: Scope, projectID: string) => path.join(base(scope, projectID), "MEMORY.md")

  async function readAll(scope: Scope, projectID: string): Promise<Stored[]> {
    const files = await fs.readdir(dir(scope, projectID), { withFileTypes: true }).catch(() => [])
    const out: Stored[] = []
    for (const entry of files) {
      if (!entry.isFile() || !entry.name.endsWith(".md")) continue
      const file = path.join(dir(scope, projectID), entry.name)
      try {
        const parsed = parse(await fs.readFile(file, "utf8"))
        out.push({ ...parsed, file })
      } catch {
        continue
      }
    }
    return out
  }

  async function rebuildIndex(scope: Scope, projectID: string): Promise<void> {
    const items = (await readAll(scope, projectID)).sort(
      (a, b) => b.info.confidence - a.info.confidence || a.info.id.localeCompare(b.info.id),
    )
    const lines = ["# Instincts", "", "| id | status | confidence | updated | rule |", "|---|---|---|---|---|"]
    for (const { info } of items.slice(0, 100)) {
      lines.push(
        `| ${info.id} | ${info.status} | ${info.confidence.toFixed(2)} | ${info.updated_at.slice(0, 10)} | ${info.description.replaceAll("|", "\\|")} |`,
      )
    }
    await fs.mkdir(base(scope, projectID), { recursive: true })
    await fs.writeFile(indexFile(scope, projectID), lines.join("\n") + "\n")
  }

  async function readItem(scope: Scope, projectID: string, id: string): Promise<Stored> {
    if (!ID_RE.test(id)) throw new Error("invalid instinct id")
    const item = (await readAll(scope, projectID)).find((entry) => entry.info.id === id)
    if (!item) throw new Error(`instinct not found: ${id}`)
    return item
  }

  const list = (input: { scope: Scope; projectID: string; status?: Status }) =>
    Effect.promise(async () => {
      const items = await readAll(input.scope, input.projectID)
      return items
        .map((entry) => entry.info)
        .filter((info) => !input.status || info.status === input.status)
        .sort((a, b) => b.confidence - a.confidence || a.id.localeCompare(b.id))
    })

  const get = (input: { scope: Scope; projectID: string; id: string }) =>
    Effect.promise(() => readItem(input.scope, input.projectID, input.id))

  const write = (input: Parameters<Interface["write"]>[0]) =>
    Effect.promise(async () => {
      if (!input.description.trim()) throw new Error("description is required")
      if (input.description.length > 200) throw new Error("description exceeds 200 characters")
      const now = new Date().toISOString()
      const id = input.id ?? `ins_${ulid().toLowerCase().slice(0, 12)}`
      if (!ID_RE.test(id)) throw new Error("invalid instinct id")
      const current = (await readAll(input.scope, input.projectID)).find((entry) => entry.info.id === id)
      const existing = current?.info
      const evidenceKeys = new Set((existing?.evidence ?? []).map((entry) => `${entry.session}|${entry.date}`))
      const newEvidence = input.evidence.some((entry) => !evidenceKeys.has(`${entry.session}|${entry.date}`))
      const evidence = [...(existing?.evidence ?? []), ...input.evidence].filter(
        (entry, index, all) =>
          all.findIndex((candidate) => candidate.session === entry.session && candidate.date === entry.date) === index,
      )
      const confidence = clampConfidence(input.confidence)
      const contentChanged =
        !!existing &&
        (existing.description !== input.description.trim() ||
          existing.source !== input.source ||
          existing.confidence !== confidence ||
          (current?.body ?? "") !== input.body.trim())
      if (existing && !newEvidence && !contentChanged) return existing
      const info = Info.parse({
        id,
        description: input.description.trim(),
        status: existing?.status ?? "candidate",
        confidence,
        evidence,
        source: input.source,
        created_at: existing?.created_at ?? now,
        updated_at: now,
        last_seen_at: !existing || newEvidence ? now : existing.last_seen_at,
        contradictions: existing?.contradictions ?? 0,
        usage_count: existing?.usage_count ?? 0,
        last_used_at: existing?.last_used_at,
      })
      await fs.mkdir(dir(input.scope, input.projectID), { recursive: true })
      await fs.writeFile(path.join(dir(input.scope, input.projectID), `${id}.md`), serialize(info, input.body))
      await rebuildIndex(input.scope, input.projectID)
      return info
    })

  const promote = (input: { scope: Scope; projectID: string; id: string; force?: boolean }) =>
    Effect.gen(function* () {
      const settings = yield* readSettings()
      return yield* Effect.promise(async () => {
        const item = await readItem(input.scope, input.projectID, input.id)
        if (!input.force) {
          const sessions = new Set(item.info.evidence.map((entry) => entry.session))
          if (item.info.confidence < settings.promoteThreshold || sessions.size < settings.minEvidence) {
            throw new Error("instinct does not meet promotion threshold")
          }
        }
        const section = sectionFor(item.info.source)
        const file = memoryFile(input.scope, input.projectID)
        const current = await fs.readFile(file, "utf8").catch(() => memoryTemplate())
        const appended =
          !normalize(current).includes(normalize(item.info.description)) &&
          !normalize(current).includes(normalize(`instinct: ${item.info.id}`))
        const line = `- ${item.info.description} (instinct: ${item.info.id}, confidence: ${item.info.confidence.toFixed(2)}, updated: ${new Date().toISOString().slice(0, 10)})`
        const next = appended ? insertAfterSection(current, section, line) : current
        if (appended && Buffer.byteLength(next) > MEMORY_MAX_BYTES) {
          throw new Error("MEMORY.md over 10KB; run /dream to consolidate first")
        }
        if (appended) await fs.writeFile(file, next)
        const info = Info.parse({ ...item.info, status: "active", updated_at: new Date().toISOString() })
        await fs.writeFile(item.file, serialize(info, item.body))
        await rebuildIndex(input.scope, input.projectID)
        // Non-blocking near-duplicate warning: high word overlap with another
        // active rule usually means the layer is drifting toward redundancy.
        const similarTo = (await readAll(input.scope, input.projectID))
          .filter((entry) => entry.info.status === "active" && entry.info.id !== item.info.id)
          .map((entry) => ({
            id: entry.info.id,
            description: entry.info.description,
            score: Number(similarity(item.info.description, entry.info.description).toFixed(2)),
          }))
          .filter((entry) => entry.score >= SIMILARITY_WARN)
          .sort((a, b) => b.score - a.score)
        return { info, appended, similarTo }
      })
    })

  const decay = (input: { scope: Scope; projectID: string }) =>
    Effect.gen(function* () {
      const settings = yield* readSettings()
      return yield* Effect.promise(async () => {
        const items = await readAll(input.scope, input.projectID)
        let changed = 0
        for (const item of items) {
          if (item.info.status === "retired") continue
          const days = (Date.now() - Date.parse(item.info.last_seen_at)) / DAY_MS
          // A rule that has been active for a while but was never recalled is
          // suspect regardless of fresh evidence: decay it on the same ladder.
          const unused = item.info.status === "active" && item.info.usage_count === 0 && days > UNUSED_DECAY_DAYS
          if (days <= settings.decayDays && !unused) continue
          const confidence = clampConfidence(item.info.confidence - 0.1)
          const info = Info.parse({
            ...item.info,
            confidence,
            status: confidence < 0.2 ? "retired" : item.info.status,
            updated_at: new Date().toISOString(),
          })
          await fs.writeFile(item.file, serialize(info, item.body))
          changed++
        }
        if (changed > 0) await rebuildIndex(input.scope, input.projectID)
        return changed
      })
    })

  return {
    list,
    get,
    write,
    promote,
    decay,

    // Records an explicit recall (instinct tool get). Best-effort accounting:
    // usage_count/last_used_at feed injection ranking and the unused-decay
    // ladder; failures here must never fail the calling tool.
    touch: (input: { scope: Scope; projectID: string; id: string }) =>
      Effect.gen(function* () {
        return yield* Effect.promise(async () => {
          const item = await readItem(input.scope, input.projectID, input.id)
          const info = Info.parse({
            ...item.info,
            usage_count: item.info.usage_count + 1,
            last_used_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          await fs.writeFile(item.file, serialize(info, item.body))
          await rebuildIndex(input.scope, input.projectID)
          return info
        })
      }).pipe(Effect.exit),

    exportAll: (input) =>
      Effect.promise(async () => {
        const items = (await readAll(input.scope, input.projectID))
          .filter((entry) => !input.status || entry.info.status === input.status)
          .sort((a, b) => b.info.confidence - a.info.confidence || a.info.id.localeCompare(b.info.id))
        return {
          version: 1 as const,
          exported_at: new Date().toISOString(),
          items: items.map((entry) => ({ info: entry.info, body: entry.body })),
        }
      }),

    importAll: (input) =>
      Effect.promise(async () => {
        const bundle = Bundle.parse(input.bundle)
        await fs.mkdir(dir(input.scope, input.projectID), { recursive: true })
        let imported = 0
        let skipped = 0
        for (const item of bundle.items) {
          const file = path.join(dir(input.scope, input.projectID), `${item.info.id}.md`)
          if (!input.force && (await fs.stat(file).then(() => true).catch(() => false))) {
            skipped++
            continue
          }
          await fs.writeFile(file, serialize(Info.parse(item.info), item.body))
          imported++
        }
        if (imported > 0) await rebuildIndex(input.scope, input.projectID)
        return { imported, skipped }
      }),

    demote: (input) =>
      Effect.gen(function* () {
        const settings = yield* readSettings()
        return yield* Effect.promise(async () => {
          const item = await readItem(input.scope, input.projectID, input.id)
          const confidence = clampConfidence(item.info.confidence - 0.3)
          const info = Info.parse({
            ...item.info,
            confidence,
            status: confidence < settings.promoteThreshold ? "candidate" : item.info.status,
            contradictions: item.info.contradictions + 1,
            updated_at: new Date().toISOString(),
          })
          await fs.writeFile(item.file, serialize(info, `${item.body}\n\n- contradiction: ${input.reason}`.trim()))
          await rebuildIndex(input.scope, input.projectID)
          return info
        })
      }),

    forget: (input) =>
      Effect.promise(async () => {
        if (!ID_RE.test(input.id)) throw new Error("invalid instinct id")
        await fs.rm(path.join(dir(input.scope, input.projectID), `${input.id}.md`), { force: true })
        await rebuildIndex(input.scope, input.projectID)
      }),

    review: (input) =>
      Effect.gen(function* () {
        const settings = yield* readSettings()
        const decayExit = yield* Effect.exit(decay(input))
        const decayed = Exit.isSuccess(decayExit) ? decayExit.value : 0
        const candidatesExit = yield* Effect.exit(
          Effect.promise(async () =>
            (await readAll(input.scope, input.projectID))
              .map((entry) => entry.info)
              .filter((info) => info.status === "candidate"),
          ),
        )
        if (!Exit.isSuccess(candidatesExit)) return { promoted: [], decayed }
        const promoted: string[] = []
        for (const candidate of candidatesExit.value) {
          const sessions = new Set(candidate.evidence.map((entry) => entry.session))
          if (candidate.confidence < settings.promoteThreshold || sessions.size < settings.minEvidence) continue
          const result = yield* Effect.exit(
            promote({ scope: input.scope, projectID: input.projectID, id: candidate.id }),
          )
          if (Exit.isSuccess(result)) promoted.push(candidate.id)
        }
        return { promoted, decayed }
      }),

    renderInjection: (input) =>
      Effect.gen(function* () {
        const settings = yield* readSettings()
        return yield* Effect.promise(async () => {
          const budget = input.budget ?? settings.injectTokenBudget
          const active = (await readAll(input.scope, input.projectID))
            .filter((entry) => entry.info.status === "active")
            .sort(
              (a, b) =>
                b.info.usage_count - a.info.usage_count ||
                b.info.confidence - a.info.confidence ||
                b.info.last_seen_at.localeCompare(a.info.last_seen_at) ||
                a.info.id.localeCompare(b.info.id),
            )
          if (active.length === 0) return ""
          const lines = [
            "# Active instincts",
            "",
            "Only promoted rules are listed. Search candidates with the `memory` tool (type=instinct).",
            "",
          ]
          let left = budget
          for (const item of active.slice(0, 12)) {
            const line = `- (${item.info.confidence.toFixed(2)}) ${item.info.description} [${item.info.id}]`
            const cost = Token.estimate(line)
            if (cost > left) break
            lines.push(line)
            left -= cost
          }
          for (const item of active.slice(0, 3)) {
            const body = `### ${item.info.id}\n${item.body || item.info.description}`
            const cost = Token.estimate(body)
            if (cost > left) break
            lines.push(body)
            left -= cost
          }
          return lines.join("\n")
        })
      }),
  }
}

export function settingsFromConfig(config: Config.Info): Settings {
  return {
    promoteThreshold: config.instincts?.promote_threshold ?? defaultSettings.promoteThreshold,
    minEvidence: config.instincts?.min_evidence ?? defaultSettings.minEvidence,
    decayDays: config.instincts?.decay_days ?? defaultSettings.decayDays,
    injectTokenBudget: config.instincts?.inject_token_budget ?? defaultSettings.injectTokenBudget,
  }
}

export const layer: Layer.Layer<Service, never, Config.Service> = Layer.effect(
  Service,
  Effect.gen(function* () {
    const config = yield* Config.Service
    // Construction must not touch Config.get: the layer can be built outside an
    // instance scope (AppLayer provided at the test boundary). Every operation
    // resolves settings through this source instead, so a project's own
    // `instincts` config applies to calls made under that project's instance.
    const settings: SettingsSource = () =>
      config.get().pipe(
        Effect.map(settingsFromConfig),
        Effect.catchDefect((defect) =>
          defect instanceof LocalContext.NotFound ? Effect.succeed(defaultSettings) : Effect.die(defect),
        ),
      )
    return Service.of(make(path.join(Global.Path.data, "memory"), settings))
  }),
)

export const defaultLayer = Layer.suspend(() => layer.pipe(Layer.provide(Config.defaultLayer)))
