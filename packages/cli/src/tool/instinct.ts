import { Effect, Option } from "effect"
import path from "path"
import z from "zod"
import * as Instinct from "@/memory/instinct-service"
import { Config } from "@/config"
import { Global } from "@/global"
import { Instance } from "@/project/instance"
import { ProjectID } from "@/project/schema"
import { memoryProjectID } from "@/memory/project-id"
import * as Tool from "./tool"

type Metadata = {
  count?: number
  status?: string
  confidence?: number
  id?: string
  appended?: boolean
}

const parameters = z.object({
  operation: z.enum(["list", "get", "write", "promote", "demote", "forget", "review"]),
  id: z.string().optional().describe("Instinct id (ins_...)"),
  description: z.string().optional().describe("One-line rule, at most 200 characters"),
  source: z.enum(["correction", "repetition", "decision"]).optional(),
  confidence: z.number().min(0).max(1).optional(),
  evidence: z
    .array(z.object({ session: z.string(), date: z.string(), quote: z.string().optional() }))
    .optional()
    .describe("Evidence for a candidate: session id, date, optional verbatim quote"),
  body: z.string().optional().describe("Details, examples and counterexamples"),
  status: z.enum(["candidate", "active", "retired"]).optional(),
  scope: z.enum(["global", "projects"]).optional(),
  projectID: z.string().optional(),
  force: z.boolean().optional(),
  reason: z.string().optional(),
})

function currentProjectID(): string {
  try {
    const current = Instance.current
    if (!current) return ProjectID.global
    return memoryProjectID(current.project, current.directory)
  } catch {
    return ProjectID.global
  }
}

export const InstinctTool = Tool.define(
  "instinct",
  Effect.gen(function* () {
    return {
      description: [
        "Manage instinct rules: list/get candidates, write evidence-backed candidates, promote/demote/forget, review with decay.",
        "Never promote without evidence. Never forget without explicit user confirmation (force=true).",
      ].join(" "),
      parameters,
      execute: (args: z.infer<typeof parameters>): Effect.Effect<{
          title: string
          output: string
          metadata: Metadata
        }> =>
        Effect.gen(function* () {
          const config = yield* Effect.serviceOption(Config.Service)
          const cfg = Option.isSome(config)
            ? yield* config.value.get().pipe(Effect.catchCause(() => Effect.succeed({} as Config.Info)))
            : ({} as Config.Info)
          const instinct = Instinct.make(path.join(Global.Path.data, "memory"), Instinct.settingsFromConfig(cfg))
          const projectID = args.projectID ?? currentProjectID()
          const scope = args.scope ?? (projectID === ProjectID.global ? "global" : "projects")

          if (args.operation === "list") {
            const items = yield* instinct.list({ scope, projectID, status: args.status })
            return {
              title: `Instincts: ${items.length}`,
              output:
                items.map((item) => `${item.id}\t${item.status}\t${item.confidence.toFixed(2)}\t${item.description}`).join("\n") ||
                "No instincts.",
              metadata: { count: items.length },
            }
          }

          if (args.operation === "get") {
            if (!args.id) throw new Error("id is required")
            const item = yield* instinct.get({ scope, projectID, id: args.id })
            return {
              title: item.info.id,
              output: `# ${item.info.description}\n\n${item.body}`,
              metadata: { status: item.info.status, confidence: item.info.confidence },
            }
          }

          if (args.operation === "write") {
            if (!args.description || !args.source || !args.evidence?.length) {
              throw new Error("write requires description, source and evidence")
            }
            const info = yield* instinct.write({
              scope,
              projectID,
              id: args.id,
              description: args.description,
              source: args.source,
              confidence: args.confidence ?? 0.4,
              evidence: args.evidence,
              body: args.body ?? "",
            })
            return {
              title: `Wrote ${info.id}`,
              output: `${info.id} (${info.status}, ${info.confidence.toFixed(2)})`,
              metadata: { id: info.id },
            }
          }

          if (args.operation === "promote") {
            if (!args.id) throw new Error("id is required")
            const result = yield* instinct.promote({ scope, projectID, id: args.id, force: args.force })
            return {
              title: `Promoted ${args.id}`,
              output: `${args.id} -> active; appended=${result.appended}`,
              metadata: { appended: result.appended },
            }
          }

          if (args.operation === "demote") {
            if (!args.id) throw new Error("id is required")
            const info = yield* instinct.demote({
              scope,
              projectID,
              id: args.id,
              reason: args.reason ?? "user correction",
            })
            return {
              title: `Demoted ${args.id}`,
              output: `${info.id} -> ${info.status} (${info.confidence.toFixed(2)})`,
              metadata: { status: info.status, confidence: info.confidence },
            }
          }

          if (args.operation === "forget") {
            if (!args.id) throw new Error("id is required")
            if (!args.force) throw new Error("forget requires force=true and explicit user confirmation")
            yield* instinct.forget({ scope, projectID, id: args.id })
            return { title: `Forgot ${args.id}`, output: "deleted", metadata: {} }
          }

          const result = yield* instinct.review({ scope, projectID })
          return {
            title: "Instinct review",
            output: `promoted=${result.promoted.join(",") || "none"}; decayed=${result.decayed}`,
            metadata: { count: result.promoted.length },
          }
        }).pipe(Effect.orDie),
    }
  }),
)
