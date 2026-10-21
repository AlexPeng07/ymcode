import { describe, expect, test } from "bun:test"
import path from "path"
import { resolveYmcodeHome } from "@ymcode/shared/global"

describe("resolveYmcodeHome", () => {
  test("with YMCODE_HOME set, resolves 4 subdirs under root", () => {
    const result = resolveYmcodeHome({
      YMCODE_HOME: "/tmp/profile-a",
    })
    expect(result.mode).toBe("ymcode_home")
    expect(result.root).toBe("/tmp/profile-a")
    expect(result.config).toBe(path.join("/tmp/profile-a", "config"))
    expect(result.data).toBe(path.join("/tmp/profile-a", "data"))
    expect(result.state).toBe(path.join("/tmp/profile-a", "state"))
    expect(result.cache).toBe(path.join("/tmp/profile-a", "cache"))
  })

  test("without YMCODE_HOME, falls through to xdg mode", () => {
    const result = resolveYmcodeHome({})
    expect(result.mode).toBe("xdg")
    expect(result.root).toBeUndefined()
    // xdg paths end with "/ymcode"
    expect(result.config.endsWith(path.join("", "ymcode"))).toBe(true)
    expect(result.data.endsWith(path.join("", "ymcode"))).toBe(true)
    expect(result.state.endsWith(path.join("", "ymcode"))).toBe(true)
    expect(result.cache.endsWith(path.join("", "ymcode"))).toBe(true)
  })

  test("empty YMCODE_HOME string is treated as unset (xdg mode)", () => {
    const result = resolveYmcodeHome({ YMCODE_HOME: "" })
    expect(result.mode).toBe("xdg")
  })

  test("relative YMCODE_HOME path throws with clear error", () => {
    expect(() => resolveYmcodeHome({ YMCODE_HOME: "./foo" })).toThrow(
      /YMCODE_HOME must be an absolute path/,
    )
    expect(() => resolveYmcodeHome({ YMCODE_HOME: "foo/bar" })).toThrow(
      /YMCODE_HOME must be an absolute path/,
    )
  })

  test("tilde-prefixed YMCODE_HOME throws (not treated as absolute)", () => {
    expect(() => resolveYmcodeHome({ YMCODE_HOME: "~/profiles/a" })).toThrow(
      /YMCODE_HOME must be an absolute path/,
    )
  })

  test("error message includes the offending value", () => {
    expect(() => resolveYmcodeHome({ YMCODE_HOME: "./relative" })).toThrow(
      /\.\/relative/,
    )
  })
})
