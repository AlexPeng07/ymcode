import fs from "fs/promises"
import path from "path"
import { EOL } from "os"
import { Effect } from "effect"
import { AppRuntime } from "@/effect/app-runtime"
import { Memory } from "../../memory"
import { walkMemoryDir } from "../../memory/reconcile"
import { MemoryFtsTable } from "../../memory/fts.sql"
import { parse as parseInstinct, type Info as InstinctInfo } from "../../memory/instinct"
import { similarity } from "../../memory/instinct-service"
import { Database } from "../../storage"
import { Token } from "../../util"
import { bootstrap } from "../bootstrap"
import { cmd } from "./cmd"

const STALE_DAYS = 30

type Issue = { kind: string; detail: string }

function duplicateBullets(text: string) {
  const counts = new Map<string, number>()
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line.startsWith("- ") || line.length <= 20) continue
    counts.set(line, (counts.get(line) ?? 0) + 1)
  }
  return [...counts.entries()].filter(([, count]) => count > 1)
}

function daysSince(time: number) {
  return Math.floor((Date.now() - time) / (24 * 60 * 60 * 1000))
}

function projectSections(text: string) {
  const sections: string[] = []
  let current = ""
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith("## ")) current = line.slice(3).trim()
    if (
      line.startsWith("### ") &&
      ["Rules", "Architecture Decisions", "Discovered Durable Knowledge"].includes(current)
    ) {
      sections.push(line.slice(4).trim())
    }
  }
  return sections
}

const MemoryDoctorCommand = cmd({
  command: "doctor",
  describe: "检查记忆文件、重复项、陈旧内容与 FTS 索引一致性",
  builder: (yargs) => yargs.option("stale-days", { type: "number", default: STALE_DAYS }),
  async handler(args) {
    await bootstrap(process.cwd(), async () => {
      const { root, reconciled } = await AppRuntime.runPromise(
        Effect.gen(function* () {
          const memory = yield* Memory.Service
          return { root: yield* memory.root(), reconciled: yield* memory.reconcile() }
        }),
      )

      const files = (await walkMemoryDir(root)).filter((file) => {
        const rel = path.relative(root, file).replaceAll("\\", "/")
        return /^(global|projects|sessions)\//.test(rel)
      })
      const rows = Database.use((db) =>
        db
          .select({ path: MemoryFtsTable.path, fingerprint: MemoryFtsTable.fingerprint })
          .from(MemoryFtsTable)
          .all(),
      ).filter((row) => row.path.startsWith(root + path.sep))
      const indexed = new Set(rows.map((row) => row.path))
      const onDisk = new Set(files)

      const issues: Issue[] = []
      const scope = { global: 0, projects: 0, sessions: 0 }
      let totalTokens = 0

      for (const file of files.toSorted()) {
        const rel = path.relative(root, file).replaceAll("\\", "/")
        const stat = await fs.stat(file).catch(() => undefined)
        if (!stat) continue
        const text = await fs.readFile(file, "utf8").catch(() => "")
        totalTokens += Token.estimate(text)

        const first = rel.split("/")[0]
        if (first === "global" || first === "projects" || first === "sessions") scope[first]++

        for (const [line, count] of duplicateBullets(text)) {
          issues.push({ kind: "重复", detail: `${rel}: ${count} 次 — ${line.slice(0, 80)}` })
        }

        const age = daysSince(stat.mtimeMs)
        if (age > Number(args.staleDays ?? STALE_DAYS)) {
          issues.push({ kind: "陈旧", detail: `${rel}: ${age} 天未更新` })
        }

        if (rel === "global/MEMORY.md") {
          const sections = projectSections(text)
          if (sections.length > 0) {
            issues.push({
              kind: "全局污染",
              detail: `global/MEMORY.md 含 ${sections.length} 个项目小节：${sections.join("、")}`,
            })
          }
        }

        if (!indexed.has(file)) issues.push({ kind: "索引", detail: `${rel}: 未进入 FTS 索引` })
      }

      for (const row of rows) {
        if (!onDisk.has(row.path)) issues.push({ kind: "索引", detail: `${row.path}: 索引存在但文件已删除` })
      }

      const lines = [
        "记忆健康检查",
        `根目录: ${root}`,
        `文件: ${files.length}（global ${scope.global}、projects ${scope.projects}、sessions ${scope.sessions}），约 ${totalTokens.toLocaleString()} tokens`,
        `索引: ${files.length}/${rows.length}（本次 reconcile: 更新 ${reconciled.indexed}、清理 ${reconciled.pruned}）`,
      ]

      // Instinct usage loop: parse every instinct file and report active rules
      // that were never recalled, plus near-duplicate active pairs.
      const instincts: Array<{ rel: string; info: InstinctInfo }> = []
      for (const file of files) {
        if (!/instincts[/\\][^/\\]+\.md$/.test(path.relative(root, file))) continue
        try {
          instincts.push({
            rel: path.relative(root, file).replaceAll("\\", "/"),
            info: parseInstinct(await fs.readFile(file, "utf8")).info,
          })
        } catch {
          // malformed instinct files are reported by the generic FTS/dup checks
        }
      }
      const active = instincts.filter((entry) => entry.info.status === "active")
      if (instincts.length > 0) {
        lines.push(`直觉: 共 ${instincts.length} 条，active ${active.length}，candidate ${instincts.length - active.length}`)
      }
      const unused = active.filter((entry) => entry.info.usage_count === 0)
      if (unused.length > 0) {
        const oldest = unused.toSorted((a, b) => a.info.last_seen_at.localeCompare(b.info.last_seen_at))[0]!
        issues.push({
          kind: "未使用",
          detail: `${unused.length} 条 active 规则从未被召回（instinct get）；最旧 ${oldest.info.id}，last_seen ${oldest.info.last_seen_at.slice(0, 10)}。未召回超 30 天的规则会在 review 时加速衰减`,
        })
      }
      const pairs: Array<{ a: InstinctInfo; b: InstinctInfo; score: number }> = []
      for (let i = 0; i < active.length; i++) {
        for (let j = i + 1; j < active.length; j++) {
          const score = similarity(active[i]!.info.description, active[j]!.info.description)
          if (score >= 0.6) pairs.push({ a: active[i]!.info, b: active[j]!.info, score })
        }
      }
      for (const pair of pairs.sort((x, y) => y.score - x.score).slice(0, 5)) {
        issues.push({
          kind: "疑似重复",
          detail: `${pair.a.id} ≈ ${pair.b.id}（相似度 ${pair.score.toFixed(2)}）：${pair.a.description.slice(0, 50)}`,
        })
      }

      if (issues.length === 0) {
        lines.push("", "未发现明显问题。")
      } else {
        lines.push("", `问题 (${issues.length}):`)
        for (const issue of issues) lines.push(`- [${issue.kind}] ${issue.detail}`)
        lines.push(
          "",
          "建议:",
          "- 项目专属知识放到 projects/<project_id>/MEMORY.md；global/MEMORY.md 只保留用户偏好与跨项目规则。",
          "- 删除重复条目后重新运行 `ymcode memory doctor`，索引会在读取时自动 reconcile。",
          "- 非 Git 项目按目录哈希隔离记忆，不再共用 projects/global。",
        )
      }

      process.stdout.write(lines.join(EOL) + EOL)
    })
  },
})

export const MemoryCommand = cmd({
  command: "memory",
  describe: "记忆系统维护与健康检查",
  builder: (yargs) => yargs.command(MemoryDoctorCommand).demandCommand(),
  async handler() {},
})
