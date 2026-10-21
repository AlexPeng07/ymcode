import { describe, expect, test } from "bun:test"
import { Effect } from "effect"
import fs from "fs/promises"
import os from "os"
import path from "path"
import { make, defaultSettings } from "../../src/memory/instinct-service"

const MEMORY = `# Project memory

## Rules

(none)

## Architecture decisions

(none)

## Discovered durable knowledge

(none)
`

async function fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "ymcode-instinct-"))
  await fs.mkdir(path.join(root, "projects", "p1"), { recursive: true })
  await fs.writeFile(path.join(root, "projects", "p1", "MEMORY.md"), MEMORY)
  return { root, instinct: make(root, defaultSettings) }
}

describe("instinct service", () => {
  test("writes, promotes and renders active rules", async () => {
    const { root, instinct } = await fixture()
    const written = await Effect.runPromise(
      instinct.write({
        scope: "projects",
        projectID: "p1",
        description: "提交前必须跑 typecheck",
        source: "correction",
        confidence: 0.9,
        evidence: [
          { session: "ses_1", date: "2026-10-21" },
          { session: "ses_2", date: "2026-10-22" },
        ],
        body: "所有代码改动适用。",
      }),
    )
    expect(written.status).toBe("candidate")

    const promoted = await Effect.runPromise(
      instinct.promote({ scope: "projects", projectID: "p1", id: written.id }),
    )
    expect(promoted.info.status).toBe("active")
    expect(promoted.appended).toBe(true)

    const memory = await fs.readFile(path.join(root, "projects", "p1", "MEMORY.md"), "utf8")
    expect(memory).toContain("提交前必须跑 typecheck")
    expect(memory).toContain(written.id)
    expect(memory.indexOf("提交前必须跑 typecheck")).toBeGreaterThan(memory.indexOf("## Rules"))

    const injection = await Effect.runPromise(
      instinct.renderInjection({ scope: "projects", projectID: "p1", budget: 1200 }),
    )
    expect(injection).toContain("# Active instincts")
    expect(injection).toContain("提交前必须跑 typecheck")
  })

  test("rejects promotion below threshold and force overrides", async () => {
    const { instinct } = await fixture()
    const written = await Effect.runPromise(
      instinct.write({
        scope: "projects",
        projectID: "p1",
        description: "只在明确要求时重构",
        source: "repetition",
        confidence: 0.4,
        evidence: [{ session: "ses_1", date: "2026-10-21" }],
        body: "",
      }),
    )
    await expect(
      Effect.runPromise(instinct.promote({ scope: "projects", projectID: "p1", id: written.id })),
    ).rejects.toThrow("threshold")
    const forced = await Effect.runPromise(
      instinct.promote({ scope: "projects", projectID: "p1", id: written.id, force: true }),
    )
    expect(forced.info.status).toBe("active")
  })

  test("demotes, decays and forgets", async () => {
    const { root, instinct } = await fixture()
    const written = await Effect.runPromise(
      instinct.write({
        scope: "projects",
        projectID: "p1",
        description: "使用 pnpm",
        source: "correction",
        confidence: 0.9,
        evidence: [
          { session: "ses_1", date: "2026-10-21" },
          { session: "ses_2", date: "2026-10-22" },
        ],
        body: "不要使用 npm。",
      }),
    )
    await Effect.runPromise(instinct.promote({ scope: "projects", projectID: "p1", id: written.id }))
    const demoted = await Effect.runPromise(
      instinct.demote({ scope: "projects", projectID: "p1", id: written.id, reason: "用户改回 npm" }),
    )
    expect(demoted.status).toBe("candidate")
    expect(demoted.confidence).toBeCloseTo(0.6)

    const file = path.join(root, "projects", "p1", "instincts", `${written.id}.md`)
    const raw = await fs.readFile(file, "utf8")
    const old = new Date(Date.now() - 61 * 86_400_000).toISOString()
    await fs.writeFile(file, raw.replace(/last_seen_at: .*/, `last_seen_at: ${old}`))
    const changed = await Effect.runPromise(instinct.decay({ scope: "projects", projectID: "p1" }))
    expect(changed).toBe(1)
    const after = await Effect.runPromise(instinct.get({ scope: "projects", projectID: "p1", id: written.id }))
    expect(after.info.confidence).toBeLessThan(0.6)

    await Effect.runPromise(instinct.forget({ scope: "projects", projectID: "p1", id: written.id }))
    await expect(
      fs.stat(path.join(root, "projects", "p1", "instincts", `${written.id}.md`)),
    ).rejects.toThrow()
  })

  test("does not duplicate a promoted rule", async () => {
    const { root, instinct } = await fixture()
    const first = await Effect.runPromise(
      instinct.write({
        scope: "projects",
        projectID: "p1",
        description: "禁止 force push",
        source: "decision",
        confidence: 0.9,
        evidence: [
          { session: "ses_1", date: "2026-10-21" },
          { session: "ses_2", date: "2026-10-22" },
        ],
        body: "",
      }),
    )
    await Effect.runPromise(instinct.promote({ scope: "projects", projectID: "p1", id: first.id }))
    const second = await Effect.runPromise(
      instinct.write({
        scope: "projects",
        projectID: "p1",
        description: "禁止 force push",
        source: "decision",
        confidence: 0.9,
        evidence: [
          { session: "ses_3", date: "2026-10-23" },
          { session: "ses_4", date: "2026-10-24" },
        ],
        body: "",
      }),
    )
    const promoted = await Effect.runPromise(
      instinct.promote({ scope: "projects", projectID: "p1", id: second.id }),
    )
    expect(promoted.appended).toBe(false)
    const memory = await fs.readFile(path.join(root, "projects", "p1", "MEMORY.md"), "utf8")
    expect(memory.match(/禁止 force push/g)).toHaveLength(1)
  })

  test("list filters by status", async () => {
    const { instinct } = await fixture()
    await Effect.runPromise(
      instinct.write({
        scope: "projects",
        projectID: "p1",
        description: "候选规则",
        source: "repetition",
        confidence: 0.4,
        evidence: [{ session: "ses_1", date: "2026-10-21" }],
        body: "",
      }),
    )
    const candidates = await Effect.runPromise(
      instinct.list({ scope: "projects", projectID: "p1", status: "candidate" }),
    )
    const active = await Effect.runPromise(instinct.list({ scope: "projects", projectID: "p1", status: "active" }))
    expect(candidates).toHaveLength(1)
    expect(active).toHaveLength(0)
  })
})
