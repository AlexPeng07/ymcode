import { describe, expect, test } from "bun:test"
import { Info, parse, serialize, clampConfidence } from "../../src/memory/instinct"

const sample = `---
id: ins_abc12345
description: 提交前必须跑 typecheck
status: candidate
confidence: 0.4
evidence:
  - session: ses_1
    date: 2026-10-21
    quote: "以后都先跑 typecheck"
source: correction
created_at: 2026-10-21T00:00:00.000Z
updated_at: 2026-10-21T00:00:00.000Z
last_seen_at: 2026-10-21T00:00:00.000Z
contradictions: 0
---
适用所有改动。`

describe("instinct format", () => {
  test("round-trips frontmatter and body", () => {
    const { info, body } = parse(sample)
    expect(info.id).toBe("ins_abc12345")
    expect(info.source).toBe("correction")
    expect(body).toBe("适用所有改动。")
    expect(parse(serialize(info, body)).info).toEqual(info)
  })

  test("clamps confidence", () => {
    expect(clampConfidence(-1)).toBe(0)
    expect(clampConfidence(2)).toBe(1)
    expect(clampConfidence(0.42)).toBe(0.42)
  })

  test("rejects missing evidence", () => {
    expect(() =>
      Info.parse({
        id: "ins_abc12345",
        description: "x",
        status: "candidate",
        confidence: 0.4,
        evidence: [],
        source: "correction",
        created_at: "x",
        updated_at: "x",
        last_seen_at: "x",
        contradictions: 0,
      }),
    ).toThrow()
  })
})
