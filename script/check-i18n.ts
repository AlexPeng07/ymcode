import fs from "fs/promises"
import { Glob } from "bun"
import { dict as en } from "../packages/cli/src/cli/cmd/tui/i18n/en"
import { dict as zh } from "../packages/cli/src/cli/cmd/tui/i18n/zh"

const enDict = en as Record<string, string | undefined>
const zhDict = zh as Record<string, string | undefined>

// Coverage of the optional locale dictionaries (warning only — they merge over
// the English base at runtime, so partial coverage degrades gracefully).
const OPTIONAL_LOCALES = ["zht", "es", "fr", "ja", "ru"] as const
const coverage = await Promise.all(
  OPTIONAL_LOCALES.map(async (locale) => {
    const mod = (await import(`../packages/cli/src/cli/cmd/tui/i18n/${locale}`)) as {
      dict: Record<string, string | undefined>
    }
    const keys = Object.keys(mod.dict)
    return `${locale}: ${keys.length}/${Object.keys(enDict).length}`
  }),
)

const missing = Object.keys(enDict).filter((key) => !(key in zhDict))
const empty = Object.keys(zhDict).filter((key) => {
  const required = Boolean(enDict[key]?.trim()) || key.startsWith("tui.skill.")
  return required && !zhDict[key]?.trim()
})
const extra = Object.keys(zhDict).filter((key) => !(key in enDict) && !key.startsWith("tui.skill."))

const bundleRoot = "packages/cli/src/skill/builtin/.bundle"
const bundles = (await fs.readdir(bundleRoot, { withFileTypes: true }).catch(() => []))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
const missingSkillDescriptions = bundles.filter((name) => !zhDict[`tui.skill.${name}.description`]?.trim())
const missingSkillMeta = bundles.filter(
  (name) => !zhDict[`tui.skill.${name}.title`]?.trim() || !zhDict[`tui.skill.${name}.when`]?.trim(),
)

// en/zh parity cannot catch a t("...") call whose key was never added: the
// translator returns undefined at runtime and the UI renders blank. Scan every
// static reference under the TUI tree and require it to exist in the base dict.
const tuiRoot = "packages/cli/src/cli/cmd/tui"
const missingReferences = new Set<string>()
for await (const relative of new Glob("**/*.{ts,tsx}").scan(tuiRoot)) {
  const file = `${tuiRoot}/${relative}`
  const source = await Bun.file(file).text()
  for (const match of source.matchAll(/\bt\(\s*["']([^"']+)["']/g)) {
    if (!(match[1] in enDict)) missingReferences.add(`${file}: ${match[1]}`)
  }
}

const report = { missing, empty, extra, missingSkillDescriptions, missingSkillMeta, missingReferences: [...missingReferences] }
if (
  missing.length ||
  empty.length ||
  extra.length ||
  missingSkillDescriptions.length ||
  missingSkillMeta.length ||
  missingReferences.size
) {
  console.error(JSON.stringify(report, null, 2))
  process.exit(1)
}

console.log(
  `i18n check passed: ${Object.keys(enDict).length} en keys, ${Object.keys(zhDict).length} zh keys, ${bundles.length} skill descriptions`,
)
console.log(`i18n locale coverage (optional, en-base fallback): ${coverage.join(", ")}`)
