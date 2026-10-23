import { $ } from "bun"

const BASELINE = (await Bun.file("docs/i18n/baseline-commit.txt").text()).trim()
const files = (await $`git ls-files "packages/cli/src/skill/builtin/**/SKILL.md"`.text())
  .trim()
  .split("\n")
  .filter(Boolean)

const normalize = (text: string) => text.replace(/\r\n/g, "\n")

// Files whose commands or URLs were deliberately changed after the upstream
// baseline (the ymcode rename dropped obsolete vendor schema URLs). Prose and
// description checks still run for these files.
const INTENTIONAL_CODE_EDITS = new Set([
  "packages/cli/src/skill/builtin/.bundle/ymcode-docs/SKILL.md",
])

function frontmatter(text: string): { name?: string; description?: string; body: string } {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match) return { body: text }
  const name = match[1].match(/^name:\s*(.+)$/m)?.[1]?.trim()
  const description = match[1].match(/^description:\s*(.+)$/m)?.[1]?.trim()
  return { name, description, body: match[2] }
}

// The brand sweep intentionally rewrites command names inside examples
// (`mimo mcp add` -> `ymcode mcp add`). Normalize those two legacy command
// words before comparing code, so the translation check only catches
// accidental code drift, not the deliberate rename.
function normalizeBrand(text: string): string {
  return text.replace(/\b(?:mimo|opencode)\b/g, "ymcode")
}

function fences(text: string): string[] {
  return [...text.matchAll(/```[\s\S]*?```/g)].map((match) => normalizeBrand(match[0]))
}
function inline(text: string): string[] {
  return [...text.matchAll(/`[^`\n]+`/g)].map((match) => normalizeBrand(match[0])).sort()
}
function urls(text: string): string[] {
  return [...text.matchAll(/https?:\/\/[^\s)>"']+/g)].map((match) => match[0]).sort()
}
function same(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index])
}

let bad = 0
for (const file of files) {
  const now = normalize(await Bun.file(file).text())
  const old = normalize(await $`git show ${BASELINE}:${file}`.text().catch(() => ""))
  const next = frontmatter(now)
  const prev = frontmatter(old)
  if (!next.name) {
    console.error(`${file}: missing frontmatter name`)
    bad++
    continue
  }
  if (prev.name && prev.name !== next.name) {
    console.error(`${file}: frontmatter name changed (${prev.name} -> ${next.name})`)
    bad++
  }
  if (old && !INTENTIONAL_CODE_EDITS.has(file)) {
    if (!same(fences(prev.body), fences(next.body))) {
      console.error(`${file}: code fence changed`)
      bad++
    }
    if (!same(inline(prev.body), inline(next.body))) {
      console.error(`${file}: inline code changed`)
      bad++
    }
    if (!same(urls(prev.body), urls(next.body))) {
      console.error(`${file}: URL changed`)
      bad++
    }
  }
  const outside = next.body.replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]+`/g, "")
  if (/[A-Za-z]{3,}/.test(outside) && !/[\u4e00-\u9fff]/.test(outside)) {
    console.error(`${file}: prose is not translated`)
    bad++
  }
  if (!next.description || !/[\u4e00-\u9fff]/.test(next.description)) {
    console.error(`${file}: description is not translated`)
    bad++
  }
}

if (bad > 0) {
  console.error(`\n${bad} skill check failure(s) across ${files.length} files`)
  process.exit(1)
}
console.log(`skill check passed: ${files.length} files`)
