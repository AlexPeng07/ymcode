import fs from "fs/promises"
import path from "path"
import os from "os"
import { xdgCache, xdgConfig, xdgData, xdgState } from "xdg-basedir"
import { resolveYmcodeHome } from "@ymcode/shared/global"

export type MigrationResult = {
  copied: string[]
  skipped: string[]
  renamed: string[]
}

type PathPair = [from: string, to: string]

type Paths = Record<"config" | "data" | "state" | "cache", PathPair> & { home: PathPair }

type Options = {
  home?: string
  dryRun?: boolean
  overrides?: Partial<Record<keyof Paths, PathPair>>
}

async function exists(target: string): Promise<boolean> {
  return fs.stat(target).then(() => true).catch(() => false)
}

function legacyPaths(home: string, env: NodeJS.ProcessEnv) {
  const root = env.MIMOCODE_HOME
  if (root) {
    return {
      data: path.join(root, "data"),
      cache: path.join(root, "cache"),
      config: path.join(root, "config"),
      state: path.join(root, "state"),
    }
  }
  return {
    data: path.join(xdgData!, "mimocode"),
    cache: path.join(xdgCache!, "mimocode"),
    config: path.join(xdgConfig!, "mimocode"),
    state: path.join(xdgState!, "mimocode"),
  }
}

export async function migrateFromMimocode(opts: Options = {}): Promise<MigrationResult> {
  const env = process.env
  const home = opts.home ?? env.HOME ?? env.USERPROFILE ?? os.homedir()
  const old = legacyPaths(home, env)
  const next = resolveYmcodeHome(env)
  const pairs: Paths = {
    config: opts.overrides?.config ?? [old.config, next.config],
    data: opts.overrides?.data ?? [old.data, next.data],
    state: opts.overrides?.state ?? [old.state, next.state],
    cache: opts.overrides?.cache ?? [old.cache, next.cache],
    home: opts.overrides?.home ?? [path.join(home, ".mimocode"), path.join(home, ".ymcode")],
  }

  const result: MigrationResult = { copied: [], skipped: [], renamed: [] }
  for (const [from, to] of Object.values(pairs)) {
    if (!(await exists(from))) {
      result.skipped.push(from)
      continue
    }
    if (await exists(to)) {
      result.skipped.push(to)
      continue
    }
    if (!opts.dryRun) await fs.cp(from, to, { recursive: true, force: false, errorOnExist: false })
    result.copied.push(from)
  }

  if (opts.dryRun) return result

  for (const [fromDir, toDir] of [pairs.data, pairs.config]) {
    for (const [oldName, newName] of [
      ["mimocode.db", "ymcode.db"],
      ["mimocode.db-wal", "ymcode.db-wal"],
      ["mimocode.db-shm", "ymcode.db-shm"],
      ["mimocode.json", "ymcode.json"],
      ["mimocode.jsonc", "ymcode.jsonc"],
    ]) {
      const from = path.join(toDir, oldName)
      const to = path.join(toDir, newName)
      if (!(await exists(from)) || (await exists(to))) continue
      await fs.rename(from, to)
      result.renamed.push(to)
    }
  }

  const marker = path.join(pairs.data[1], ".migrated-from-mimocode")
  if (await exists(pairs.data[1])) {
    await fs.writeFile(marker, JSON.stringify({ at: new Date().toISOString(), from: pairs.data[0] }) + "\n")
  }
  return result
}
