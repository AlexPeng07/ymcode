import { describe, expect, test } from "bun:test"
import { observerTask, shouldObserve } from "../../src/session/instinct-observer"

describe("instinct observer", () => {
  test("requires auto capture and every third checkpoint", () => {
    expect(
      shouldObserve({ enabled: true, capture: "auto", checkpoints: 2, lastRunAt: undefined, now: 1000, intervalMs: 60_000 }),
    ).toBe(false)
    expect(
      shouldObserve({ enabled: true, capture: "auto", checkpoints: 3, lastRunAt: undefined, now: 1000, intervalMs: 60_000 }),
    ).toBe(true)
    expect(
      shouldObserve({ enabled: true, capture: "off", checkpoints: 3, lastRunAt: undefined, now: 1000, intervalMs: 60_000 }),
    ).toBe(false)
    expect(
      shouldObserve({
        enabled: false,
        capture: "auto",
        checkpoints: 3,
        lastRunAt: undefined,
        now: 1000,
        intervalMs: 60_000,
      }),
    ).toBe(false)
  })

  test("honors the interval", () => {
    expect(
      shouldObserve({ enabled: true, capture: "auto", checkpoints: 3, lastRunAt: 900, now: 1000, intervalMs: 60_000 }),
    ).toBe(false)
    expect(
      shouldObserve({ enabled: true, capture: "auto", checkpoints: 3, lastRunAt: 1, now: 100_000, intervalMs: 60_000 }),
    ).toBe(true)
  })

  test("task names the checkpoint, project and instinct paths", () => {
    const task = observerTask({ sessionID: "ses_example", projectID: "project-example" })
    expect(task).toContain("checkpoint.md")
    expect(task).toContain("project-example")
    expect(task).toContain("instincts")
    expect(task).toContain("instinct")
  })
})
