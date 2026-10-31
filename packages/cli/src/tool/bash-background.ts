import { Effect, Exit, Scope, Stream } from "effect"
import type { ChildProcessHandle } from "effect/unstable/process/ChildProcessSpawner"
import { Log } from "@/util"

const log = Log.create({ service: "bash-background" })

export const MAX_RUNNING = 5
export const HARD_TIMEOUT_MS = 30 * 60 * 1000
// Per-task output ring: the poller sees the tail, not the whole history.
const RING_CAP = 256 * 1024
const SNAPSHOT_TAIL = 8 * 1024
const KEEP_EXITED = 20

export interface TaskInfo {
  id: string
  command: string
  description: string
  sessionID: string
  startedAt: number
  exited: boolean
  exitCode: number | null
  timedOut: boolean
  stopped: boolean
  totalBytes: number
  truncated: boolean
  /** Tail of the collected output (at most SNAPSHOT_TAIL chars). */
  output: string
}

interface Task {
  info: TaskInfo
  ring: string
  exited: Promise<TaskInfo>
  handle: ChildProcessHandle
  resolve: (info: TaskInfo) => void
  hardTimer: ReturnType<typeof setTimeout>
}

const tasks = new Map<string, Task>()
let counter = 0

function runningCount() {
  let n = 0
  for (const task of tasks.values()) if (!task.info.exited) n++
  return n
}

function evictExited() {
  const exited = [...tasks.values()].filter((task) => task.info.exited)
  while (exited.length > KEEP_EXITED) {
    const oldest = exited.shift()
    if (!oldest) break
    tasks.delete(oldest.info.id)
  }
}

function snapshot(task: Task): TaskInfo {
  const output = task.ring.length > SNAPSHOT_TAIL ? task.ring.slice(-SNAPSHOT_TAIL) : task.ring
  return { ...task.info, output }
}

function markExit(task: Task, code: number | null, reason?: "timeout" | "stopped") {
  if (task.info.exited) return
  clearTimeout(task.hardTimer)
  task.info.exited = true
  task.info.exitCode = code
  if (reason === "timeout") task.info.timedOut = true
  if (reason === "stopped") task.info.stopped = true
  const snap = snapshot(task)
  task.resolve(snap)
  notify(snap)
  evictExited()
}

/** Optional completion notifier; wired by the session layer to wake the model. */
let notifier: ((info: TaskInfo) => void) | undefined

export function setNotifier(fn: ((info: TaskInfo) => void) | undefined) {
  notifier = fn
}

function notify(info: TaskInfo) {
  if (!notifier) return
  try {
    notifier(info)
  } catch (err) {
    log.error("background task notifier failed", { id: info.id, error: String(err) })
  }
}

export class TooManyRunningError {
  readonly _tag = "TooManyRunningError"
  constructor(readonly running: number) {}
}

