import fs from "fs/promises"
import { dict as en } from "../packages/cli/src/cli/cmd/tui/i18n/en"
import { dict as zh } from "../packages/cli/src/cli/cmd/tui/i18n/zh"

const missing = Object.keys(en).filter((key) => !(key in zh))
const empty = Object.keys(zh).filter((key) => {
  const required = Boolean(en[key]?.trim()) || key.startsWith("tui.skill.")
  return required && !zh[key]?.trim()
})
const extra = Object.keys(zh).filter((key) => !(key in en) && !key.startsWith("tui.skill."))

const bundleRoot = "packages/cli/src/skill/builtin/.bundle"
const bundles = (await fs.readdir(bundleRoot, { withFileTypes: true }).catch(() => []))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
const missingSkillDescriptions = bundles.filter((name) => !zh[`tui.skill.${name}.description`]?.trim())

const report = { missing, empty, extra, missingSkillDescriptions }
if (missing.length || empty.length || extra.length || missingSkillDescriptions.length) {
  console.error(JSON.stringify(report, null, 2))
  process.exit(1)
}

console.log(
  `i18n check passed: ${Object.keys(en).length} en keys, ${Object.keys(zh).length} zh keys, ${bundles.length} skill descriptions`,
)
