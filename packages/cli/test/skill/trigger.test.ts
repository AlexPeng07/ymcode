import { describe, expect, test } from "bun:test"
import { hintDescription, matchTriggeredSkills, parseTriggerPhrases } from "../../src/skill"

const skill = (name: string, description: string) => ({ name, description })

describe("skill trigger phrases", () => {
  test("parses the Trigger keywords segment from a description", () => {
    expect(
      parseTriggerPhrases(skill("code-review-cn", "结构化代码审查…时使用。 | Trigger keywords: code review, PR review, 审查代码， 找问题.")),
    ).toEqual(["code-review-cn", "code review", "pr review", "审查代码", "找问题"])
  })

  test("falls back to the bare name without the segment", () => {
    expect(parseTriggerPhrases(skill("plain-skill", "Does something useful."))).toEqual(["plain-skill"])
  })

  test("drops noise phrases from the segment", () => {
    const phrases = parseTriggerPhrases(
      skill("x", "desc | Trigger keywords: a, this phrase is a whole sentence about nothing in particular, 好的."),
    )
    expect(phrases).toEqual(["x", "好的"])
  })
})

describe("skill trigger matching", () => {
  const skills = [
    skill("code-review-cn", "审查。 | Trigger keywords: code review, 审查代码, 找问题."),
    skill("debugging", "调试。 | Trigger keywords: debug, bug, 复现, 报错."),
    skill("chinese-writing", "写作。 | Trigger keywords: 周报, 邮件, 会议纪要."),
    skill("plain-tool", "No trigger segment at all."),
  ]

  test("matches Chinese trigger keywords by substring", () => {
    expect(matchTriggeredSkills("帮我审查代码，看看有没有并发问题", skills).map((s) => s.name)).toEqual([
      "code-review-cn",
    ])
  })

  test("matches Latin keywords on word boundaries only", () => {
    expect(matchTriggeredSkills("please do a code review of the PR", skills).map((s) => s.name)).toEqual([
      "code-review-cn",
    ])
    expect(matchTriggeredSkills("look at the github workflow file", skills)).toEqual([])
  })

  test("git does not match github via a short keyword", () => {
    const gitSkills = [skill("git-workflow", "… | Trigger keywords: git, commit, 分支.")]
    expect(matchTriggeredSkills("the github action failed", gitSkills)).toEqual([])
    expect(matchTriggeredSkills("help me commit and push to a new 分支", gitSkills).map((s) => s.name)).toEqual([
      "git-workflow",
    ])
  })

  test("ranks multi-hit skills first and caps the result", () => {
    const many = [
      skill("one", "… | Trigger keywords: alpha."),
      skill("two", "… | Trigger keywords: alpha, beta."),
      skill("three", "… | Trigger keywords: alpha."),
      skill("four", "… | Trigger keywords: beta."),
    ]
    expect(matchTriggeredSkills("alpha beta", many, 2).map((s) => s.name)).toEqual(["two", "four"])
  })

  test("matches by skill name when no keyword segment exists", () => {
    expect(matchTriggeredSkills("use the plain-tool thing please", skills).map((s) => s.name)).toEqual(["plain-tool"])
  })

  test("code fences and inline code in input do not match", () => {
    // The caller strips fenced/inline code before matching; the matcher itself
    // has no opinion, but plain substring hits confirm it sees raw text.
    expect(matchTriggeredSkills("`debug`", skills).map((s) => s.name)).toEqual(["debugging"])
  })
})

describe("skill hint description", () => {
  test("strips the trigger segment", () => {
    expect(hintDescription(skill("x", "Do the thing when asked. | Trigger keywords: a, b."))).toBe(
      "Do the thing when asked.",
    )
  })

  test("truncates long bodies", () => {
    const body = "x".repeat(200)
    const out = hintDescription(skill("x", `${body} | Trigger keywords: a.`))
    expect(out.length).toBe(160)
    expect(out.endsWith("...")).toBe(true)
  })
})
