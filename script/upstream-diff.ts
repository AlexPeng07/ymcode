import fs from "fs/promises"
import path from "path"
import { createHash } from "crypto"

const ROOT = path.resolve(".")
const UPSTREAM = path.join(ROOT, "_upstream_mimo")

const IGNORED = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".scratch",
  ".trae",
  ".ymcode",
  ".mimocode",
  "_upstream_mimo",
])

type Entry = { rel: string; abs: string; size: number }
type Diff = { changed: string[]; added: string[]; deleted: string[] }
type Group = { changed: number; added: number; deleted: number }

async function exists(target: string) {
  return fs
    .stat(target)
    .then(() => true)
    .catch(() => false)
}

function ignored(rel: string) {
  if (!rel) return false
  const parts = rel.split(/[\\/]/)
  return parts.some((part) => IGNORED.has(part))
}

async function walk(dir: string, base = ""): Promise<Map<string, Entry>> {
  const result = new Map<string, Entry>()
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const rel = base ? `${base}/${entry.name}` : entry.name
    if (ignored(rel)) continue
    const abs = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      for (const [key, value] of await walk(abs, rel)) result.set(key, value)
      continue
    }
    if (!entry.isFile()) continue
    const stat = await fs.stat(abs)
    result.set(rel, { rel, abs, size: stat.size })
  }
  return result
}

async function hash(file: Entry) {
  return createHash("sha256").update(await fs.readFile(file.abs)).digest("hex")
}

function groupOf(rel: string) {
  const [head] = rel.split("/")
  return rel.includes("/") ? head! : "(root)"
}

function parseArgs(argv: string[]) {
  return {
    all: argv.includes("--all"),
    json: argv.includes("--json"),
    help: argv.includes("--help") || argv.includes("-h"),
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    console.log(`Usage: bun run script/upstream-diff.ts [--all] [--json]

Compare the working tree against the read-only _upstream_mimo/ snapshot.

  --all   print every differing path (default: first 20 per group)
  --json  print machine-readable JSON instead of the summary`)
    return
  }

  if (!(await exists(UPSTREAM))) {
    console.error(`_upstream_mimo/ not found at ${UPSTREAM}`)
    console.error("Restore the upstream snapshot before running this script.")
    process.exitCode = 1
    return
  }

  const [current, upstream] = await Promise.all([walk(ROOT), walk(UPSTREAM)])
  const diff: Diff = { changed: [], added: [], deleted: [] }

  for (const [rel, entry] of current) {
    const reference = upstream.get(rel)
    if (!reference) {
      diff.added.push(rel)
      continue
    }
    if (entry.size !== reference.size || (await hash(entry)) !== (await hash(reference))) {
      diff.changed.push(rel)
    }
  }
  for (const rel of upstream.keys()) {
    if (!current.has(rel)) diff.deleted.push(rel)
  }

  diff.changed.sort()
  diff.added.sort()
  diff.deleted.sort()

  if (args.json) {
    const groups: Record<string, Group> = {}
    for (const [kind, files] of Object.entries(diff) as Array<[keyof Diff, string[]]>) {
      for (const file of files) {
        const group = groupOf(file)
        groups[group] ??= { changed: 0, added: 0, deleted: 0 }
        groups[group][kind]++
      }
    }
    console.log(
      JSON.stringify(
        {
          base: "_upstream_mimo",
          changed: diff.changed,
          added: diff.added,
          deleted: diff.deleted,
          groups,
        },
        null,
        2,
      ),
    )
    return
  }

  const groups: Record<string, Group> = {}
  for (const [kind, files] of Object.entries(diff) as Array<[keyof Diff, string[]]>) {
    for (const file of files) {
      const group = groupOf(file)
      groups[group] ??= { changed: 0, added: 0, deleted: 0 }
      groups[group][kind]++
    }
  }

  console.log(`upstream snapshot: _upstream_mimo`)
  console.log(
    `changed ${diff.changed.length} | added ${diff.added.length} | deleted ${diff.deleted.length}`,
  )
  console.log("")

  const limit = args.all ? Infinity : 20
  const names: Array<[keyof Diff, string]> = [
    ["changed", "changed"],
    ["added", "added"],
    ["deleted", "deleted"],
  ]
  for (const group of Object.keys(groups).sort()) {
    const stats = groups[group]
    console.log(
      `${group.padEnd(18)} changed ${String(stats.changed).padStart(4)} | added ${String(stats.added).padStart(4)} | deleted ${String(stats.deleted).padStart(4)}`,
    )
    for (const [kind, label] of names) {
      const files = diff[kind].filter((file) => groupOf(file) === group)
      if (files.length === 0) continue
      for (const file of files.slice(0, limit)) console.log(`  ${label.padEnd(8)} ${file}`)
      if (files.length > limit) console.log(`  ... ${files.length - limit} more`)
    }
  }
  console.log("")
  console.log("Use --all to list every path, or --json for machine-readable output.")
}

await main()
