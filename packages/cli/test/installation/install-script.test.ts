import { describe, expect, test } from "bun:test"
import { createHash } from "crypto"
import fs from "fs"
import os from "os"
import path from "path"
import { tmpdir } from "../fixture/fixture"
import * as Process from "../../src/util/process"

// E2E for the installer scripts' download integrity check: a well-formed
// <asset>.sha256 published next to the archive must be enforced, a missing or
// malformed one must degrade to a skip, and a mismatch must fail hard.
const REPO_ROOT = path.join(import.meta.dirname, "../../../..")
const VERSION = "9.9.9"

describe("install script checksum verification", () => {
  test.skipIf(process.platform !== "win32")(
    "install.ps1 enforces a published sha256 and degrades when it is absent",
    async () => {
      await using base = await tmpdir()
      // Fake release payload: a real zip with ymcode.exe at its root, exactly
      // what Expand-Archive expects from the release asset.
      const work = path.join(base.path, "build")
      fs.mkdirSync(work, { recursive: true })
      fs.writeFileSync(path.join(work, "ymcode.exe"), "FAKE_BINARY")
      const zip = path.join(base.path, "release.zip")
      const esc = (p: string) => p.replaceAll("'", "''")
      const pack = Bun.spawnSync([
        "powershell",
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        `$global:ProgressPreference = 'SilentlyContinue'; Compress-Archive -Path '${esc(path.join(work, "ymcode.exe"))}' -DestinationPath '${esc(zip)}' -Force`,
      ])
      expect(pack.exitCode).toBe(0)
      const zipBytes = fs.readFileSync(zip)
      const goodSum = createHash("sha256").update(zipBytes).digest("hex")

      const serve = (sha256Body: string | null) =>
        Bun.serve({
          port: 0,
          fetch(req) {
            const pathname = new URL(req.url).pathname
            if (pathname.endsWith(".sha256")) {
              if (sha256Body === null) return new Response("nope", { status: 404 })
              return new Response(sha256Body)
            }
            if (pathname.includes("/releases/download/") && pathname.endsWith(".zip")) {
              return new Response(new Uint8Array(zipBytes))
            }
            return new Response("Not Found", { status: 404 })
          },
        })

      const run = async (releaseBase: string) => {
        const stage = path.join(base.path, `stage-${Math.random().toString(36).slice(2, 8)}`)
        fs.mkdirSync(stage, { recursive: true })
        const proc = Bun.spawn(
          [
            "powershell",
            "-NoProfile",
            "-NonInteractive",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            path.join(REPO_ROOT, "install.ps1"),
            "-Version",
            VERSION,
          ],
          {
            cwd: base.path,
            env: {
              ...process.env,
              YMCODE_RELEASE_BASE: releaseBase,
              YMCODE_INSTALL_DIR: stage,
            },
            stdout: "pipe",
            stderr: "pipe",
          },
        )
        const [stdout, stderr, exitCode] = await Promise.all([
          new Response(proc.stdout).text(),
          new Response(proc.stderr).text(),
          proc.exited,
        ])
        return { exitCode, output: stdout + stderr, stage }
      }

      // missing checksum endpoint → install succeeds, verification is skipped
      let server = serve(null)
      try {
        const missing = await run(`http://127.0.0.1:${server.port}`)
        expect(missing.exitCode).toBe(0)
        expect(missing.output).toContain("Checksum file unavailable")
        expect(fs.existsSync(path.join(missing.stage, "ymcode.exe"))).toBe(true)
      } finally {
        await server.stop(true)
      }

      // well-formed matching sha256 → enforced and green
      server = serve(`${goodSum}  ymcode-windows-x64.zip\n`)
      try {
        const good = await run(`http://127.0.0.1:${server.port}`)
        expect(good.exitCode).toBe(0)
        expect(good.output).toContain("Checksum verified.")
      } finally {
        await server.stop(true)
      }

      // well-formed mismatching sha256 → hard failure, nothing installed
      server = serve(`${"0".repeat(64)}  ymcode-windows-x64.zip\n`)
      try {
        const bad = await run(`http://127.0.0.1:${server.port}`)
        expect(bad.exitCode).not.toBe(0)
        expect(bad.output).toContain("Checksum mismatch")
        expect(fs.existsSync(path.join(bad.stage, "ymcode.exe"))).toBe(false)
      } finally {
        await server.stop(true)
      }
    },
    60000,
  )

  test.skipIf(process.platform === "win32")(
    "install enforces a published sha256 and degrades when it is absent",
    async () => {
      await using base = await tmpdir()
      const work = path.join(base.path, "build")
      fs.mkdirSync(work, { recursive: true })
      fs.writeFileSync(path.join(work, "ymcode"), "#!/bin/sh\necho ok\n")
      fs.chmodSync(path.join(work, "ymcode"), 0o755)
      const archive = path.join(base.path, "release.tar.gz")
      expect(Bun.spawnSync(["tar", "-czf", archive, "-C", work, "ymcode"]).exitCode).toBe(0)
      const archiveBytes = fs.readFileSync(archive)
      const goodSum = createHash("sha256").update(archiveBytes).digest("hex")

      const serve = (sha256Body: string | null) =>
        Bun.serve({
          port: 0,
          fetch(req) {
            const pathname = new URL(req.url).pathname
            if (pathname.endsWith(".sha256")) {
              if (sha256Body === null) return new Response("nope", { status: 404 })
              return new Response(sha256Body)
            }
            if (pathname.includes("/releases/download/") && pathname.endsWith(".tar.gz")) {
              return new Response(new Uint8Array(archiveBytes))
            }
            return new Response("Not Found", { status: 404 })
          },
        })

      const run = async (releaseBase: string) => {
        const home = path.join(base.path, `home-${Math.random().toString(36).slice(2, 8)}`)
        fs.mkdirSync(path.join(home, ".ymcode"), { recursive: true })
        const result = await Process.run(
          ["bash", path.join(REPO_ROOT, "install"), "--version", VERSION],
          {
            cwd: base.path,
            env: {
              ...process.env,
              HOME: home,
              YMCODE_RELEASE_BASE: releaseBase,
            },
            nothrow: true,
          },
        )
        return {
          exitCode: result.code,
          output: result.stdout.toString() + result.stderr.toString(),
          bin: path.join(home, ".ymcode", "bin", "ymcode"),
        }
      }

      // missing checksum endpoint → install succeeds, verification is skipped
      let server = serve(null)
      try {
        const missing = await run(`http://127.0.0.1:${server.port}`)
        expect(missing.exitCode).toBe(0)
        expect(missing.output).toContain("Checksum file unavailable")
        expect(fs.existsSync(missing.bin)).toBe(true)
      } finally {
        await server.stop(true)
      }

      // well-formed matching sha256 → enforced and green
      server = serve(`${goodSum}  ymcode-linux-x64.tar.gz\n`)
      try {
        const good = await run(`http://127.0.0.1:${server.port}`)
        expect(good.exitCode).toBe(0)
        expect(good.output).toContain("Checksum verified.")
      } finally {
        await server.stop(true)
      }

      // well-formed mismatching sha256 → hard failure, nothing installed
      server = serve(`${"0".repeat(64)}  ymcode-linux-x64.tar.gz\n`)
      try {
        const bad = await run(`http://127.0.0.1:${server.port}`)
        expect(bad.exitCode).not.toBe(0)
        expect(bad.output).toContain("Checksum mismatch")
        expect(fs.existsSync(bad.bin)).toBe(false)
      } finally {
        await server.stop(true)
      }
    },
    60000,
  )
})
