import { Context, Effect, Exit, Layer } from "effect"
import fs from "fs/promises"
import path from "path"
import { ulid } from "ulid"
import { Global } from "../global"
import { Config } from "../config"
import { Token } from "@/util"
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
  }>
  readonly demote: (input: { scope: Scope; projectID: string; id: string; reason: string }) => Effect.Effect<Info>
  readonly forget: (input: { scope: Scope; projectID: string; id: string }) => Effect.Effect<void>
  readonly decay: (input: { scope: Scope; projectID: string }) => Effect.Effect<number>
  readonly review: (input: { scope: Scope; projectID: string }) => Effect.Effect<{ promoted: string[]; decayed: number }>
  readonly renderInjection: (input: { scope: Scope; projectID: string; budget?: number }) => Effect.Effect<string>
}

export class Service extends Context.Service<Service, Interface>()("@ymcode/Instinct") {}

const ID_RE = /^ins_[a-z0-9]{8,}$/
const DAY_MS = 86_400_000
const MEMORY_MAX_BYTES = 10_000

type Stored = { info: Info; body: string; file: string }

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim()
}

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

export function make(root: string, settings: Settings = defaultSettings): Interface {
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
      const existing = (await readAll(input.scope, input.projectID)).find((entry) => entry.info.id === id)?.info
      const evidence = [...(existing?.evidence ?? []), ...input.evidence].filter(
        (entry, index, all) =>
          all.findIndex((candidate) => candidate.session === entry.session && candidate.date === entry.date) === index,
      )
      const info = Info.parse({
        id,
        description: input.description.trim(),
        status: existing?.status ?? "candidate",
        confidence: clampConfidence(input.confidence),
        evidence,
        source: input.source,
        created_at: existing?.created_at ?? now,
        updated_at: now,
        last_seen_at: now,
        contradictions: existing?.contradictions ?? 0,
      })
      await fs.mkdir(dir(input.scope, input.projectID), { recursive: true })
      await fs.writeFile(path.join(dir(input.scope, input.projectID), `${id}.md`), serialize(info, input.body))
      await rebuildIndex(input.scope, input.projectID)
      return info
    })

  const promote = (input: { scope: Scope; projectID: string; id: string; force?: boolean }) =>
    Effect.promise(async () => {
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
      return { info, appended }
    })

  const decay = (input: { scope: Scope; projectID: string }) =>
    Effect.promise(async () => {
      const items = await readAll(input.scope, input.projectID)
      let changed = 0
      for (const item of items) {
        if (item.info.status === "retired") continue
        const days = (Date.now() - Date.parse(item.info.last_seen_at)) / DAY_MS
        if (days <= settings.decayDays) continue
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

  return {
    list,
    get,
    write,
    promote,
    decay,

    demote: (input) =>
      Effect.promise(async () => {
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
      }),

    forget: (input) =>
      Effect.promise(async () => {
        if (!ID_RE.test(input.id)) throw new Error("invalid instinct id")
        await fs.rm(path.join(dir(input.scope, input.projectID), `${input.id}.md`), { force: true })
        await rebuildIndex(input.scope, input.projectID)
      }),

    review: (input) =>
      Effect.gen(function* () {
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
      Effect.promise(async () => {
        const budget = input.budget ?? settings.injectTokenBudget
        const active = (await readAll(input.scope, input.projectID))
          .filter((entry) => entry.info.status === "active")
          .sort((a, b) => b.info.confidence - a.info.confidence || a.info.id.localeCompare(b.info.id))
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
      }),
  }
}

function settingsFromConfig(config: Config.Info): Settings {
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
    const cfg = yield* config.get()
    return Service.of(make(path.join(Global.Path.data, "memory"), settingsFromConfig(cfg)))
  }),
)

export const defaultLayer = Layer.suspend(() => layer.pipe(Layer.provide(Config.defaultLayer)))
