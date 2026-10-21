import { cmd } from "./cmd"
import { Instance } from "../../project/instance"
import { ProjectID } from "../../project/schema"
import { AppRuntime } from "@/effect/app-runtime"
import * as Instinct from "../../memory/instinct-service"

type Context = { scope: "global" | "projects"; projectID: string }

async function withInstinct(fn: (ctx: Context) => Promise<void>) {
  await Instance.provide({
    directory: process.cwd(),
    async fn() {
      const projectID = Instance.project.id
      await fn({ scope: projectID === ProjectID.global ? "global" : "projects", projectID })
    },
  })
}

const ListCommand = cmd({
  command: "list",
  describe: "列出直觉规则",
  builder: (yargs) => yargs.option("status", { type: "string", choices: ["candidate", "active", "retired"] }),
  handler: async (args) => {
    await withInstinct(async (ctx) => {
      const items = await AppRuntime.runPromise(
        Instinct.Service.use((service) => service.list({ ...ctx, status: args.status as never })),
      )
      for (const item of items) {
        console.log(`${item.id}\t${item.status}\t${item.confidence.toFixed(2)}\t${item.description}`)
      }
    })
  },
})

const PromoteCommand = cmd({
  command: "promote <id>",
  describe: "把直觉规则晋升到 MEMORY.md",
  builder: (yargs) => yargs.option("force", { type: "boolean", default: false }),
  handler: async (args) => {
    await withInstinct(async (ctx) => {
      const result = await AppRuntime.runPromise(
        Instinct.Service.use((service) =>
          service.promote({ ...ctx, id: args.id as string, force: args.force }),
        ),
      )
      console.log(`${result.info.id} active; appended=${result.appended}`)
    })
  },
})

const DemoteCommand = cmd({
  command: "demote <id>",
  describe: "降级直觉规则并记录矛盾",
  builder: (yargs) => yargs.option("reason", { type: "string", default: "user correction" }),
  handler: async (args) => {
    await withInstinct(async (ctx) => {
      const info = await AppRuntime.runPromise(
        Instinct.Service.use((service) =>
          service.demote({ ...ctx, id: args.id as string, reason: args.reason }),
        ),
      )
      console.log(`${info.id} -> ${info.status} (${info.confidence.toFixed(2)})`)
    })
  },
})

const ForgetCommand = cmd({
  command: "forget <id>",
  describe: "删除直觉规则（必须显式确认）",
  builder: (yargs) => yargs.option("yes", { type: "boolean", default: false }),
  handler: async (args) => {
    if (!args.yes) {
      console.error("refusing to delete without --yes")
      process.exitCode = 1
      return
    }
    await withInstinct(async (ctx) => {
      await AppRuntime.runPromise(Instinct.Service.use((service) => service.forget({ ...ctx, id: args.id as string })))
      console.log(`forgot ${args.id}`)
    })
  },
})

const ReviewCommand = cmd({
  command: "review",
  describe: "衰减并晋升满足阈值的直觉规则",
  handler: async () => {
    await withInstinct(async (ctx) => {
      const result = await AppRuntime.runPromise(Instinct.Service.use((service) => service.review(ctx)))
      console.log(`promoted=${result.promoted.join(",") || "none"}; decayed=${result.decayed}`)
    })
  },
})

export const InstinctCommand = cmd({
  command: "instinct",
  describe: "管理直觉规则（instincts）",
  builder: (yargs) => yargs.command(ListCommand).command(PromoteCommand).command(DemoteCommand).command(ForgetCommand).command(ReviewCommand).demandCommand(),
  handler: () => {},
})
