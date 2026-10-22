import { afterEach, describe, expect, test } from "bun:test"
import { AppRuntime } from "../../src/effect/app-runtime"
import { Instinct } from "../../src/memory"
import { ProjectID } from "../../src/project/schema"
import { Instance } from "../../src/project/instance"
import { Server } from "../../src/server/server"
import { tmpdir } from "../fixture/fixture"

afterEach(async () => {
  await Instance.disposeAll()
})

const scope = { scope: "global" as const, projectID: ProjectID.global }

async function writeCandidate(description: string) {
  return AppRuntime.runPromise(
    Instinct.Service.use((service) =>
      service.write({
        ...scope,
        description,
        source: "correction",
        confidence: 0.9,
        evidence: [{ session: "ses_test", date: "2026-10-23", quote: "keep it" }],
        body: "Prefer explicit errors over silent fallbacks.",
      }),
    ),
  )
}

describe("instinct routes", () => {
  test("lists, promotes, demotes and deletes a global instinct", async () => {
    await using tmp = await tmpdir({ git: true })
    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const created = await writeCandidate("Prefer explicit errors")
        const app = Server.Default().app

        const list = await app.request("/instinct?scope=global")
        expect(list.status).toBe(200)
        const items = (await list.json()) as Array<{ id: string; status: string }>
        expect(items.some((item) => item.id === created.id && item.status === "candidate")).toBe(true)

        const detail = await app.request(`/instinct/${created.id}?scope=global`)
        expect(detail.status).toBe(200)
        const body = (await detail.json()) as { info: { id: string }; body: string }
        expect(body.info.id).toBe(created.id)
        expect(body.body).toContain("explicit errors")

        const promoted = await app.request(`/instinct/${created.id}/promote`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ scope: "global", force: true }),
        })
        expect(promoted.status).toBe(200)
        const promotion = (await promoted.json()) as { info: { status: string }; appended: boolean }
        expect(promotion.info.status).toBe("active")
        expect(promotion.appended).toBe(true)

        const demoted = await app.request(`/instinct/${created.id}/demote`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ scope: "global", reason: "test correction" }),
        })
        expect(demoted.status).toBe(200)
        const demotion = (await demoted.json()) as { status: string; contradictions: number }
        expect(demotion.status).toBe("candidate")
        expect(demotion.contradictions).toBe(1)

        const reviewed = await app.request("/instinct/review", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ scope: "global" }),
        })
        expect(reviewed.status).toBe(200)

        const deleted = await app.request(`/instinct/${created.id}?scope=global`, { method: "DELETE" })
        expect(deleted.status).toBe(200)
        expect(await deleted.json()).toBe(true)

        const after = await app.request("/instinct?scope=global")
        const remaining = (await after.json()) as Array<{ id: string }>
        expect(remaining.some((item) => item.id === created.id)).toBe(false)
      },
    })
  })

  test("rejects a malformed instinct id", async () => {
    await using tmp = await tmpdir({ git: true })
    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const response = await Server.Default().app.request("/instinct/not-an-id?scope=global")
        expect(response.status).toBe(400)
      },
    })
  })
})
