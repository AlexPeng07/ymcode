import { $, Glob } from "bun"

const BASELINE = (await Bun.file("docs/i18n/baseline-commit.txt").text()).trim()
const roots = [
  "packages/cli/src/agent/prompt",
  "packages/cli/src/command/template",
  "packages/cli/src/tool",
  "packages/cli/src/session/prompt",
]
const files: string[] = []
for (const root of roots) {
  for await (const file of new Glob("*.txt").scan(root)) files.push(`${root}/${file}`)
}
const extra = "packages/cli/src/agent/generate.txt"
try {
  await Bun.file(extra).text()
  files.push(extra)
} catch {}

const protectedPaths = [
  "checkpoint.md",
  "MEMORY.md",
  "INSTINCTS.md",
  "§1",
  "§4",
  "§7",
  "§10",
  "## Rules",
  "## Architecture decisions",
  "## Discovered durable knowledge",
]

const normalize = (text: string) => text.replace(/\r\n/g, "\n")

function fences(text: string): string[] {
  return [...text.matchAll(/```[\s\S]*?```/g)].map((match) => match[0])
}
function inline(text: string): string[] {
  return [...text.matchAll(/`[^`\n]+`/g)].map((match) => match[0]).sort()
}
function urls(text: string): string[] {
  return [...text.matchAll(/https?:\/\/[^\s)>"']+/g)].map((match) => match[0]).sort()
}
function same(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index])
}

let bad = 0
for (const file of files.sort()) {
  const now = normalize(await Bun.file(file).text())
  const old = normalize(await $`git show ${BASELINE}:${file}`.text().catch(() => ""))
  if (old) {
    if (!same(fences(old), fences(now))) {
      console.error(`${file}: code fence changed`)
      bad++
    }
    if (!same(inline(old), inline(now))) {
      console.error(`${file}: inline code changed`)
      bad++
    }
    if (!same(urls(old), urls(now))) {
      console.error(`${file}: URL changed`)
      bad++
    }
    for (const token of protectedPaths) {
      if (old.includes(token) && !now.includes(token)) {
        console.error(`${file}: lost protected path ${token}`)
        bad++
      }
    }
  }
  const outside = now.replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]+`/g, "")
  if (/[A-Za-z]{3,}/.test(outside) && !/[\u4e00-\u9fff]/.test(outside)) {
    console.error(`${file}: prose is not translated`)
    bad++
  }
}

if (bad > 0) {
  console.error(`\n${bad} prompt check failure(s) across ${files.length} files`)
  process.exit(1)
}
console.log(`prompt check passed: ${files.length} files`)
