import { DialogSelect, type DialogSelectOption } from "@tui/ui/dialog-select"
import { createResource, createMemo } from "solid-js"
import { useDialog } from "@tui/ui/dialog"
import { useSDK } from "@tui/context/sdk"
import { useLanguage } from "@tui/context/language"
import { skillDescription, skillSlashAliases, skillTitle, skillWhen } from "@tui/i18n/skill"

export type DialogSkillProps = {
  onSelect: (skill: string) => void
}

export function DialogSkill(props: DialogSkillProps) {
  const dialog = useDialog()
  const sdk = useSDK()
  const lang = useLanguage()
  dialog.setSize("large")

  const [skills] = createResource(async () => {
    const result = await sdk.client.app.skills()
    return result.data ?? []
  })

  const title = (skill: { name: string; bundled?: boolean }) =>
    skillTitle(lang.t, skill.name, undefined, skill.bundled)

  const options = createMemo<DialogSelectOption<string>[]>(() => {
    const list = skills() ?? []
    const maxWidth = Math.max(0, ...list.map((skill) => Bun.stringWidth(title(skill))))
    return list.map((skill) => {
      const name = title(skill)
      return {
        title: name + " ".repeat(Math.max(0, maxWidth - Bun.stringWidth(name))),
        description: skillDescription(lang.t, skill.name, skill.description, skill.bundled)
          ?.replace(/\s+/g, " ")
          .trim(),
        value: skill.name,
        category: lang.t("tui.skills.category"),
        keywords: [skill.name, ...skillSlashAliases(lang.t, skill.name, skill.bundled)],
        footer: `/${skill.name}`,
        onSelect: () => {
          props.onSelect(skill.name)
          dialog.clear()
        },
      }
    })
  })

  const detail = (option: DialogSelectOption<string>) => {
    const skill = (skills() ?? []).find((item) => item.name === option.value)
    if (!skill) return undefined
    const when = skillWhen(lang.t, skill.name, skill.bundled)
    const alias = skillSlashAliases(lang.t, skill.name, skill.bundled)[0] ?? skill.name
    return [
      when ? lang.t("tui.skills.detail.when", { when }) : undefined,
      lang.t("tui.skills.detail.trigger", { command: `/${alias}` }),
    ]
      .filter(Boolean)
      .join("\n")
  }

  return (
    <DialogSelect
      title={lang.t("tui.skills.title")}
      placeholder={lang.t("tui.skills.placeholder")}
      hint={lang.t("tui.skills.hint")}
      options={options()}
      detail={detail}
    />
  )
}
