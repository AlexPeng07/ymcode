#!/usr/bin/env bun
// Dev launcher: start the dev server with a local YMCODE_HOME default.
import path from "path"

const pkgDir = path.resolve(import.meta.dir, "..")

const proc = Bun.spawn(["bun", "run", "--conditions=browser", "src/index.ts", ...process.argv.slice(2)], {
  cwd: pkgDir,
  stdio: ["inherit", "inherit", "inherit"],
  env: { ...process.env, YMCODE_HOME: process.env.YMCODE_HOME ?? path.resolve(pkgDir, "../../.dev-home") },
})

const onSignal = () => proc.kill()
process.on("SIGINT", onSignal)
process.on("SIGTERM", onSignal)

const code = await proc.exited
process.exit(code ?? 0)
