import fs from "fs/promises"
import { dict as en } from "../packages/cli/src/cli/cmd/tui/i18n/en"
import { dict as zh } from "../packages/cli/src/cli/cmd/tui/i18n/zh"

const enDict = en as Record<string, string | undefined>
const zhDict = zh as Record<string, string | undefined>

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

const report = { missing, empty, extra, missingSkillDescriptions }
if (missing.length || empty.length || extra.length || missingSkillDescriptions.length) {
  console.error(JSON.stringify(report, null, 2))
  process.exit(1)
}

console.log(
  `i18n check passed: ${Object.keys(enDict).length} en keys, ${Object.keys(zhDict).length} zh keys, ${bundles.length} skill descriptions`,
)