export function start(input: {
  spawn: Effect.Effect<ChildProcessHandle, unknown, Scope.Scope>
  command: string
  description: string
  sessionID: string
}): Effect.Effect<string, TooManyRunningError | unknown> {
  return Effect.gen(function* () {
    const running = runningCount()
    if (running >= MAX_RUNNING) return yield* Effect.fail(new TooManyRunningError(running))

    // Registry-owned lifetime: a scope that is never closed. The handle's
    // kill() and the hard timeout own the process instead of scope exit.
    const scope = yield* Scope.make()
    // If spawning itself fails (unknown command, spawn error) nothing owns the
    // scope — close it here so its finalizers still run.
    const handle = yield* input.spawn.pipe(
      Effect.provideService(Scope.Scope, scope),
      Effect.onError((cause) => Scope.close(scope, Exit.die(cause))),
    )
    const id = `bg-${++counter}`
    let resolve: (info: TaskInfo) => void = () => {}
    const task: Task = {
      info: {
        id,
        command: input.command,
        description: input.description,
        sessionID: input.sessionID,
        startedAt: Date.now(),
        exited: false,
        exitCode: null,
        timedOut: false,
        stopped: false,
        totalBytes: 0,
        truncated: false,
        output: "",
      },
      ring: "",
      exited: new Promise<TaskInfo>((res) => {
        resolve = res
      }),
      handle,
      resolve,
      hardTimer: setTimeout(() => {
        void handle
          .kill({ forceKillAfter: "3 seconds" })
          .pipe(Effect.runPromiseExit)
          .then(() => {})
        markExit(task, null, "timeout")
        log.warn("background task hit hard timeout, killed", { id, command: input.command })
      }, HARD_TIMEOUT_MS),
    }
    tasks.set(id, task)

    // Collector: appended to the ring for as long as the process streams.
    // A plain fork (no scope) on purpose — it must outlive the tool call.
    yield* Stream.runForEach(handle.all, (chunk) =>
      Effect.sync(() => {
        const text = Buffer.from(chunk).toString("utf8")
        task.info.totalBytes += text.length
        task.ring += text
        if (task.ring.length > RING_CAP) {
          task.ring = task.ring.slice(-RING_CAP)
          task.info.truncated = true
        }
      }),
    ).pipe(
      Effect.catchCause((cause) =>
        Effect.sync(() => log.error("background task output stream failed", { id, error: String(cause) })),
      ),
      Effect.forkDetach,
    )

    yield* handle.exitCode.pipe(
      Effect.flatMap((code) => Effect.sync(() => markExit(task, code))),
      Effect.catchCause((cause) =>
        Effect.sync(() => {
          log.error("background task exit watch failed", { id, error: String(cause) })
          markExit(task, null)
        }),
      ),
      Effect.forkDetach,
    )

    log.info("background task started", { id, command: input.command, sessionID: input.sessionID })
    return id
  })
}

export function get(id: string): Effect.Effect<TaskInfo, Error> {
  return Effect.suspend(() => {
    const task = tasks.get(id)
    if (!task) {
      const known = Array.from(tasks.keys()).join(", ") || "none"
      return Effect.fail(new Error(`unknown background task ${id}; known tasks: ${known}`))
    }
    return Effect.succeed(snapshot(task))
  })
}

/** Wait up to `ms` for exit (0 returns the current snapshot immediately). */
export function wait(id: string, ms: number): Effect.Effect<TaskInfo, Error> {
  return Effect.flatMap(get(id), (info) => {
    if (info.exited || ms <= 0) return Effect.succeed(info)
    const task = tasks.get(id)!
    return Effect.race(
      Effect.promise(() => task.exited),
      Effect.sleep(`${ms} millis`).pipe(Effect.map(() => snapshot(task))),
    )
  })
}

export function stop(id: string): Effect.Effect<{ info: TaskInfo; stoppedNow: boolean }, Error> {
  return Effect.gen(function* () {
    const task = tasks.get(id)
    if (!task) {
      const known = Array.from(tasks.keys()).join(", ") || "none"
      return yield* Effect.fail(new Error(`unknown background task ${id}; known tasks: ${known}`))
    }
    if (task.info.exited) return { info: snapshot(task), stoppedNow: false }
    // Mark first: the exit watcher races the kill and would otherwise win
    // the label with the kill's exit code instead of the user's intent.
    markExit(task, null, "stopped")
    yield* task.handle.kill({ forceKillAfter: "3 seconds" }).pipe(Effect.orDie)
    return { info: snapshot(task), stoppedNow: true }
  })
}

/** For tests and diagnostics. */
export function list(): TaskInfo[] {
  return Array.from(tasks.values(), (task) => ({ ...snapshot(task), output: "" }))
}

/** Best-effort cleanup (tests): kills stragglers and waits for the handles. */
export async function reset(): Promise<void> {
  const kills: Promise<unknown>[] = []
  for (const task of tasks.values()) {
    if (!task.info.exited) {
      clearTimeout(task.hardTimer)
      markExit(task, null, "stopped")
      kills.push(
        Effect.runPromiseExit(task.handle.kill({ forceKillAfter: "1 seconds" }))
          .then(() => {})
          .catch(() => {}),
      )
    }
  }
  await Promise.all(kills)
  // Windows releases child handles asynchronously; give rm a fighting chance.
  await new Promise((resolve) => setTimeout(resolve, 200))
  tasks.clear()
  counter = 0
  notifier = undefined
}
