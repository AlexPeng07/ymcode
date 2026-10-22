import { EOL } from "os"
import { AppRuntime } from "@/effect/app-runtime"
import { File } from "../../../file"
import { Ripgrep } from "@/file/ripgrep"
import { bootstrap } from "../../bootstrap"
import { cmd } from "../cmd"

const FileSearchCommand = cmd({
  command: "search <query>",
  describe: "按查询搜索文件",
  builder: (yargs) =>
    yargs.positional("query", {
      type: "string",
      demandOption: true,
      description: "搜索查询",
    }),
  async handler(args) {
    await bootstrap(process.cwd(), async () => {
      const results = await AppRuntime.runPromise(File.Service.use((svc) => svc.search({ query: args.query })))
      process.stdout.write(results.join(EOL) + EOL)
    })
  },
})

const FileReadCommand = cmd({
  command: "read <path>",
  describe: "以 JSON 读取文件内容",
  builder: (yargs) =>
    yargs.positional("path", {
      type: "string",
      demandOption: true,
      description: "要读取的文件路径",
    }),
  async handler(args) {
    await bootstrap(process.cwd(), async () => {
      const content = await AppRuntime.runPromise(File.Service.use((svc) => svc.read(args.path)))
      process.stdout.write(JSON.stringify(content, null, 2) + EOL)
    })
  },
})

const FileStatusCommand = cmd({
  command: "status",
  describe: "显示文件状态信息",
  builder: (yargs) => yargs,
  async handler() {
    await bootstrap(process.cwd(), async () => {
      const status = await AppRuntime.runPromise(File.Service.use((svc) => svc.status()))
      process.stdout.write(JSON.stringify(status, null, 2) + EOL)
    })
  },
})

const FileListCommand = cmd({
  command: "list <path>",
  describe: "列出目录中的文件",
  builder: (yargs) =>
    yargs.positional("path", {
      type: "string",
      demandOption: true,
      description: "要列出的文件路径",
    }),
  async handler(args) {
    await bootstrap(process.cwd(), async () => {
      const files = await AppRuntime.runPromise(File.Service.use((svc) => svc.list(args.path)))
      process.stdout.write(JSON.stringify(files, null, 2) + EOL)
    })
  },
})

const FileTreeCommand = cmd({
  command: "tree [dir]",
  describe: "显示目录树",
  builder: (yargs) =>
    yargs.positional("dir", {
      type: "string",
      description: "要生成目录树的目录",
      default: process.cwd(),
    }),
  async handler(args) {
    await bootstrap(process.cwd(), async () => {
      const tree = await AppRuntime.runPromise(Ripgrep.Service.use((svc) => svc.tree({ cwd: args.dir, limit: 200 })))
      console.log(JSON.stringify(tree, null, 2))
    })
  },
})

export const FileCommand = cmd({
  command: "file",
  describe: "文件系统调试工具",
  builder: (yargs) =>
    yargs
      .command(FileReadCommand)
      .command(FileStatusCommand)
      .command(FileListCommand)
      .command(FileSearchCommand)
      .command(FileTreeCommand)
      .demandCommand(),
  async handler() {},
})
