import { describe, expect, test } from "bun:test"
import { modelChoices, orderedProviders } from "../../src/cli/cmd/setup"
import type { ModelsDev } from "../../src/provider"

function model(id: string, overrides: Partial<ModelsDev.Model> = {}): ModelsDev.Model {
  return {
    id,
    name: id,
    release_date: "2026-01-01",
    attachment: false,
    reasoning: false,
    temperature: true,
    tool_call: true,
    voice_design: false,
    voice_clone: false,
    limit: { context: 128_000, output: 8_192 },
    ...overrides,
  }
}

function provider(id: string, name: string, models: Record<string, ModelsDev.Model>): ModelsDev.Provider {
  return { id, name, env: [], models }
}

describe("setup provider ordering", () => {
  const catalog: Record<string, ModelsDev.Provider> = {
    "zzz-custom": provider("zzz-custom", "Zzz", { z: model("z") }),
    deepseek: provider("deepseek", "DeepSeek", { d: model("d") }),
    xiaomi: provider("xiaomi", "Xiaomi", { m: model("m") }),
    empty: provider("empty", "Empty", {}),
  }

  test("sorts common providers first and drops providers without models", () => {
    expect(orderedProviders(catalog).map((entry) => entry.id)).toEqual(["xiaomi", "deepseek", "zzz-custom"])
  })

  test("honors disabled and enabled filters", () => {
    expect(orderedProviders(catalog, { disabled: ["deepseek"] }).map((entry) => entry.id)).toEqual([
      "xiaomi",
      "zzz-custom",
    ])
    expect(orderedProviders(catalog, { enabled: ["deepseek", "zzz-custom"] }).map((entry) => entry.id)).toEqual([
      "deepseek",
      "zzz-custom",
    ])
  })
})

describe("setup model choices", () => {
  test("drops deprecated and non-tool models and orders by release date", () => {
    const entry = provider("p", "P", {
      old: model("old", { release_date: "2024-01-01", status: "deprecated" }),
      noTool: model("noTool", { release_date: "2026-04-01", tool_call: false }),
      older: model("older", { release_date: "2026-01-01" }),
      newer: model("newer", { release_date: "2026-03-01" }),
    })
    expect(modelChoices(entry).map((item) => item.id)).toEqual(["newer", "older"])
  })

  test("falls back to every model when none are tool-capable", () => {
    const entry = provider("p", "P", {
      a: model("a", { release_date: "2025-01-01", tool_call: false }),
      b: model("b", { release_date: "2026-01-01", tool_call: false }),
    })
    expect(modelChoices(entry).map((item) => item.id)).toEqual(["b", "a"])
  })
})
