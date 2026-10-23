import { describe, test, expect } from "bun:test"
import {
  resolveSkillSlash,
  skillDescription,
  skillSlashAliases,
  skillTitle,
  skillWhen,
} from "../../src/cli/cmd/tui/i18n/skill"
import { slashCommandDescription } from "../../src/cli/cmd/tui/i18n/slash-command"
import { dict as en } from "../../src/cli/cmd/tui/i18n/en"
import { dict as es } from "../../src/cli/cmd/tui/i18n/es"
import { dict as fr } from "../../src/cli/cmd/tui/i18n/fr"
import { dict as ja } from "../../src/cli/cmd/tui/i18n/ja"
import { dict as ru } from "../../src/cli/cmd/tui/i18n/ru"
import { dict as zh } from "../../src/cli/cmd/tui/i18n/zh"
import { dict as zht } from "../../src/cli/cmd/tui/i18n/zht"

describe("skillDescription", () => {
  const t = (key: string) => {
    const translations: Record<string, string> = {
      "tui.skill.example.description": "Translated example description",
    }
    return translations[key] as string
  }

  test("returns fallback for non-bundled skill", () => {
    expect(skillDescription(t, "my-custom-skill", "Custom description", false)).toBe("Custom description")
  })

  test("returns fallback when bundled is undefined", () => {
    expect(skillDescription(t, "example", "Fallback")).toBe("Fallback")
  })

  test("returns translation for bundled builtin skill", () => {
    expect(skillDescription(t, "example", "Fallback", true)).toBe("Translated example description")
  })

  test("returns fallback when translation key is missing", () => {
    expect(skillDescription(t, "unknown-bundled", "Fallback", true)).toBe("Fallback")
  })

  test("user override: same name as builtin but not bundled shows fallback", () => {
    expect(skillDescription(t, "example", "User custom example", false)).toBe("User custom example")
  })

  test("returns localized slash aliases only for bundled skills", () => {
    const translate = (key: string) => ({ "tui.skill.product-design.slash": "产品设计|界面设计" })[key] as string
    expect(skillSlashAliases(translate, "product-design", true)).toEqual(["产品设计", "界面设计"])
    expect(skillSlashAliases(translate, "product-design", false)).toEqual([])
  })

  test("resolves a localized slash alias to its bundled skill name", () => {
    const translate = (key: string) => ({ "tui.skill.product-design.slash": "产品设计" })[key] as string
    expect(
      resolveSkillSlash(translate, "产品设计", [
        { name: "product-design", source: "skill", bundled: true },
        { name: "other", source: "skill", bundled: true },
      ]),
    ).toBe("product-design")
    expect(resolveSkillSlash(translate, "产品设计", [{ name: "product-design", source: "command", bundled: true }])).toBe(
      "product-design",
    )
    expect(resolveSkillSlash(translate, "产品设计", [{ name: "product-design", source: "skill" }])).toBeUndefined()
  })

  test("every localized bundled skill has a unique Chinese slash alias", () => {
    for (const dict of [zh, zht]) {
      const descriptions = Object.keys(dict).filter(
        (key) => key.startsWith("tui.skill.") && key.endsWith(".description"),
      )
      for (const key of descriptions) {
        expect(dict[key.replace(/\.description$/, ".slash") as keyof typeof dict]).toBeTruthy()
      }
      const aliases = Object.entries(dict)
        .filter(([key]) => key.startsWith("tui.skill.") && key.endsWith(".slash"))
        .flatMap(([, value]) => value.split("|"))
      expect(new Set(aliases).size).toBe(aliases.length)
    }
  })

  test("agent CLI skills have descriptions in every TUI locale", () => {
    for (const dict of [en, es, fr, ja, ru, zh, zht]) {
      expect(dict["tui.skill.playwright.description"]).toBeTruthy()
      expect(dict["tui.skill.codex.description"]).toBeTruthy()
      expect(dict["tui.skill.claude-code.description"]).toBeTruthy()
      expect(dict["tui.skill.grok-build.description"]).toBeTruthy()
    }
  })

  test("data analytics, product design, and sales skills have descriptions in every TUI locale", () => {
    for (const dict of [en, es, fr, ja, ru, zh, zht]) {
      expect(dict["tui.skill.data-analytics.description"]).toBeTruthy()
      expect(dict["tui.skill.product-design.description"]).toBeTruthy()
      expect(dict["tui.skill.sales.description"]).toBeTruthy()
    }
  })

  test("every bundled skill has a Chinese title and when hint", () => {
    const names = Object.keys(zh)
      .filter((key) => key.startsWith("tui.skill.") && key.endsWith(".description"))
      .map((key) => key.slice("tui.skill.".length, -".description".length))
    for (const name of names) {
      expect(zh[`tui.skill.${name}.title` as keyof typeof zh]).toBeTruthy()
      expect(zh[`tui.skill.${name}.when` as keyof typeof zh]).toBeTruthy()
    }
  })
})

describe("slashCommandDescription", () => {
  const builtins = ["init", "review", "dream", "distill", "instinct", "goal", "rebuild", "loops", "deep-research"]

  test("translates every built-in server command", () => {
    for (const name of builtins) {
      expect(zh[`tui.slash.${name}.description` as keyof typeof zh]).toBeTruthy()
      expect(
        slashCommandDescription((key) => zh[key as keyof typeof zh] ?? "", name, "fallback"),
      ).not.toBe("fallback")
    }
  })

  test("leaves user, MCP, and external command descriptions untouched", () => {
    expect(slashCommandDescription((key) => zh[key as keyof typeof zh] ?? "", "my-command", "mine")).toBe("mine")
  })
})

describe("skillTitle", () => {
  const t = (key: string) =>
    ({ "tui.skill.example.title": "示例技能", "tui.skill.example.when": "需要示例时" })[key] as string

  test("returns the localized title for bundled skills", () => {
    expect(skillTitle(t, "example", undefined, true)).toBe("示例技能")
  })

  test("falls back to the skill name for non-bundled skills", () => {
    expect(skillTitle(t, "example", undefined, false)).toBe("example")
  })

  test("falls back to the skill name when the translation is missing", () => {
    expect(skillTitle(t, "unknown-bundled", undefined, true)).toBe("unknown-bundled")
  })

  test("returns the localized when hint only for bundled skills", () => {
    expect(skillWhen(t, "example", true)).toBe("需要示例时")
    expect(skillWhen(t, "example", false)).toBe("")
  })
})
