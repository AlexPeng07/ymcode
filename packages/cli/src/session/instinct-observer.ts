import { Effect } from "effect"
import fs from "fs/promises"
import path from "path"
import { Global } from "../global"
import { Config } from "../config"
import { isMemoryWriteEnabled } from "../memory/write-gate"
import { spawnRef } from "@/actor/spawn-ref"
import * as Session from "./session"
import { checkpointPath } from "./checkpoint-paths"
import type { SessionID } from "./schema"

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

type ObserverState = Record<string, { lastRunAt: number; checkpoints: number }>

function stateFile() {
  return path.join(Global.Path.state, "instinct-observer.json")
}

export async function readObserverState(file = stateFile()): Promise<ObserverState> {
  const text = await fs.readFile(file, "utf8").catch(() => "{}")
  try {
    const parsed = JSON.parse(text) as unknown
    return parsed && typeof parsed === "object" ? (parsed as ObserverState) : {}
  } catch {
    return {}
  }
}

export async function writeObserverState(state: ObserverState, file = stateFile()): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true })
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`
  try {
    await fs.writeFile(tmp, JSON.stringify(state, null, 2))
    await fs.rename(tmp, file)
  } catch (error) {
    await fs.rm(tmp, { force: true }).catch(() => undefined)
    throw error
  }
}

export function observerTask(input: { sessionID: string; projectID: string }) {
  const instincts = path.join(Global.Path.data, "memory", "projects", input.projectID, "instincts")
  return [
    "观察以下检查点，提取最多 3 条候选直觉规则。",
    "",
    `检查点：${checkpointPath(input.sessionID as SessionID)}`,
    `项目 ID：${input.projectID}`,
    `直觉目录：${instincts}`,
    `现有索引：${path.join(Global.Path.data, "memory", "projects", input.projectID, "INSTINCTS.md")}`,
    "",
    "只写候选，不晋升；每条候选必须有 session id、日期和证据。",
    "使用 instinct 工具 operation=write，并传入 projectID。",
  ].join("\n")
}

export function startInstinctObserver(input: {
  sessionID: string
  projectID: string
  model: { providerID: string; modelID: string }
}) {
  return Effect.gen(function* () {
    const config = yield* Config.Service
    const cfg = yield* config.get()
    if (!isMemoryWriteEnabled(cfg)) return
    const settings = cfg.instincts
    const enabled = settings?.enabled !== false
    const capture = settings?.capture ?? "auto"
    const intervalMs = (settings?.observe_interval_minutes ?? 30) * 60_000
    const now = Date.now()

    const state = yield* Effect.promise(() => readObserverState())
    const entry = state[input.sessionID] ?? { lastRunAt: 0, checkpoints: 0 }
    entry.checkpoints += 1
    const observe = shouldObserve({
      enabled,
      capture,
      checkpoints: entry.checkpoints,
      lastRunAt: entry.lastRunAt || undefined,
      now,
      intervalMs,
    })
    if (observe) entry.lastRunAt = now
    state[input.sessionID] = entry
    yield* Effect.promise(() => writeObserverState(state))
    if (!observe) return

    const actor = spawnRef.current
    if (!actor) return
    const session = yield* Session.Service
    const child = yield* session.create({
      parentID: input.sessionID as SessionID,
      title: `instinct-observer: ${input.sessionID}`,
    })
    yield* actor.spawn({
      mode: "subagent",
      sessionID: child.id,
      parentSessionID: input.sessionID as SessionID,
      agentType: "instinct-observer",
      description: `instinct observer for ${input.sessionID}`,
      task: observerTask(input),
      context: "none",
      tools: ["read", "memory", "instinct"],
      model: {
        providerID: input.model.providerID as never,
        modelID: input.model.modelID as never,
      },
      background: true,
    })
  })
}
