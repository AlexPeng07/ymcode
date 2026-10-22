import { cmd } from "../cmd"
import { UI } from "@/cli/ui"
import { tui } from "./app"
import { win32DisableProcessedInput, win32InstallCtrlCGuard } from "./win32"
import { TuiConfig } from "@/cli/cmd/tui/config/tui"

export const AttachCommand = cmd({
  command: "attach <url>",
  describe: "连接到正在运行的 ymcode 服务器",
  builder: (yargs) =>
    yargs
      .positional("url", {
        type: "string",
        describe: "由 `ymcode serve` 输出的服务器基础 URL",
        demandOption: true,
      })
      .option("dir", {
        type: "string",
        description: "运行目录",
      })
      .option("continue", {
        alias: ["c"],
        describe: "继续上一个会话",
        type: "boolean",
      })
      .option("session", {
        alias: ["s"],
        type: "string",
        describe: "要继续的会话 ID",
      })
      .option("fork", {
        type: "boolean",
        describe: "继续时派生会话（与 --continue 或 --session 一起使用）",
      })
      .option("password", {
        alias: ["p"],
        type: "string",
        describe: "Basic 认证密码（默认取 YMCODE_SERVER_PASSWORD）",
      }),
  handler: async (args) => {
    const unguard = win32InstallCtrlCGuard()
    try {
      win32DisableProcessedInput()

      if (args.fork && !args.continue && !args.session) {
        UI.error("--fork requires --continue or --session")
        process.exitCode = 1
        return
      }

      const directory = (() => {
        if (!args.dir) return undefined
        try {
          process.chdir(args.dir)
          return process.cwd()
        } catch {
          // If the directory doesn't exist locally (remote attach), pass it through.
          return args.dir
        }
      })()
      const headers = (() => {
        const password = args.password ?? process.env.YMCODE_SERVER_PASSWORD
        if (!password) return undefined
        const username = process.env.YMCODE_SERVER_USERNAME ?? "ymcode"
        const auth = `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`
        return { Authorization: auth }
      })()
      const config = await TuiConfig.get()
      await tui({
        url: args.url,
        config,
        args: {
          continue: args.continue,
          sessionID: args.session,
          fork: args.fork,
        },
        directory,
        headers,
      })
    } finally {
      unguard?.()
    }
  },
})
