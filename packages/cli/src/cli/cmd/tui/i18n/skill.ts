export function skillDescription(
  t: (key: string) => string,
  name: string,
  fallback?: string,
  bundled?: boolean,
) {
  if (!bundled) return fallback
  return t(`tui.skill.${name}.description`) || fallback
}

export function skillTitle(
  t: (key: string) => string,
  name: string,
  fallback?: string,
  bundled?: boolean,
) {
  if (!bundled) return fallback || name
  return t(`tui.skill.${name}.title`) || fallback || name
}

export function skillWhen(t: (key: string) => string, name: string, bundled?: boolean) {
  if (!bundled) return ""
  return t(`tui.skill.${name}.when`) || ""
}

export function skillSlashAliases(t: (key: string) => string, name: string, bundled?: boolean) {
  if (!bundled) return []
  return (t(`tui.skill.${name}.slash`) || "")
    .split("|")
    .map((alias) => alias.trim())
    .filter(Boolean)
}

export function resolveSkillSlash(
  t: (key: string) => string,
  alias: string,
  commands: { name: string; source?: string; bundled?: boolean }[],
) {
  return commands.find(
    (command) => command.bundled && skillSlashAliases(t, command.name, true).includes(alias),
  )?.name
}
