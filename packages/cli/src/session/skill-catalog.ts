export const SKILL_CATALOG_REMINDER_MARKER = "Skills available in this session:"
export const SKILL_CATALOG_SNAPSHOT_MARKER = "Authoritative skills catalog snapshot v2:"
export const SKILL_CATALOG_METADATA_KEY = "skillCatalog"

export function isSkillCatalogReminder(text: string) {
  return text.includes(SKILL_CATALOG_REMINDER_MARKER)
}

export function isSkillCatalogSnapshot(text: string) {
  return text.includes(SKILL_CATALOG_SNAPSHOT_MARKER)
}

export function skillCatalogSnapshotVersion(metadata: Record<string, unknown> | undefined) {
  const value = metadata?.[SKILL_CATALOG_METADATA_KEY]
  if (!value || typeof value !== "object" || !("version" in value) || typeof value.version !== "string") return
  return /^[a-f0-9]{64}$/.test(value.version) ? value.version : undefined
}

export function isLegacySkillCatalogReminder(text: string) {
  return isSkillCatalogReminder(text) && !isSkillCatalogSnapshot(text)
}
