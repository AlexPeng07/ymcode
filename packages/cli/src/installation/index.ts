import { Effect, Layer, Schema, Context, Stream } from "effect"
import { FetchHttpClient, HttpClient, HttpClientRequest, HttpClientResponse } from "effect/unstable/http"
import * as CrossSpawnSpawner from "@/effect/cross-spawn-spawner"
import { withTransientReadRetry } from "@/util/effect-http-client"
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process"
import z from "zod"
import path from "path"
import os from "os"
import { renameSync, copyFileSync, rmSync, unlinkSync, existsSync, readdirSync } from "fs"
import { promises as fs } from "fs"
import { BusEvent } from "@/bus/bus-event"
import { Flag } from "../flag/flag"
import { Log } from "../util"
import semver from "semver"
import { InstallationChannel, InstallationVersion } from "./version"

const log = Log.create({ service: "installation" })

const PACKAGE_NAME = "@ymcode/cli"

/** Default GitHub repository that publishes platform binaries as release assets. */
export const RELEASE_REPO = "AlexPeng07/ymcode"

export function releaseRepo() {
  return process.env.YMCODE_RELEASE_REPO || RELEASE_REPO
}

/** Asset base; a mirror must serve the same `releases/download/vX.Y.Z/...` layout. */
export function releaseBase() {
  return (process.env.YMCODE_RELEASE_BASE || `https://github.com/${releaseRepo()}`).replace(/\/+$/, "")
}

/** Latest-version endpoint. Defaults to the GitHub Releases API; mirrors may return plain text. */
export function releaseLatestUrl() {
  return process.env.YMCODE_RELEASE_LATEST_URL || `https://api.github.com/repos/${releaseRepo()}/releases/latest`
}

export function installScriptUrl(platform = process.platform) {
  if (process.env.YMCODE_INSTALL_SCRIPT_URL) return process.env.YMCODE_INSTALL_SCRIPT_URL
  return `https://raw.githubusercontent.com/${releaseRepo()}/main/${platform === "win32" ? "install.ps1" : "install"}`
}

/** Accepts the GitHub Releases JSON (tag_name) or a plain version body from a mirror. */
export function parseLatestVersion(raw: string) {
  const tag = raw.match(/"tag_name"\s*:\s*"v?([^"]+)"/)?.[1]
  return (tag ?? raw.trim()).replace(/^v/, "")
}

export type Method = "curl" | "npm" | "pnpm" | "bun" | "brew" | "scoop" | "choco" | "unknown"

export type ReleaseType = "patch" | "minor" | "major"

export const Event = {
  Updated: BusEvent.define(
    "installation.updated",
    z.object({
      version: z.string(),
      method: z.string().optional(),
    }),
  ),
  UpdateAvailable: BusEvent.define(
    "installation.update-available",
    z.object({
      version: z.string(),
      method: z.string().optional(),
    }),
  ),
}

export function getReleaseType(current: string, latest: string): ReleaseType {
  const currMajor = semver.major(current)
  const currMinor = semver.minor(current)
  const newMajor = semver.major(latest)
  const newMinor = semver.minor(latest)

  if (newMajor > currMajor) return "major"
  if (newMinor > currMinor) return "minor"
  return "patch"
}

export const Info = z
  .object({
    version: z.string(),
    latest: z.string(),
  })
  .meta({
    ref: "InstallationInfo",
  })
export type Info = z.infer<typeof Info>

export const USER_AGENT = `ymcode/${InstallationChannel}/${InstallationVersion}/${Flag.YMCODE_CLIENT}`

export function isPreview() {
  return InstallationChannel !== "latest"
}

export function isLocal() {
  return InstallationChannel === "local"
}

export class UpgradeFailedError extends Schema.TaggedErrorClass<UpgradeFailedError>()("UpgradeFailedError", {
  stderr: Schema.String,
}) {}

