import { fileURLToPath } from "node:url"
import { describe, expect, it } from "bun:test"

// URL.pathname is "/F:/..." on Windows — not a valid fs path. fileURLToPath
// is the only portable spelling for reading sibling sources.
const src = (relative: string) =>
  Bun.file(fileURLToPath(new URL(relative, import.meta.url))).text()

describe("turn-queue full migration contracts", () => {
  it("RunHandle has no pending field (C-01 source guard)", async () => {
    const text = await src("../../src/effect/runner.ts")
    expect(text).not.toContain("pending?:")
    expect(text).not.toContain("ShellThenRun")
    expect(text).toContain("NO pending-attach")
  })

  it("agent inputs use unified controller admission (C-02)", async () => {
    const text = await src("../../src/inbox/inbox.ts")
    expect(text).toContain("controller.accept({")
    expect(text).not.toContain("promptRef.loop")
    expect(text).not.toContain("inboxWake")
  })

  it("prompt_async documents 202 + receiptId (C-04 source guard)", async () => {
    const text = await src("../../src/server/routes/instance/session.ts")
    expect(text).toContain('operationId: "session.prompt_async"')
    expect(text).toContain("202")
    expect(text).toContain("receiptId")
  })

  it("/message busy path admits instead of 409 TOCTOU (C-08 source guard)", async () => {
    const text = await src("../../src/server/routes/instance/session.ts")
    expect(text).toContain("C-08: no assertNotBusy TOCTOU")
    // resume routes no longer preflight assertNotBusy
    expect(text).not.toContain("SessionRoutes.resume.assertNotBusy")
    expect(text).not.toContain("SessionRoutes.resumeUser.assertNotBusy")
  })

  it("loop claims and acks via Controller (C-01)", async () => {
    const text = await src("../../src/session/prompt.ts")
    expect(text).toContain("claimNext")
    expect(text).toContain("controller.extendClaim(")
    expect(text).toContain("controller.ack(")
    expect(text).toContain("settleClaims(")
  })
})
