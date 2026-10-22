import { describe, expect, test } from "bun:test"
import fs from "fs/promises"
import os from "os"
import path from "path"
import { observerTask, readObserverState, shouldObserve, writeObserverState } from "../../src/session/instinct-observer"

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

  test("state store roundtrips and tolerates corrupt json", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ymcode-observer-state-"))
    const file = path.join(root, "nested", "observer.json")
    try {
      await writeObserverState({ ses_a: { lastRunAt: 1, checkpoints: 3 } }, file)
      expect(await readObserverState(file)).toEqual({ ses_a: { lastRunAt: 1, checkpoints: 3 } })

      await fs.writeFile(file, "{ not json")
      expect(await readObserverState(file)).toEqual({})
      expect(await readObserverState(path.join(root, "missing.json"))).toEqual({})
    } finally {
      await fs.rm(root, { recursive: true, force: true })
    }
  })
})
