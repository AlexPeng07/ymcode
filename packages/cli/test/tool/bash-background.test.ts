import { afterEach, describe, expect, test } from "bun:test"
import { Effect, Layer, ManagedRuntime } from "effect"
import path from "path"
import { Shell } from "../../src/shell/shell"
import { BashTool } from "../../src/tool/bash"
import * as Background from "../../src/tool/bash-background"
import { Instance } from "../../src/project/instance"
import { tmpdir } from "../fixture/fixture"
import { SessionID, MessageID } from "../../src/session/schema"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"
import { AppFileSystem } from "@ymcode/shared/filesystem"
import { Plugin } from "../../src/plugin"
import { Git } from "../../src/git"
import { Agent } from "../../src/agent/agent"
import { Truncate } from "../../src/tool"

const runtime = ManagedRuntime.make(
  Layer.mergeAll(
    CrossSpawnSpawner.defaultLayer,
    AppFileSystem.defaultLayer,
    Plugin.defaultLayer,
    Truncate.defaultLayer,
    Agent.defaultLayer,
    Git.defaultLayer,
  ),
)

function initBash() {
  return runtime.runPromise(BashTool.pipe(Effect.flatMap((info) => info.init())))
}

Shell.acceptable.reset()

const ctx = {
  sessionID: SessionID.make("ses_bg_test"),
  messageID: MessageID.make(""),
  callID: "",
  agent: "build",
  abort: AbortSignal.any([]),
  messages: [],
  metadata: () => Effect.void,
  ask: () => Effect.void,
}

const quote = (text: string) => `"${text}"`
const bin = quote(process.execPath.replaceAll("\\", "/"))
const PS = new Set(["pwsh", "powershell"])
const shellName = () => Shell.name(Shell.acceptable())

// Fixture scripts keep quoting shell-proof: only the binary and script paths
// need quoting, the JS lives in a file.
const MARKER_SCRIPT = [
  'console.log("EARLY")',
  'setTimeout(() => { console.log("MARKER"); process.exit(3) }, 400)',
].join("\n")
const FOREVER_SCRIPT = ['console.log("IDLE-LOOP")', "setInterval(() => {}, 1000)"].join("\n")

const commandFor = (file: string) => {
  const text = `${bin} ${quote(file.replaceAll("\\", "/"))}`
  return PS.has(shellName()) ? `& ${text}` : text
}

afterEach(async () => {
  await Background.reset()
  await Instance.disposeAll()
})

describe("bash background tasks", () => {
  test("starts in background, polls output, and reports the exit code", async () => {
    await using tmp = await tmpdir({ git: true })
    await Bun.write(path.join(tmp.path, "marker.js"), MARKER_SCRIPT)
    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const info = await initBash()

        const start = await runtime.runPromise(
          info.execute(
            { command: commandFor(path.join(tmp.path, "marker.js")), description: "Runs marker script in background", run_in_background: true },
            ctx,
          ),
        )
        expect(start.output).toContain("Background task bg-1 started")
        // Status is timing-dependent (a short task may finish inside the
        // 1.5s initial-output window); the id and early output are the contract.
        expect(start.output).toContain("bg-1")
        expect(start.output).toContain("EARLY")

        // wait_seconds blocks until exit (400ms task, 10s budget).
        const done = await runtime.runPromise(
          info.execute({ command: "ignored", description: "Polls background task", bg: { operation: "output", id: "bg-1", wait_seconds: 10 } }, ctx),
        )
        expect(done.output).toContain("exited (code 3)")
        expect(done.output).toContain("MARKER")
      },
    })
  }, 30_000)

  test("stop terminates a running task and is idempotent", async () => {
    await using tmp = await tmpdir({ git: true })
    await Bun.write(path.join(tmp.path, "forever.js"), FOREVER_SCRIPT)
    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const info = await initBash()

        const start = await runtime.runPromise(
          info.execute(
            { command: commandFor(path.join(tmp.path, "forever.js")), description: "Runs forever in background", run_in_background: true },
            ctx,
          ),
        )
        expect(start.output).toContain("Status: running")

        const stopped = await runtime.runPromise(
          info.execute({ command: "ignored", description: "Stops background task", bg: { operation: "stop", id: "bg-1" } }, ctx),
        )
        expect(stopped.output).toContain("stopped")
        expect(stopped.output).toContain("IDLE-LOOP")

        const again = await runtime.runPromise(
          info.execute({ command: "ignored", description: "Stops background task again", bg: { operation: "stop", id: "bg-1" } }, ctx),
        )
        expect(again.output).toContain("already exited")
      },
    })
  }, 30_000)

  test("unknown background id errors with the known task list", async () => {
    await using tmp = await tmpdir({ git: true })
    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const info = await initBash()
        const result = await runtime
          .runPromise(info.execute({ command: "ignored", description: "Polls missing task", bg: { operation: "output", id: "bg-404" } }, ctx))
          .catch((error: unknown) => error)
        expect(String(result)).toContain("unknown background task bg-404")
      },
    })
  }, 30_000)

  test("enforces the concurrent-task cap with an actionable message", async () => {
    await using tmp = await tmpdir({ git: true })
    await Bun.write(path.join(tmp.path, "forever.js"), FOREVER_SCRIPT)
    const forever = commandFor(path.join(tmp.path, "forever.js"))
    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const info = await initBash()
        for (let i = 0; i < Background.MAX_RUNNING; i++) {
          await runtime.runPromise(
            info.execute({ command: forever, description: `Runs task ${i + 1}`, run_in_background: true }, ctx),
          )
        }
        const sixth = await runtime
          .runPromise(info.execute({ command: forever, description: "Runs task six", run_in_background: true }, ctx))
          .then(() => "unexpected-success")
          .catch((error: unknown) => String(error))
        expect(sixth).toContain("cannot start background task")
        expect(sixth).toContain(`max ${Background.MAX_RUNNING}`)

        // Kill through the public stop path (it awaits the kill) so Windows
        // releases the child handles before the tmpdir is removed.
        for (const task of Background.list()) {
          if (!task.exited) await runtime.runPromise(Background.stop(task.id).pipe(Effect.orDie))
        }
      },
    })
  }, 60_000)
})
