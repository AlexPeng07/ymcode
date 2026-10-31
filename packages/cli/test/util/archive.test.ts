import { describe, expect, test } from "bun:test"
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, existsSync, readFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { extractZip } from "../../src/util/archive"
import * as Process from "../../src/util/process"

// Windows: Bun keeps the extracted-file handles of the PowerShell child brief
// enough for immediate cleanup, but be forgiving about EBUSY on rm anyway.
function rmRetry(dir: string) {
  for (let i = 0; i < 30; i++) {
    try {
      rmSync(dir, { recursive: true, force: true })
      return
    } catch {
      Bun.sleepSync(100)
    }
  }
}

describe("extractZip", () => {
  test.skipIf(process.platform !== "win32")(
    "roundtrips a benign archive",
    async () => {
      const base = mkdtempSync(path.join(tmpdir(), "ymcode-archive-"))
      try {
        const src = path.join(base, "src")
        const dest = path.join(base, "dest")
        const zip = path.join(base, "benign.zip")
        mkdirSync(path.join(src, "nested"), { recursive: true })
        writeFileSync(path.join(src, "a.txt"), "alpha")
        writeFileSync(path.join(src, "nested", "b.txt"), "beta")

        // build the archive with the same .NET zip reader the extractor scans with
        await Process.run([
          "powershell",
          "-NoProfile",
          "-NonInteractive",
          "-Command",
          `Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::CreateFromDirectory('${src.replaceAll("'", "''")}', '${zip.replaceAll("'", "''")}')`,
        ])

        await extractZip(zip, dest)
        expect(readFileSync(path.join(dest, "a.txt"), "utf8")).toBe("alpha")
        expect(readFileSync(path.join(dest, "nested", "b.txt"), "utf8")).toBe("beta")
      } finally {
        rmRetry(base)
      }
    },
    30000,
  )

  test.skipIf(process.platform !== "win32")(
    "rejects an archive whose entries escape the destination",
    async () => {
      const base = mkdtempSync(path.join(tmpdir(), "ymcode-archive-"))
      try {
        const zip = path.join(base, "evil.zip")
        const dest = path.join(base, "dest")
        // craft a zip with a literal `..` entry (CreateFromDirectory cannot)
        await Process.run([
          "powershell",
          "-NoProfile",
          "-NonInteractive",
          "-Command",
          [
            `Add-Type -AssemblyName System.IO.Compression`,
            `$fs = [System.IO.File]::Open('${zip.replaceAll("'", "''")}', 'Create')`,
            `$arch = New-Object System.IO.Compression.ZipArchive($fs, 'Create')`,
            `$entry = $arch.CreateEntry('../evil.txt')`,
            `$writer = New-Object System.IO.StreamWriter($entry.Open())`,
            `$writer.Write('pwned')`,
            `$writer.Dispose(); $arch.Dispose(); $fs.Dispose()`,
          ].join("; "),
        ])

        await expect(extractZip(zip, dest)).rejects.toThrow()
        expect(existsSync(path.join(base, "evil.txt"))).toBe(false)
        expect(existsSync(path.join(dest, "evil.txt"))).toBe(false)
      } finally {
        rmRetry(base)
      }
    },
    30000,
  )
})
