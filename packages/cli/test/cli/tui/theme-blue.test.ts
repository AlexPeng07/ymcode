import { describe, expect, test } from "bun:test"
import type { TerminalColors } from "@opentui/core"
import { DEFAULT_THEMES, generateSystem, resolveTheme } from "../../../src/cli/cmd/tui/context/theme"

function rgb(color: { r: number; g: number; b: number }) {
  return [Math.round(color.r * 255), Math.round(color.g * 255), Math.round(color.b * 255)]
}

const palette = [
  "#000000",
  "#ff0000",
  "#00ff00",
  "#ffff00",
  "#0000ff",
  "#ff00ff",
  "#00ffff",
  "#ffffff",
  "#808080",
  "#ff5555",
  "#55ff55",
  "#ffff55",
  "#5555ff",
  "#ff55ff",
  "#55ffff",
  "#ffffff",
]

function terminal(): TerminalColors {
  return {
    defaultBackground: "#0a0a0a",
    defaultForeground: "#eeeeee",
    palette,
  } as unknown as TerminalColors
}

describe("blue default theme", () => {
  test("dark palette uses the ymcode blue brand colors", () => {
    const theme = resolveTheme(DEFAULT_THEMES.ymcode!, "dark")
    expect(rgb(theme.primary)).toEqual([59, 130, 246])
    expect(rgb(theme.secondary)).toEqual([96, 165, 250])
    expect(rgb(theme.success)).toEqual([34, 197, 94])
    expect(rgb(theme.info)).toEqual([34, 211, 238])
  })

  test("light palette uses the darker blue brand color", () => {
    const theme = resolveTheme(DEFAULT_THEMES.ymcode!, "light")
    expect(rgb(theme.primary)).toEqual([37, 99, 235])
    expect(rgb(theme.secondary)).toEqual([29, 78, 216])
  })

  test("system theme derives brand colors from blue, not xiaomi orange", () => {
    const theme = resolveTheme(generateSystem(terminal(), "dark"), "dark")
    expect(rgb(theme.primary)).toEqual([59, 130, 246])
    expect(rgb(theme.secondary)).toEqual([59, 130, 246])
    expect(rgb(theme.success)).toEqual([0, 255, 0])
    expect(rgb(theme.info)).toEqual([0, 0, 255])
  })
})
