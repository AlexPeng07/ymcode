import { Glob } from "bun"
import fs from "fs/promises"

type Allow = { path: string; reason: string }
const allow = JSON.parse(await Bun.file("script/i18n-allowlist.json").text()) as Allow[]
const allowPaths = new Set(allow.map((entry) => entry.path))

const roots = [
  "packages/cli/src/cli/cmd/tui",
  "packages/cli/src/cli",
]
const files: string[] = []
for (const root of roots) {
  for await (const file of new Glob("**/*.{ts,tsx}").scan(root)) {
    if (file.endsWith(".d.ts")) continue
    files.push(`${root}/${file}`)
  }
}

const candidates: string[] = []
const prop = /\b(?:title|placeholder|description|message|label|text|tooltip|hint)\s*=\s*["']([^"']{2,})["']/g
const jsx = />([^<>{}]*[A-Za-z\u4e00-\u9fff][^<>{}]*)</g
const technical = /^(?:[\w./-]+|https?:\/\/\S+|\/[\w./-]+|#[0-9a-fA-F]{3,8}|[a-z]+(?:-[a-z]+)+)$/

for (const file of files.sort()) {
  if (allowPaths.has(file)) continue
  const text = await fs.readFile(file, "utf8").catch(() => "")
  const lines = text.split("\n")
  lines.forEach((line, index) => {
    if (line.includes("t(") || line.trim().startsWith("//") || line.trim().startsWith("*")) return
    for (const re of [prop, jsx]) {
      re.lastIndex = 0
      for (const match of line.matchAll(re)) {
        const value = (match[1] ?? "").trim()
        if (!value || technical.test(value)) continue
        if (value.length < 2) continue
        candidates.push(`${file}:${index + 1}: ${value}`)
      }
    }
  })
}

await fs.mkdir("docs/verification", { recursive: true })
await fs.writeFile("docs/verification/i18n-audit.txt", candidates.join("\n") + "\n")
console.log(`${candidates.length} candidate strings -> docs/verification/i18n-audit.txt`)
