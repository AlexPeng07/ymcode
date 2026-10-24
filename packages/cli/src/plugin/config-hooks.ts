import { spawn } from "child_process"
import type { Hooks } from "@ymcode/plugin"
import { Shell } from "@/shell/shell"
import { childProcessEnv } from "@/util/child-process-env"
import { Log } from "@/util"

const log = Log.create({ service: "plugin.config-hooks" })

// The dispatch layer kills hook functions at 5s (HOOK_TIMEOUT_MS in index.ts);
// the runner budget stays below it so killTree cleanup wins the race.
const RUN_TIMEOUT_MS = 4_500
const STDIO_CAP = 64 * 1024
const PAYLOAD_CAP = 128 * 1024
const REASON_CAP = 500
const AFTER_APPEND_CAP = 2_000

export interface ConfigHookCommand {
  /** Tool name this hook applies to; omit or "*" for every tool. */
  match?: string
  command: string
}

export interface ConfigHooks {
  "tool.execute.before"?: ConfigHookCommand[]
  "tool.execute.after"?: ConfigHookCommand[]
}

const matches = (entry: ConfigHookCommand, tool: string) =>
  !entry.match || entry.match === "*" || entry.match === tool

interface RunResult {
  exitCode: number | null
  stdout: string
  stderr: string
}

async function run(command: string, payload: unknown, cwd: string): Promise<RunResult> {
  const shell = Shell.acceptable()
  const shellName = Shell.name(shell)
  const isPowerShell = process.platform === "win32" && (shellName === "powershell" || shellName === "pwsh")
  const proc = isPowerShell
    ? spawn(shell, ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", `${Shell.POWERSHELL_UTF8_PREFIX}${command}`], {
        cwd,
        env: childProcessEnv(),
        stdio: ["pipe", "pipe", "pipe"],
        windowsHide: true,
      })
    : spawn(command, {
        shell,
        cwd,
        env: childProcessEnv(),
        stdio: ["pipe", "pipe", "pipe"],
        windowsHide: true,
        detached: process.platform !== "win32",
      })

  let stdout = ""
  let stderr = ""
  proc.stdout?.on("data", (chunk: Buffer) => {
    if (stdout.length < STDIO_CAP) stdout += chunk.toString("utf8")
  })
  proc.stderr?.on("data", (chunk: Buffer) => {
    if (stderr.length < STDIO_CAP) stderr += chunk.toString("utf8")
  })
  const exited = new Promise<RunResult>((resolve, reject) => {
    proc.once("error", reject)
    proc.once("close", (exitCode) => resolve({ exitCode, stdout: stdout.trim(), stderr: stderr.trim() }))
  })
  proc.stdin?.end(JSON.stringify(payload).slice(0, PAYLOAD_CAP))

  const timer = setTimeout(() => {
    void Shell.killTree(proc)
  }, RUN_TIMEOUT_MS)
  try {
    return await exited
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Config-declared shell hooks, synthesized into the same dispatch path as
 * plugin and file hooks (timeout, circuit breaker, output rollback). Commands
 * receive a JSON payload on stdin: `{tool, sessionID, callID, args}`.
 *
 * - `tool.execute.before`: a non-zero exit cancels the tool call; stderr
 *   becomes the cancel reason the model sees.
 * - `tool.execute.after`: stdout of a zero exit is appended to the tool
 *   result, so linters and validators can add context the model reacts to.
 */
export function configHooks(hooks: ConfigHooks | undefined, cwd: string): Hooks | undefined {
  const beforeEntries = hooks?.["tool.execute.before"] ?? []
  const afterEntries = hooks?.["tool.execute.after"] ?? []
  if (beforeEntries.length === 0 && afterEntries.length === 0) return undefined

  const hook: Hooks = {}
  if (beforeEntries.length > 0) {
    hook["tool.execute.before"] = async (input, output) => {
      for (const entry of beforeEntries) {
        if (!matches(entry, input.tool)) continue
        const result = await run(entry.command, { tool: input.tool, sessionID: input.sessionID, callID: input.callID, args: output.args }, cwd)
        if (result.exitCode === 0) continue
        output.cancel = true
        output.cancelReason = (result.stderr || `hook command exited with code ${result.exitCode}`).slice(0, REASON_CAP)
        log.info("config hook blocked tool call", { tool: input.tool, exitCode: result.exitCode })
        return
      }
    }
  }
  if (afterEntries.length > 0) {
    hook["tool.execute.after"] = async (input, output) => {
      for (const entry of afterEntries) {
        if (!matches(entry, input.tool)) continue
        const result = await run(entry.command, { tool: input.tool, sessionID: input.sessionID, callID: input.callID, args: input.args }, cwd)
        if (result.exitCode !== 0 || !result.stdout) continue
        output.output += `\n[hook] ${result.stdout.slice(0, AFTER_APPEND_CAP)}`
      }
    }
  }
  return hook
}
