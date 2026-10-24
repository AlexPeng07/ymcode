import { describe, expect, test } from "bun:test"

function read(enable?: string, disable?: string) {
  const env = { ...process.env }
  if (enable === undefined) delete env.YMCODE_ENABLE_DYNAMIC_SYSTEM_PROMPT
  else env.YMCODE_ENABLE_DYNAMIC_SYSTEM_PROMPT = enable
  if (disable === undefined) delete env.YMCODE_DISABLE_DYNAMIC_SYSTEM_PROMPT
  else env.YMCODE_DISABLE_DYNAMIC_SYSTEM_PROMPT = disable
  const result = Bun.spawnSync({
    cmd: [
      process.execPath,
      "-e",
      'import { Flag } from "./src/flag/flag.ts"; process.stdout.write(String(Flag.YMCODE_ENABLE_DYNAMIC_SYSTEM_PROMPT))',
    ],
    cwd: process.cwd(),
    env,
  })
  expect(result.exitCode).toBe(0)
  return result.stdout.toString()
}

describe("YMCODE_ENABLE_DYNAMIC_SYSTEM_PROMPT", () => {
  test("is enabled by default and still accepts explicit truthy values", () => {
    expect(read()).toBe("true")
    expect(read("true")).toBe("true")
    expect(read("1")).toBe("true")
  })

  test("explicit falsy enable values keep dynamic system prompt off", () => {
    expect(read("false")).toBe("false")
    expect(read("0")).toBe("false")
  })

  test("the disable flag wins over an explicit enable", () => {
    expect(read("1", "true")).toBe("false")
    expect(read(undefined, "1")).toBe("false")
  })
})
