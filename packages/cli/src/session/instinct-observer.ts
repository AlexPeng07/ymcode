import { Cause, Effect } from "effect"
import { Deferred } from "effect"
import fs from "fs/promises"
import path from "path"
import { Global } from "../global"
import { Config } from "../config"
import { isMemoryWriteEnabled } from "../memory/write-gate"
import { spawnRef } from "@/actor/spawn-ref"
import * as Session from "./session"
import { checkpointPath } from "./checkpoint-paths"
import type { SessionID } from "./schema"
import { Log } from "../util"

const log = Log.create({ service: "session.instinct-observer" })

// Headless `ymcode run` would otherwise exit right after the checkpoint-writer
// drain, killing a freshly spawned observer mid-LLM-loop (its candidate write
// lands as `pending` and never executes). bootstrap awaits this set — bounded —
// so a fired observer can finish writing its candidates before teardown.
const pendingObservers = new Set<Promise<unknown>>()

export interface ObserverSlot {
  /** Resolve the reserved drain slot. One settle per slot. */
  settle(): void
}

/**
 * Reserve a drain slot synchronously so the bootstrap drain can never race
 * past an observer that is about to spawn. The watcher fiber in checkpoint.ts
 * and drainWriters resume on the same writer-outcome Deferred; without a slot
 * the drain observes an empty pendingObservers set while the watcher is still
 * in its async prologue (state file, session.create, actor.spawn) and exits
 * before the real outcome promise is registered.
 */
export function reserveObserverSlot(): ObserverSlot {
  let settle!: () => void
  const gate = new Promise<void>((resolve) => (settle = resolve))
  pendingObservers.add(gate)
  log.info("observer slot reserved", { size: pendingObservers.size })
  return {
    settle: () => {
      // Remove BEFORE resolving: nothing else deletes the gate, and the drain
      // polls pendingObservers.size — a settled-but-remaining gate would pin
      // the set non-empty forever and hold every shutdown for the full timeout.
      pendingObservers.delete(gate)
      log.info("observer slot settled", { size: pendingObservers.size })
      settle()
    },
  }
}

/**
 * Resolves when every observer spawned by this process has reached a terminal
 * outcome, or after `timeoutMs` (mirrors the checkpoint-writer drain cap).
 *
 * Quiet-period semantics: slots are settled from multiple places (Effect
 * finalizers AND a promise backstop on the writer outcome), and an observer's
 * outcome promise is registered slightly AFTER its slot settles — the watcher
 * fiber resumes on the same writer Deferred and still has to run its async
 * prologue. So instead of "exit when the set is empty", wait for `quietMs`
 * without any pending slot before giving up; any late registration resets the
 * clock and keeps the process alive until the observer settles.
 */
export async function drainInstinctObservers(timeoutMs = 120_000, quietMs = 5_000): Promise<void> {
  const start = Date.now()
  const deadline = start + timeoutMs
  let lastActive = start
  while (Date.now() < deadline) {
    if (pendingObservers.size > 0) {
      lastActive = Date.now()
    } else if (Date.now() - lastActive >= quietMs) {
      break
    }
    await Bun.sleep(200)
  }
  log.info("observer drain complete", {
    pending: pendingObservers.size,
    waitedMs: Date.now() - start,
  })
}

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
  /** Drain slot reserved by the caller; settled when this Effect exits. */
  slot?: ObserverSlot
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
    const spawned = yield* actor.spawn({
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
    log.info("instinct-observer spawned", { session: child.id, parent: input.sessionID })
    try {
      // Track the observer's terminal outcome so bootstrap's drain can wait for
      // it. The Deferred resolves on success/failure/cancel; a hung observer is
      // abandoned by the drain timeout instead of hanging the process exit.
      const tracked = Effect.runPromise(Deferred.await(spawned.outcome))
        .catch((error) => {
          log.warn("instinct-observer outcome await failed", { error: String(error) })
          return undefined
        })
        .finally(() => {
          log.info("instinct-observer settled", { session: child.id })
          pendingObservers.delete(tracked)
        })
      pendingObservers.add(tracked)
    } catch (error) {
      log.error("instinct-observer tracking failed", { error: String(error) })
    }
  }).pipe(
    // Settle the reserved drain slot as soon as THIS effect exits — success,
    // early return, failure, or interruption. By this point any spawned
    // observer's outcome promise is already registered in pendingObservers.
    // Do NOT rely on the caller's watcher fiber to settle the slot: it can be
    // interrupted during teardown before its own ensuring finalizer runs,
    // which would hold the bootstrap drain for the full timeout.
    Effect.onExit(() => Effect.sync(() => input.slot?.settle())),
  )
}