// TODO(ymcode): uncomment when corresponding channels are supported
// const GitHubRelease = Schema.Struct({ tag_name: Schema.String })
const NpmPackage = Schema.Struct({ version: Schema.String })
// const BrewFormula = Schema.Struct({ versions: Schema.Struct({ stable: Schema.String }) })
// const BrewInfoV2 = Schema.Struct({
//   formulae: Schema.Array(Schema.Struct({ versions: Schema.Struct({ stable: Schema.String }) })),
// })
// const ChocoPackage = Schema.Struct({
//   d: Schema.Struct({ results: Schema.Array(Schema.Struct({ Version: Schema.String })) }),
// })
// const ScoopManifest = NpmPackage

export interface Interface {
  readonly info: () => Effect.Effect<Info>
  readonly method: () => Effect.Effect<Method>
  readonly latest: (method?: Method) => Effect.Effect<string>
  readonly upgrade: (
    method: Method,
    target: string,
  ) => Effect.Effect<{ deferred: boolean }, UpgradeFailedError>
}

export class Service extends Context.Service<Service, Interface>()("@ymcode/Installation") {}

export const layer: Layer.Layer<Service, never, HttpClient.HttpClient | ChildProcessSpawner.ChildProcessSpawner> =
  Layer.effect(
    Service,
    Effect.gen(function* () {
      const http = yield* HttpClient.HttpClient
      const httpOk = HttpClient.filterStatusOk(withTransientReadRetry(http))
      const spawner = yield* ChildProcessSpawner.ChildProcessSpawner

      const text = Effect.fnUntraced(
        function* (cmd: string[], opts?: { cwd?: string; env?: Record<string, string> }) {
          const proc = ChildProcess.make(cmd[0], cmd.slice(1), {
            cwd: opts?.cwd,
            env: opts?.env,
            extendEnv: true,
          })
          const handle = yield* spawner.spawn(proc)
          const out = yield* Stream.mkString(Stream.decodeText(handle.stdout))
          yield* handle.exitCode
          return out
        },
        Effect.scoped,
        Effect.catch(() => Effect.succeed("")),
      )

      const run = Effect.fnUntraced(
        function* (cmd: string[], opts?: { cwd?: string; env?: Record<string, string> }) {
          const proc = ChildProcess.make(cmd[0], cmd.slice(1), {
            cwd: opts?.cwd,
            env: opts?.env,
            extendEnv: true,
          })
          const handle = yield* spawner.spawn(proc)
          const [stdout, stderr] = yield* Effect.all(
            [Stream.mkString(Stream.decodeText(handle.stdout)), Stream.mkString(Stream.decodeText(handle.stderr))],
            { concurrency: 2 },
          )
          const code = yield* handle.exitCode
          return { code, stdout, stderr }
        },
        Effect.scoped,
        Effect.catch(() => Effect.succeed({ code: ChildProcessSpawner.ExitCode(1), stdout: "", stderr: "" })),
      )

      // TODO(ymcode): uncomment when ymcode is published to homebrew
      // const getBrewFormula = Effect.fnUntraced(function* () {
      //   const tapFormula = yield* text(["brew", "list", "--formula", "anomalyco/tap/opencode"])
      //   if (tapFormula.includes("opencode")) return "anomalyco/tap/opencode"
      //   const coreFormula = yield* text(["brew", "list", "--formula", "opencode"])
      //   if (coreFormula.includes("opencode")) return "opencode"
      //   return "opencode"
      // })

      const upgradeCurl = Effect.fnUntraced(
        function* (target: string) {
          if (process.platform === "win32") {
            return yield* upgradeCurlWindows(target)
          }
          const scriptUrl = installScriptUrl()
          const response = yield* httpOk.execute(HttpClientRequest.get(scriptUrl))
          const body = yield* response.text
          const bodyBytes = new TextEncoder().encode(body)
          const proc = ChildProcess.make("bash", [], {
            stdin: Stream.make(bodyBytes),
            env: { VERSION: target },
            extendEnv: true,
          })
          const handle = yield* spawner.spawn(proc)
          const [stdout, stderr] = yield* Effect.all(
            [Stream.mkString(Stream.decodeText(handle.stdout)), Stream.mkString(Stream.decodeText(handle.stderr))],
            { concurrency: 2 },
          )
          const code = yield* handle.exitCode
          return { code, stdout, stderr }
        },
        Effect.scoped,
        Effect.orDie,
      )

      // Windows deferred swap helper. Runs detached: waits for the upgrading
      // process to exit, then renames the installed exe aside and copies the
      // staged one into place, rolling back on failure. Written as a script so
      // no process ever replaces its own running image.
      const SWAP_SCRIPT = `param([int]$TargetPid,[string]$Target,[string]$Staged,[string]$StageDir)
$ErrorActionPreference = 'SilentlyContinue'
$deadline = (Get-Date).AddSeconds(120)
while (Get-Process -Id $TargetPid -ErrorAction SilentlyContinue) {
  if ((Get-Date) -gt $deadline) { exit 1 }
  Start-Sleep -Milliseconds 200
}
Start-Sleep -Milliseconds 300
$old = "$Target.old_$TargetPid"
$moved = $false
for ($i = 0; $i -lt 40; $i++) {
  if (Test-Path -LiteralPath $old) { Remove-Item -LiteralPath $old -Force }
  try { Move-Item -LiteralPath $Target -Destination $old -Force -ErrorAction Stop; $moved = $true; break }
  catch { Start-Sleep -Milliseconds 250 }
}
if (-not $moved) { exit 1 }
try { Copy-Item -LiteralPath $Staged -Destination $Target -Force -ErrorAction Stop }
catch { Move-Item -LiteralPath $old -Destination $Target -Force; exit 1 }
Remove-Item -LiteralPath $old -Force
Remove-Item -LiteralPath $StageDir -Recurse -Force
exit 0
`

      const spawnDeferredSwap = Effect.fnUntraced(function* (input: {
        stageDir: string
        stagedExe: string
        targetExe: string
        pid: number
      }) {
        const scriptPath = path.join(input.stageDir, "swap.ps1")
        const launcherPath = path.join(input.stageDir, "swap-launch.ps1")
        // Start-Process is the only detach that survives this process exiting:
        // a plain (even detached) child is killed with its parent here, and
        // detached:true on Windows leaves PowerShell without a console so the
        // script never runs. The worker therefore runs as a grandchild.
        const LAUNCHER = `param([string]$Script,[int]$TargetPid,[string]$Target,[string]$Staged,[string]$StageDir)
$list = @('-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File', ('"'+$Script+'"'), '-TargetPid', $TargetPid, '-Target', ('"'+$Target+'"'), '-Staged', ('"'+$Staged+'"'), '-StageDir', ('"'+$StageDir+'"'))
Start-Process -WindowStyle Hidden -FilePath "powershell.exe" -ArgumentList $list
`
        const prepared = yield* Effect.promise(async () => {
          try {
            await fs.writeFile(scriptPath, SWAP_SCRIPT, "utf8")
            await fs.writeFile(launcherPath, LAUNCHER, "utf8")
            return true
          } catch {
            return false
          }
        })
        if (!prepared) {
          log.warn("could not write deferred swap scripts; falling back to in-place replace")
          return false
        }
        // Waits for the launcher only (it returns as soon as Start-Process has
        // created the worker); the worker itself outlives this process.
        const launched = yield* run([
          "powershell.exe",
          "-NoProfile",
          "-NonInteractive",
          "-ExecutionPolicy",
          "Bypass",
          "-File",
          launcherPath,
          "-Script",
          scriptPath,
          "-TargetPid",
          String(input.pid),
          "-Target",
          input.targetExe,
          "-Staged",
          input.stagedExe,
          "-StageDir",
          input.stageDir,
        ])
        if (launched.code !== 0) {
          log.warn("deferred swap launcher failed; falling back to in-place replace", {
            stderr: launched.stderr.slice(0, 400),
          })
          return false
        }
        return true
      })

      const upgradeCurlWindows = Effect.fnUntraced(function* (target: string) {        const pid = process.pid
        const targetExe = process.execPath
        const stageDir = path.join(os.tmpdir(), `ymcode_upgrade_${pid}`)
        const scriptUrl = installScriptUrl()

        // Run install.ps1 as a FILE, not `irm | iex`. Under iex the script
        // detects a null MyInvocation path and takes its Exit-Install branch
        // that sets $LASTEXITCODE and `break`s — which neither propagates a
        // failure exit code (a failed download still reports 0, so the CLI
        // believed the staging succeeded) nor reliably terminates PowerShell.
        // -File makes it take the `exit $Code` branch.
        //
        // The script is fetched here; if that fails (e.g. a proxy that only
        // trusts the Windows certificate store and not the runtime's CA set)
        // fall back to the previous irm|iex form so those environments keep
        // working.
        const scriptPath = yield* Effect.promise(async () => {
          try {
            const res = await fetch(scriptUrl)
            if (!res.ok) return undefined
            const file = path.join(os.tmpdir(), `ymcode_install_${pid}.ps1`)
            await fs.writeFile(file, await res.text())
            return file
          } catch {
            return undefined
          }
        })

        const downloadResult = scriptPath
          ? yield* run(
              ["powershell.exe", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", scriptPath],
              { env: { YMCODE_INSTALL_DIR: stageDir, VERSION: target, INSTALL_SCRIPT_URL: scriptUrl } },
            ).pipe(
              Effect.ensuring(Effect.promise(() => fs.rm(scriptPath, { force: true }).catch(() => {}))),
            )
          : yield* run(
              ["powershell.exe", "-NoProfile", "-NonInteractive", "-ep", "Bypass", "-c", "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; irm $env:INSTALL_SCRIPT_URL | iex"],
              { env: { YMCODE_INSTALL_DIR: stageDir, VERSION: target, INSTALL_SCRIPT_URL: scriptUrl } },
            )
        if (downloadResult.code !== 0) {
          rmSync(stageDir, { recursive: true, force: true })
          return downloadResult
        }

        // Replace in-place: Windows allows renaming a running exe
        const stagedExe = path.join(stageDir, "ymcode.exe")
        if (!existsSync(stagedExe)) {
          rmSync(stageDir, { recursive: true, force: true })
          return { code: 1 as ChildProcessSpawner.ExitCode, stdout: "", stderr: "staged binary not found at " + stagedExe }
        }
        // The previous upgrade's `.old_<pid>` cannot be deleted while its
        // process still runs (it is that process's image); sweep it here so
        // repeated upgrades do not accumulate ~150MB files.
        try {
          for (const entry of readdirSync(path.dirname(targetExe))) {
            if (entry.startsWith(path.basename(targetExe) + ".old_")) {
              try { unlinkSync(path.join(path.dirname(targetExe), entry)) } catch {}
            }
          }
        } catch {}
        // Prefer a DEFERRED swap: a detached helper replaces the binary after
        // this process exits. Replacing a running image from inside that same
        // process is the self-modifying-executable signature antivirus
        // behavior engines block (Kaspersky: PDM:Trojan.Win32.Generic.nblk);
        // an installer-style helper doing the swap does not match it.
        if (yield* spawnDeferredSwap({ stageDir, stagedExe, targetExe, pid })) {
          log.info("staged Windows upgrade for deferred swap", { target, pid })
          return {
            code: 0 as ChildProcessSpawner.ExitCode,
            stdout: "",
            stderr: "",
            deferred: true,
          }
        }

        // Fallback (helper could not be started): replace in-place. Windows
        // allows renaming a running exe.
        const oldExe = targetExe + `.old_${pid}`
        renameSync(targetExe, oldExe)
        try {
          copyFileSync(stagedExe, targetExe)
        } catch (e) {
          renameSync(oldExe, targetExe)
          return { code: 1 as ChildProcessSpawner.ExitCode, stdout: "", stderr: "failed to copy staged binary: " + (e instanceof Error ? e.message : String(e)) }
        }
        rmSync(stageDir, { recursive: true, force: true })
        try { unlinkSync(oldExe) } catch {}

        log.info("upgraded Windows binary in-place", { target, pid, oldExe })
        return { code: 0 as ChildProcessSpawner.ExitCode, stdout: "", stderr: "" }
      })

      const methodImpl = Effect.fn("Installation.method")(function* () {
        if (process.execPath.includes(path.join(".ymcode", "bin"))) return "curl" as Method
        if (process.execPath.includes(path.join(".local", "bin"))) return "curl" as Method
        const exec = process.execPath.toLowerCase()

        const checks: Array<{ name: Method; command: () => Effect.Effect<string> }> = [
          { name: "npm", command: () => text(["npm", "list", "-g", "--depth=0"]) },
          { name: "pnpm", command: () => text(["pnpm", "list", "-g", "--depth=0"]) },
          { name: "bun", command: () => text(["bun", "pm", "ls", "-g"]) },
          // TODO(ymcode): uncomment when ymcode is published to these channels
          // { name: "brew", command: () => text(["brew", "list", "--formula", "opencode"]) },
          // { name: "scoop", command: () => text(["scoop", "list", "opencode"]) },
          // { name: "choco", command: () => text(["choco", "list", "--limit-output", "opencode"]) },
        ]

        checks.sort((a, b) => {
          const aMatches = exec.includes(a.name)
          const bMatches = exec.includes(b.name)
          if (aMatches && !bMatches) return -1
          if (!aMatches && bMatches) return 1
          return 0
        })

        for (const check of checks) {
          const output = yield* check.command()
          if (output.includes(PACKAGE_NAME)) {
            return check.name
          }
        }

        return "unknown" as Method
      })

      const latestImpl = Effect.fn("Installation.latest")(function* (installMethod?: Method) {
        const detectedMethod = installMethod || (yield* methodImpl())

        // TODO(ymcode): uncomment when ymcode is published to homebrew
        // if (detectedMethod === "brew") {
        //   const formula = yield* getBrewFormula()
        //   if (formula.includes("/")) {
        //     const infoJson = yield* text(["brew", "info", "--json=v2", formula])
        //     const info = yield* Schema.decodeUnknownEffect(Schema.fromJsonString(BrewInfoV2))(infoJson)
        //     return info.formulae[0].versions.stable
        //   }
        //   const response = yield* httpOk.execute(
        //     HttpClientRequest.get("https://formulae.brew.sh/api/formula/opencode.json").pipe(
        //       HttpClientRequest.acceptJson,
        //     ),
        //   )
        //   const data = yield* HttpClientResponse.schemaBodyJson(BrewFormula)(response)
        //   return data.versions.stable
        // }

        if (detectedMethod === "curl") {
          const raw = yield* text([
            "curl",
            "-fsSL",
            "-H",
            "Accept: application/vnd.github+json",
            releaseLatestUrl(),
          ])
          const version = parseLatestVersion(raw)
          if (/^\d+\.\d+\.\d+/.test(version)) return version
          return yield* Effect.die(new Error("failed to resolve the latest version from the release channel"))
        }

        if (detectedMethod === "npm" || detectedMethod === "bun" || detectedMethod === "pnpm") {
          const r = (yield* text(["npm", "config", "get", "registry"])).trim()
          const reg = r || "https://registry.npmjs.org"
          const registry = reg.endsWith("/") ? reg.slice(0, -1) : reg
          const response = yield* httpOk.execute(
            HttpClientRequest.get(`${registry}/${encodeURIComponent(PACKAGE_NAME)}/${InstallationChannel}`).pipe(
              HttpClientRequest.acceptJson,
            ),
          )
          const data = yield* HttpClientResponse.schemaBodyJson(NpmPackage)(response)
          return data.version
        }

        // TODO(ymcode): uncomment when ymcode is published to chocolatey
        // if (detectedMethod === "choco") {
        //   const response = yield* httpOk.execute(
        //     HttpClientRequest.get(
        //       "https://community.chocolatey.org/api/v2/Packages?$filter=Id%20eq%20%27opencode%27%20and%20IsLatestVersion&$select=Version",
        //     ).pipe(HttpClientRequest.setHeaders({ Accept: "application/json;odata=verbose" })),
        //   )
        //   const data = yield* HttpClientResponse.schemaBodyJson(ChocoPackage)(response)
        //   return data.d.results[0].Version
        // }

        // TODO(ymcode): uncomment when ymcode is published to scoop
        // if (detectedMethod === "scoop") {
        //   const response = yield* httpOk.execute(
        //     HttpClientRequest.get(
        //       "https://raw.githubusercontent.com/ScoopInstaller/Main/master/bucket/opencode.json",
        //     ).pipe(HttpClientRequest.setHeaders({ Accept: "application/json" })),
        //   )
        //   const data = yield* HttpClientResponse.schemaBodyJson(ScoopManifest)(response)
        //   return data.version
        // }

        // TODO(ymcode): uncomment when ymcode has github releases
        // const response = yield* httpOk.execute(
        //   HttpClientRequest.get("https://api.github.com/repos/anomalyco/opencode/releases/latest").pipe(
        //     HttpClientRequest.acceptJson,
        //   ),
        // )
        // const data = yield* HttpClientResponse.schemaBodyJson(GitHubRelease)(response)
        // return data.tag_name.replace(/^v/, "")

        log.warn("unsupported update channel, skipping", { method: detectedMethod })
        return yield* Effect.die(new Error(`unsupported update channel: ${detectedMethod}`))
      }, Effect.orDie)

      const upgradeImpl = Effect.fn("Installation.upgrade")(function* (m: Method, target: string) {
        let result: { code: ChildProcessSpawner.ExitCode; stdout: string; stderr: string; deferred?: boolean } | undefined
        switch (m) {
          case "curl":
            result = yield* upgradeCurl(target)
            break
          case "npm":
            result = yield* run(["npm", "install", "-g", `${PACKAGE_NAME}@${target}`])
            break
          case "pnpm":
            result = yield* run(["pnpm", "install", "-g", `${PACKAGE_NAME}@${target}`])
            break
          case "bun":
            result = yield* run(["bun", "install", "-g", `${PACKAGE_NAME}@${target}`])
            break
          // TODO(ymcode): uncomment when ymcode is published to homebrew
          // case "brew": {
          //   const formula = yield* getBrewFormula()
          //   const env = { HOMEBREW_NO_AUTO_UPDATE: "1" }
          //   if (formula.includes("/")) {
          //     const tap = yield* run(["brew", "tap", "anomalyco/tap"], { env })
          //     if (tap.code !== 0) {
          //       result = tap
          //       break
          //     }
          //     const repo = yield* text(["brew", "--repo", "anomalyco/tap"])
          //     const dir = repo.trim()
          //     if (dir) {
          //       const pull = yield* run(["git", "pull", "--ff-only"], { cwd: dir, env })
          //       if (pull.code !== 0) {
          //         result = pull
          //         break
          //       }
          //     }
          //   }
          //   result = yield* run(["brew", "upgrade", formula], { env })
          //   break
          // }
          // TODO(ymcode): uncomment when ymcode is published to chocolatey
          // case "choco":
          //   result = yield* run(["choco", "upgrade", "opencode", `--version=${target}`, "-y"])
          //   break
          // TODO(ymcode): uncomment when ymcode is published to scoop
          // case "scoop":
          //   result = yield* run(["scoop", "install", `opencode@${target}`])
          //   break
          default:
            return yield* new UpgradeFailedError({ stderr: `Unknown method: ${m}` })
        }
        if (!result || result.code !== 0) {
          // TODO(ymcode): restore choco-specific error when choco channel is supported
          // const stderr = m === "choco" ? "not running from an elevated command shell" : result?.stderr || ""
          const stderr = result?.stderr || ""
          return yield* new UpgradeFailedError({ stderr })
        }
        log.info("upgraded", {
          method: m,
          target,
          deferred: result.deferred ?? false,
          stdout: result.stdout,
          stderr: result.stderr,
        })
        // With a deferred swap the on-disk binary is still the old one until
        // this process exits, so a version probe here would be misleading.
        if (!result.deferred) yield* text([process.execPath, "--version"])
        return { deferred: result.deferred ?? false }
      })

      return Service.of({
        info: Effect.fn("Installation.info")(function* () {
          return {
            version: InstallationVersion,
            latest: yield* latestImpl(),
          }
        }),
        method: methodImpl,
        latest: latestImpl,
        upgrade: upgradeImpl,
      })
    }),
  )

export const defaultLayer = layer.pipe(
  Layer.provide(FetchHttpClient.layer),
  Layer.provide(CrossSpawnSpawner.defaultLayer),
)

export * as Installation from "."
