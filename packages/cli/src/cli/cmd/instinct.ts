import { cmd } from "./cmd"
import { Instance } from "../../project/instance"
import { ProjectID } from "../../project/schema"
import { AppRuntime } from "@/effect/app-runtime"
import * as Instinct from "../../memory/instinct-service"

type Context = { scope: "global" | "projects"; projectID: string }

async function withInstinct(fn: (ctx: Context) => Promise<void>, opts?: { global?: boolean }) {
  await Instance.provide({
    directory: process.cwd(),
    async fn() {
      const projectID = opts?.global ? ProjectID.global : Instance.project.id
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

const ExportCommand = cmd({
  command: "export [id]",
  describe: "导出直觉规则为 JSON",
  builder: (yargs) =>
    yargs
      .positional("id", { type: "string", describe: "只导出指定直觉规则" })
      .option("output", { type: "string", describe: "写入文件（默认输出到 stdout）" })
      .option("status", { type: "string", choices: ["candidate", "active", "retired"], describe: "按状态过滤" })
      .option("global", { type: "boolean", default: false, describe: "导出全局规则" }),
  handler: async (args) => {
    await withInstinct(
      async (ctx) => {
        const bundle = await AppRuntime.runPromise(
          Instinct.Service.use((service) =>
            service.exportAll({ ...ctx, status: args.status as never }),
          ),
        )
        const items = args.id ? bundle.items.filter((item) => item.info.id === args.id) : bundle.items
        const json = JSON.stringify({ ...bundle, items }, null, 2)
        if (args.output) {
          await Bun.write(args.output, json)
          console.log(`exported ${items.length} instincts to ${args.output}`)
          return
        }
        console.log(json)
      },
      { global: args.global },
    )
  },
})

const ImportCommand = cmd({
  command: "import <file>",
  describe: "从 JSON 导入直觉规则",
  builder: (yargs) =>
    yargs
      .positional("file", { type: "string", describe: "JSON 文件路径" })
      .option("force", { type: "boolean", default: false, describe: "覆盖已存在的同 ID 规则" })
      .option("global", { type: "boolean", default: false, describe: "导入到全局规则" }),
  handler: async (args) => {
    const bundle = await Bun.file(args.file!)
      .json()
      .catch(() => undefined)
    if (!bundle) {
      console.error(`failed to read ${args.file}`)
      process.exitCode = 1
      return
    }
    await withInstinct(
      async (ctx) => {
        const result = await AppRuntime.runPromise(
          Instinct.Service.use((service) =>
            service.importAll({ ...ctx, bundle, force: args.force }),
          ),
        )
        console.log(`imported=${result.imported}; skipped=${result.skipped}`)
      },
      { global: args.global },
    )
  },
})

export const InstinctCommand = cmd({
  command: "instinct",
  describe: "管理直觉规则（instincts）",
  builder: (yargs) =>
    yargs
      .command(ListCommand)
      .command(PromoteCommand)
      .command(DemoteCommand)
      .command(ForgetCommand)
      .command(ReviewCommand)
      .command(ExportCommand)
      .command(ImportCommand)
      .demandCommand(),
  handler: () => {},
})
