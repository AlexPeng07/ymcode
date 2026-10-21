import { $ } from "bun"
import fs from "fs/promises"

type Allow = { path: string; reason: string }

const allow = JSON.parse(await Bun.file("script/brand-allowlist.json").text()) as Allow[]
const allowed = (file: string) =>
  allow.some((entry) => file === entry.path || file.startsWith(entry.path.replace(/\/$/, "") + "/"))

const patterns: Array<{ name: string; pattern: RegExp }> = [
  { name: "package-scope", pattern: /@mimo-ai\//g },
  { name: "env-prefix", pattern: /\bMIMOCODE_[A-Z0-9_]+\b/g },
  { name: "slug", pattern: /\bmimocode\b/gi },
  { name: "brand", pattern: /\bMiMoCode\b|\bMiMo Code\b|\bMiMo-Code\b/g },
  { name: "binary", pattern: /\bmimo\.js\b|\bmimo\.exe\b/g },
  { name: "command", pattern: /\bmimo\b(?=\s+(?:run|serve|attach|models|import|upgrade|uninstall|db|instinct)\b)/g },
]

const textFile = /\.(ts|tsx|js|mjs|cjs|json|jsonc|md|mdx|txt|yml|yaml|sh|toml|sql)$/
const files = (await $`git ls-files`.text())
  .trim()
  .split("\n")
  .filter((file) => file && textFile.test(file))

let hits = 0
for (const file of files) {
  if (allowed(file)) continue
  const text = await fs.readFile(file, "utf8").catch(() => "")
  for (const { name, pattern } of patterns) {
    for (const match of text.matchAll(pattern)) {
      const line = text.slice(0, match.index).split("\n").length
      console.error(`${file}:${line}: [${name}] ${match[0]}`)
      hits++
    }
  }
}

if (hits > 0) {
  console.error(`\n${hits} forbidden first-party brand token(s).`)
  process.exit(1)
}

console.log("brand check passed")
