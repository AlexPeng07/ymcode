const LEGACY_SCHEMA =
  /^(\s*)"\$schema"\s*:\s*"(?:https:\/\/opencode\.ai\/[^"]*|https:\/\/mimo\.xiaomi\.com\/[^"]*)"\s*,?\s*$/m

export function stripLegacySchema(text: string): string | undefined {
  if (!LEGACY_SCHEMA.test(text)) return undefined
  return text.replace(LEGACY_SCHEMA, "").replace(/,(\s*})/g, "$1").replace(/\n{3,}/g, "\n\n")
}
