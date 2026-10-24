import { afterAll, afterEach, describe, expect } from "bun:test"
import { Effect, Layer } from "effect"
import path from "path"
import { provideTmpdirInstance } from "../fixture/fixture"
import { testEffect } from "../lib/effect"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"

const disableDefault = process.env.YMCODE_DISABLE_DEFAULT_PLUGINS
process.env.YMCODE_DISABLE_DEFAULT_PLUGINS = "1"

const { Plugin } = await import("../../src/plugin/index")
const { Instance } = await import("../../src/project/instance")

const it = testEffect(Layer.mergeAll(Plugin.defaultLayer, CrossSpawnSpawner.defaultLayer))

afterEach(async () => {
  await Instance.disposeAll()
})

afterAll(() => {
  if (disableDefault === undefined) {
    delete process.env.YMCODE_DISABLE_DEFAULT_PLUGINS
    return
  }
  process.env.YMCODE_DISABLE_DEFAULT_PLUGINS = disableDefault
})

// Fixture scripts run under the test runtime binary; they read the stdin JSON
// payload so the tests also pin the payload shape hooks receive.
const BLOCK_SCRIPT = [
  "const chunks = []",
  "process.stdin.on('data', (c) => chunks.push(c))",
  "process.stdin.on('end', () => {",
  "  const payload = JSON.parse(Buffer.concat(chunks).toString('utf8'))",
  "  process.stderr.write(`synthetic block reason for ${payload.tool}`)",
  "  process.exit(2)",
  "})",
].join("\n")

const APPEND_SCRIPT = [
  "const chunks = []",
  "process.stdin.on('data', (c) => chunks.push(c))",
  "process.stdin.on('end', () => {",
  "  const payload = JSON.parse(Buffer.concat(chunks).toString('utf8'))",
  "  process.stdout.write(`validated:${payload.tool}:${payload.args.pattern ?? 'no-pattern'}`)",
  "})",
].join("\n")

function configWithHooks(dir: string, beforeMatch: string | undefined) {
  const quoted = (file: string) => `"${process.execPath}" "${path.join(dir, file)}"`
  return {
    hooks: {
      "tool.execute.before": [{ ...(beforeMatch ? { match: beforeMatch } : {}), command: quoted("block.js") }],
      "tool.execute.after": [{ command: quoted("append.js") }],
    },
  }
}

describe("config-declared shell hooks", () => {
  it.live(
    "before-hook blocks a matching tool call and passes the payload on stdin",
    () =>
      provideTmpdirInstance((dir) =>
        Effect.gen(function* () {
          yield* Effect.promise(() => Bun.write(path.join(dir, "block.js"), BLOCK_SCRIPT))
          yield* Effect.promise(() => Bun.write(path.join(dir, "append.js"), APPEND_SCRIPT))
          yield* Effect.promise(() =>
            Bun.write(path.join(dir, "ymcode.json"), JSON.stringify(configWithHooks(dir, "bash"))),
          )

          const plugin = yield* Plugin.Service
          yield* plugin.init()

          const output: { args: unknown; cancel?: boolean; cancelReason?: string } = { args: { command: "git push" } }
          yield* plugin.trigger(
            "tool.execute.before",
            { tool: "bash", sessionID: "ses_synthetic", callID: "call_synthetic" },
            output,
          )
          expect(output.cancel).toBe(true)
          expect(output.cancelReason).toContain("synthetic block reason for bash")
        }),
      ),
    30_000,
  )

  it.live(
    "before-hook skips tools that do not match",
    () =>
      provideTmpdirInstance((dir) =>
        Effect.gen(function* () {
          yield* Effect.promise(() => Bun.write(path.join(dir, "block.js"), BLOCK_SCRIPT))
          yield* Effect.promise(() => Bun.write(path.join(dir, "append.js"), APPEND_SCRIPT))
          yield* Effect.promise(() =>
            Bun.write(path.join(dir, "ymcode.json"), JSON.stringify(configWithHooks(dir, "bash"))),
          )

          const plugin = yield* Plugin.Service
          yield* plugin.init()

          const output: { args: unknown; cancel?: boolean; cancelReason?: string } = {
            args: { filePath: "/tmp/example", content: "x" },
          }
          yield* plugin.trigger(
            "tool.execute.before",
            { tool: "edit", sessionID: "ses_synthetic", callID: "call_synthetic" },
            output,
          )
          expect(output.cancel).toBeUndefined()
        }),
      ),
    30_000,
  )

  it.live(
    "after-hook appends stdout to the tool result",
    () =>
      provideTmpdirInstance((dir) =>
        Effect.gen(function* () {
          yield* Effect.promise(() => Bun.write(path.join(dir, "block.js"), BLOCK_SCRIPT))
          yield* Effect.promise(() => Bun.write(path.join(dir, "append.js"), APPEND_SCRIPT))
          yield* Effect.promise(() =>
            Bun.write(path.join(dir, "ymcode.json"), JSON.stringify(configWithHooks(dir, undefined))),
          )

          const plugin = yield* Plugin.Service
          yield* plugin.init()

          const output = { title: "grep", output: "synthetic result", metadata: {} }
          yield* plugin.trigger(
            "tool.execute.after",
            { tool: "grep", sessionID: "ses_synthetic", callID: "call_synthetic", args: { pattern: "marker" } },
            output,
          )
          expect(output.output).toContain("synthetic result")
          expect(output.output).toContain("[hook] validated:grep:marker")
        }),
      ),
    30_000,
  )
})
