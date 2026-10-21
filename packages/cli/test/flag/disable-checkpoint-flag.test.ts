import { afterEach, describe, expect, test } from "bun:test"
import { Flag } from "../../src/flag/flag"

const original = process.env.YMCODE_DISABLE_CHECKPOINT

function set(value?: string) {
  if (value === undefined) delete process.env.YMCODE_DISABLE_CHECKPOINT
  else process.env.YMCODE_DISABLE_CHECKPOINT = value
}

afterEach(() => set(original))

describe("YMCODE_DISABLE_CHECKPOINT", () => {
  test("keeps checkpointing enabled by default", () => {
    set(undefined)
    expect(Flag.YMCODE_DISABLE_CHECKPOINT).toBe(false)
  })

  test("tracks runtime env changes", () => {
    set("true")
    expect(Flag.YMCODE_DISABLE_CHECKPOINT).toBe(true)
    set("false")
    expect(Flag.YMCODE_DISABLE_CHECKPOINT).toBe(false)
  })

  test("accepts 1 as the truthy alias", () => {
    set("1")
    expect(Flag.YMCODE_DISABLE_CHECKPOINT).toBe(true)
    set("0")
    expect(Flag.YMCODE_DISABLE_CHECKPOINT).toBe(false)
  })
})
