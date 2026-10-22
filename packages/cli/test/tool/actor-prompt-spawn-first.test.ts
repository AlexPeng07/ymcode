import { describe, expect, test } from "bun:test"
import ACTOR_DESCRIPTION from "../../src/tool/actor.txt"

// Agents kept reaching for the BLOCKING `run` action because the tool prompt
// listed it first and used it in nearly every example, which silently killed
// parallelism. These assertions pin the spawn-first steering so it can't
// regress back into a run-first description.
describe("actor tool prompt steers to spawn first", () => {
  for (const [name, prompt] of [
    ["actor.txt", ACTOR_DESCRIPTION],
  ] as const) {
    describe(name, () => {
      test("names spawn as the default", () => {
        expect(prompt).toMatch(/spawn[^\n]*默认|默认[^\n]*spawn/i)
      })

      test("ties spawn to background + parallel work", () => {
        expect(prompt).toMatch(/后台/)
        expect(prompt).toMatch(/并行/)
      })

      test("marks run as blocking and as the exception", () => {
        expect(prompt).toMatch(/\brun\b[^\n]*阻塞/i)
        expect(prompt).toMatch(/例外/)
      })

      test("mentions the spawned-result collection pattern", () => {
        expect(prompt).toMatch(/wait/i)
        expect(prompt).toMatch(/status/i)
      })

      test("introduces spawn before run", () => {
        const firstSpawn = prompt.search(/\bspawn\b/i)
        const firstRun = prompt.search(/\brun\b/i)
        expect(firstSpawn).toBeGreaterThanOrEqual(0)
        expect(firstSpawn).toBeLessThan(firstRun)
      })

      test("uses spawn for the majority of examples", () => {
        const spawnUses = prompt.match(/\bspawn\b/gi)?.length ?? 0
        const runUses = prompt.match(/\brun\b/gi)?.length ?? 0
        expect(spawnUses).toBeGreaterThan(runUses)
      })
    })
  }

  test("actor.txt keeps at most one run example, labelled as the exception", () => {
    const examples = ACTOR_DESCRIPTION.slice(ACTOR_DESCRIPTION.indexOf("## 示例"))
    expect(examples.length).toBeGreaterThan(0)
    const runExamples = examples.match(/"action":"run"/g)?.length ?? 0
    expect(runExamples).toBeLessThanOrEqual(1)
    if (runExamples === 1) expect(examples).toMatch(/例外/)
    const spawnExamples = examples.match(/"action":"spawn"/g)?.length ?? 0
    expect(spawnExamples).toBeGreaterThanOrEqual(3)
  })

})
