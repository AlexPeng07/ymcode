import { describe, expect, test } from "bun:test"
import fs from "fs/promises"
import path from "path"
import os from "os"
import { migrateFromymcode } from "../../src/installation/migrate"

async function paths(root: string) {
  return {
    overrides: {
      config: [path.join(root, "old", "config"), path.join(root, "new", "config")] as [string, string],
      data: [path.join(root, "old", "data"), path.join(root, "new", "data")] as [string, string],
      state: [path.join(root, "old", "state"), path.join(root, "new", "state")] as [string, string],
      cache: [path.join(root, "old", "cache"), path.join(root, "new", "cache")] as [string, string],
      home: [path.join(root, "old", "home"), path.join(root, "new", "home")] as [string, string],
    },
  }
}

describe("migrateFromymcode", () => {
  test("copies config, memory and database without deleting the source", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ymcode-migrate-"))
    const config = path.join(root, "old", "config")
    const data = path.join(root, "old", "data")
    await fs.mkdir(config, { recursive: true })
    await fs.mkdir(path.join(data, "memory", "global"), { recursive: true })
    await fs.writeFile(path.join(config, "mimocode.json"), "{}")
    await fs.writeFile(path.join(data, "mimocode.db"), "db")
    await fs.writeFile(path.join(data, "mimocode.db-wal"), "wal")
    await fs.writeFile(path.join(data, "memory", "global", "MEMORY.md"), "# Global memory\n")

    const result = await migrateFromymcode({ home: root, ...(await paths(root)) })

    expect(result.copied).toContain(config)
    expect(await fs.readFile(path.join(root, "new", "config", "ymcode.json"), "utf8")).toBe("{}")
    expect(await fs.readFile(path.join(root, "new", "data", "ymcode.db"), "utf8")).toBe("db")
    expect(await fs.readFile(path.join(root, "new", "data", "ymcode.db-wal"), "utf8")).toBe("wal")
    expect(await fs.readFile(path.join(root, "new", "data", "memory", "global", "MEMORY.md"), "utf8")).toContain("Global memory")
    expect(await fs.readFile(path.join(config, "mimocode.json"), "utf8")).toBe("{}")
    expect(await fs.readFile(path.join(data, "mimocode.db"), "utf8")).toBe("db")
    expect(await fs.stat(path.join(root, "new", "data", ".migrated-from-mimocode"))).toBeDefined()
  })

  test("dry run reports what would be copied without writing", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ymcode-migrate-"))
    await fs.mkdir(path.join(root, "old", "config"), { recursive: true })
    await fs.writeFile(path.join(root, "old", "config", "mimocode.json"), "{}")

    const result = await migrateFromymcode({ home: root, dryRun: true, ...(await paths(root)) })

    expect(result.copied).toContain(path.join(root, "old", "config"))
    expect(await fs.stat(path.join(root, "new", "config")).catch(() => null)).toBeNull()
  })

  test("does not overwrite an existing target", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ymcode-migrate-"))
    await fs.mkdir(path.join(root, "old", "config"), { recursive: true })
    await fs.mkdir(path.join(root, "new", "config"), { recursive: true })
    await fs.writeFile(path.join(root, "old", "config", "mimocode.json"), '{"old":true}')
    await fs.writeFile(path.join(root, "new", "config", "ymcode.json"), '{"new":true}')

    const result = await migrateFromymcode({ home: root, ...(await paths(root)) })

    expect(result.skipped).toContain(path.join(root, "new", "config"))
    expect(await fs.readFile(path.join(root, "new", "config", "ymcode.json"), "utf8")).toBe('{"new":true}')
  })
})
