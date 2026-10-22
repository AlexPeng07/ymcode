import { EOL } from "os"
import { Effect, Stream } from "effect"
import { AppRuntime } from "../../../effect/app-runtime"
import { Ripgrep } from "../../../file/ripgrep"
import { Instance } from "../../../project/instance"
import { bootstrap } from "../../bootstrap"
import { cmd } from "../cmd"

export const RipgrepCommand = cmd({
  command: "rg",
  describe: "ripgrep 调试工具",
  builder: (yargs) => yargs.command(TreeCommand).command(FilesCommand).command(SearchCommand).demandCommand(),
  async handler() {},
})

const TreeCommand = cmd({
  command: "tree",
  describe: "使用 ripgrep 显示文件树",
  builder: (yargs) =>
    yargs.option("limit", {
      type: "number",
    }),
  async handler(args) {
    await bootstrap(process.cwd(), async () => {
      const tree = await AppRuntime.runPromise(
        Ripgrep.Service.use((svc) => svc.tree({ cwd: Instance.directory, limit: args.limit })),
      )
      process.stdout.write(tree + EOL)
    })
  },
})

const FilesCommand = cmd({
  command: "files",
  describe: "使用 ripgrep 列出文件",
  builder: (yargs) =>
    yargs
      .option("query", {
        type: "string",
        description: "按查询筛选文件",
      })
      .option("glob", {
        type: "string",
        description: "匹配文件的 Glob 模式",
      })
      .option("limit", {
        type: "number",
        description: "限制结果数量",
      }),
  async handler(args) {
    await bootstrap(process.cwd(), async () => {
      const files = await AppRuntime.runPromise(
        Effect.gen(function* () {
          const rg = yield* Ripgrep.Service
          return yield* rg
            .files({
              cwd: Instance.directory,
              glob: args.glob ? [args.glob] : undefined,
            })
            .pipe(
              Stream.take(args.limit ?? Infinity),
              Stream.runCollect,
              Effect.map((c) => [...c]),
            )
        }),
      )
      process.stdout.write(files.join(EOL) + EOL)
    })
  },
})

const SearchCommand = cmd({
  command: "search <pattern>",
  describe: "使用 ripgrep 搜索文件内容",
  builder: (yargs) =>
    yargs
      .positional("pattern", {
        type: "string",
        demandOption: true,
        description: "搜索模式",
      })
      .option("glob", {
        type: "array",
        description: "文件 Glob 模式",
      })
      .option("limit", {
        type: "number",
        description: "限制结果数量",
      }),
  async handler(args) {
    await bootstrap(process.cwd(), async () => {
      const results = await AppRuntime.runPromise(
        Ripgrep.Service.use((svc) =>
          svc.search({
            cwd: Instance.directory,
            pattern: args.pattern,
            glob: args.glob as string[] | undefined,
            limit: args.limit,
          }),
        ),
      )
      process.stdout.write(JSON.stringify(results.items, null, 2) + EOL)
    })
  },
})
