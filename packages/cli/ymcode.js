#!/usr/bin/env node

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

import {
  detectTarget,
  ensureBinary,
  packageRoot,
  readVersion,
  runBinary,
  stageWindowsRunCopy,
  vendorBinaryPath,
} from "./launcher.js"

const installHint = "bun run --cwd packages/cli build:local"

async function main() {
  const envPath = process.env.YMCODE_BIN_PATH
  if (envPath) {
    runBinary(envPath)
  }

  const root = packageRoot(path.dirname(fileURLToPath(import.meta.url)))
  const target = detectTarget()
  const dest = vendorBinaryPath(root, target)

  if (fs.existsSync(dest)) {
    const version = readVersion(root)
    runBinary(stageWindowsRunCopy(dest, version))
  }

  try {
    const binary = await ensureBinary({
      root,
      target,
      log: (message) => console.error(message),
    })
    runBinary(stageWindowsRunCopy(binary, readVersion(root)))
  } catch (error) {
    const detail = error && error.message ? error.message : String(error)
    console.error(`Failed to install ymcode binary (${target}) from FDS: ${detail}`)
    console.error("")
    console.error("  Recommended: install ymcode natively:")
    console.error(`    ${installHint}`)
    console.error("")
    console.error("  Or set YMCODE_BIN_PATH to an existing ymcode executable,")
    console.error("  or retry with network access (MIMO_FDS_BASE can point at a mirror).")
    process.exit(1)
  }
}

main().catch((error) => {
  console.error(error && error.message ? error.message : error)
  console.error("")
  console.error("  Recommended: install ymcode natively:")
  console.error(`    ${installHint}`)
  process.exit(1)
})
