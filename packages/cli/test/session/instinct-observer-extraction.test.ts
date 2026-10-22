/**
 * Deterministic instinct-observer extraction smoke: a scripted OpenAI-compatible
 * SSE server returns an `instinct` tool call, the real tool pipeline executes it,
 * and a candidate file lands on disk. No external provider or network is involved.
 *
 * Run:
 *   cd packages/cli && bun test test/session/instinct-observer-extraction.test.ts
 */
import { expect } from "bun:test"
import { Effect, Layer } from "effect"
import { Bus } from "../../src/bus"
import type { Config } from "../../src/config"
import * as CrossSpawnSpawner from "../../src/effect/cross-spawn-spawner"
import { Permission } from "../../src/permission"
import { Session } from "../../src/session"
import { SessionPrompt } from "../../src/session/prompt"
import { provideTmpdirInstance } from "../fixture/fixture"
import { testEffect } from "../lib/effect"
import { startScriptedLLMServer, textStopResponse, toolCallsResponse } from "../lib/scripted-llm-server"
import { Instance } from "../../src/project/instance"
import { Global } from "../../src/global"
import * as Instinct from "../../src/memory/instinct-service"
import { observerTask } from "../../src/session/instinct-observer"
import path from "path"

const it = testEffect(
  Layer.mergeAll(
    SessionPrompt.defaultLayer,
    Session.defaultLayer,
    CrossSpawnSpawner.defaultLayer,
    Permission.defaultLayer,
    Bus.defaultLayer,
  ),
)

function config(origin: string): Config.Info {
  return {
    enabled_providers: ["test"],
    model: "test/model",
    provider: {
      test: {
        npm: "@ai-sdk/openai-compatible",
        env: [],
        options: { apiKey: "test-key", baseURL: `${origin}/v1` },
        models: {
          model: {
            name: "Test",
            tool_call: true,
            limit: { context: 32000, output: 2000 },
            modalities: { input: ["text"], output: ["text"] },
          },
        },
      },
    },
    agent: { build: { model: "test/model" } },
    permission: { edit: "allow", bash: "allow" },
    lsp: false,
    formatter: false,
  }
}

it.live(
  "writes a candidate from a scripted observer tool call",
  () =>
    Effect.gen(function* () {
      const server = startScriptedLLMServer([
        {
          lines: toolCallsResponse([
            {
              id: "observer-candidate",
              name: "instinct",
              args: JSON.stringify({
                operation: "write",
                description: "提交前必须跑 typecheck",
                source: "correction",
                confidence: 0.9,
                evidence: [
                  {
                    session: "ses_observer_test",
                    date: "2026-10-21",
                    quote: "以后提交前必须跑 typecheck",
                  },
                ],
                body: "用户在会话中明确要求提交前执行 typecheck。",
              }),
            },
          ]),
        },
        { lines: textStopResponse("已写入候选。") },
      ])
      yield* Effect.addFinalizer(() => Effect.promise(() => server.stop()))

      yield* provideTmpdirInstance(
        (dir) =>
          Effect.gen(function* () {
            const sessions = yield* Session.Service
            const prompt = yield* SessionPrompt.Service
            const projectID = Instance.project.id
            const session = yield* sessions.create({
              title: "Instinct observer extraction",
              permission: [{ permission: "*", pattern: "*", action: "allow" }],
            })

            yield* prompt.prompt({
              sessionID: session.id,
              agent: "instinct-observer",
              parts: [{ type: "text", text: observerTask({ sessionID: session.id, projectID }) }],
            })

            const messages = yield* sessions.messages({ sessionID: session.id })
            const tool = messages.flatMap((message) => message.parts).find((part) => part.type === "tool")
            expect(tool?.type).toBe("tool")
            if (tool?.type === "tool") expect(tool.state.status).toBe("completed")

            const items = yield* Instinct.make(path.join(Global.Path.data, "memory")).list({
              scope: "projects",
              projectID,
            })
            expect(items).toHaveLength(1)
            expect(items[0]?.status).toBe("candidate")
            expect(items[0]?.description).toBe("提交前必须跑 typecheck")
            expect(items[0]?.confidence).toBe(0.9)
            expect(items[0]?.source).toBe("correction")
            expect(items[0]?.evidence[0]?.session).toBe("ses_observer_test")

            expect(server.captures.length).toBeGreaterThanOrEqual(2)
            expect(JSON.stringify(server.captures[0]?.messages)).toContain("观察以下检查点")
            expect(JSON.stringify(server.captures[1]?.messages)).toContain("提交前必须跑 typecheck")
            expect(yield* Effect.promise(() => Bun.file(path.join(dir, "ymcode.json")).exists())).toBe(true)
          }),
        {
          git: true,
          config: config(server.origin),
        },
      )
    }),
  30000,
)
