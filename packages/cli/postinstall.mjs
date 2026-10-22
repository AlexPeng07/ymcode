#!/usr/bin/env node

// Best-effort release prefetch. Failures must not fail `npm install` — ymcode.js
// downloads the binary on first run when vendor/ is still empty.

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

import { detectTarget, ensureBinary, packageRoot, vendorBinaryPath } from "./launcher.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function printMigrationNotice() {
  console.log()
  console.log("  Build ymcode locally:")
  console.log("    bun run --cwd packages/cli build:local")
  console.log()
}

async function main() {
  printMigrationNotice()

  if (process.env.YMCODE_BIN_PATH) return

  try {
    const root = packageRoot(__dirname)
    const target = detectTarget()
    const dest = vendorBinaryPath(root, target)
    if (!fs.existsSync(dest)) {
      await ensureBinary({ root, target })
    }
  } catch (error) {
    console.warn(`postinstall: skipped binary prefetch: ${error && error.message ? error.message : error}`)
    console.warn("Build the binary locally with `bun run --cwd packages/cli build:local`.")
  }
}

main().catch(() => {
  // Best-effort only — never fail install.
  process.exit(0)
})
