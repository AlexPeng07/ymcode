import { afterEach, describe, expect } from "bun:test"
import { Effect } from "effect"
import path from "path"
import { Instance } from "../../src/project/instance"
import { Session } from "../../src/session"
import { MessageV2 } from "../../src/session/message-v2"
import { SessionPrompt } from "../../src/session/prompt"
import { Log } from "../../src/util"
import { provideTmpdirServer } from "../fixture/fixture"
import { testEffect } from "../lib/effect"
import { withEnv } from "../lib/env"
import { makeLayer, providerCfg } from "../workflow/lib"

withEnv({ YMCODE_DISABLE_BUILTIN_SKILLS: "true" })

void Log.init({ print: false })

afterEach(async () => {
  await Instance.disposeAll()
})

const it = testEffect(makeLayer())

function writeSkill(dir: string, name: string, description: string) {
  return Effect.promise(() =>
    Bun.write(
      path.join(dir, ".ymcode", "skill", name, "SKILL.md"),
      // The description is double-quoted: the trigger segment contains an
      // ASCII "key: value" pair, which is invalid inside an unquoted YAML
      // plain scalar.
      `---\nname: ${name}\ndescription: "${description}"\n---\n\n# ${name}\n\n${name.toUpperCase()}_BODY\n`,
    ),
  )
}

const TRIGGER_SKILL = "hinted-skill"
const TRIGGER_DESCRIPTION = "Frobnicate widgets safely. | Trigger keywords: frobnicate, widget tune."

const hintText = (parts: MessageV2.WithParts["parts"]) =>
  parts
    .flatMap((p) => (p.type === "text" && p.synthetic && !p.ignored ? [p.text] : []))
    .find((text) => text.includes("matches trigger keywords of these available skills"))

// insertReminders turns trigger-keyword hits into a fresh-turn system-reminder
// pointing at the skill, without loading the body; explicit /mentions keep the
// full skill_content treatment and must not be downgraded to a hint.
describe("skill trigger hints", () => {
  it.live(
    "hints at a skill whose trigger keywords match the user message",
    () =>
      provideTmpdirServer(
        Effect.fnUntraced(function* ({ dir, llm }) {
          yield* writeSkill(dir, TRIGGER_SKILL, TRIGGER_DESCRIPTION)
          yield* llm.text("done")

          const prompt = yield* SessionPrompt.Service
          const sessions = yield* Session.Service
          const session = yield* sessions.create({ title: "trigger hint" })

          yield* prompt.prompt({
            sessionID: session.id,
            noReply: true,
            parts: [{ type: "text", text: "please frobnicate the output for me" }],
          })
          yield* prompt.loop({ sessionID: session.id })

          const user = (yield* sessions.messages({ sessionID: session.id })).findLast(
            (m) => m.info.role === "user",
          )
          const hint = hintText(user!.parts)
          expect(hint).toBeDefined()
          expect(hint).toContain(`- ${TRIGGER_SKILL}: Frobnicate widgets safely.`)
          expect(hint).not.toContain("Trigger keywords:")
          // Hints point, they do not load: no body injection for a keyword hit.
          expect(user!.parts.some((p) => p.type === "text" && p.text.includes(`${TRIGGER_SKILL.toUpperCase()}_BODY`))).toBe(
            false,
          )
        }),
        { git: true, config: providerCfg },
      ),
    30_000,
  )

  it.live(
    "does not hint when nothing matches",
    () =>
      provideTmpdirServer(
        Effect.fnUntraced(function* ({ dir, llm }) {
          yield* writeSkill(dir, TRIGGER_SKILL, TRIGGER_DESCRIPTION)
          yield* llm.text("done")

          const prompt = yield* SessionPrompt.Service
          const sessions = yield* Session.Service
          const session = yield* sessions.create({ title: "no trigger hint" })

          yield* prompt.prompt({
            sessionID: session.id,
            noReply: true,
            parts: [{ type: "text", text: "just summarize the current directory" }],
          })
          yield* prompt.loop({ sessionID: session.id })

          const user = (yield* sessions.messages({ sessionID: session.id })).findLast(
            (m) => m.info.role === "user",
          )
          expect(hintText(user!.parts)).toBeUndefined()
        }),
        { git: true, config: providerCfg },
      ),
    30_000,
  )

  it.live(
    "does not downgrade an explicit /mention to a hint",
    () =>
      provideTmpdirServer(
        Effect.fnUntraced(function* ({ dir, llm }) {
          yield* writeSkill(dir, TRIGGER_SKILL, TRIGGER_DESCRIPTION)
          yield* llm.text("done")

          const prompt = yield* SessionPrompt.Service
          const sessions = yield* Session.Service
          const session = yield* sessions.create({ title: "mention beats hint" })

          yield* prompt.prompt({
            sessionID: session.id,
            noReply: true,
            parts: [{ type: "text", text: "use /hinted-skill and also frobnicate while at it" }],
          })
          yield* prompt.loop({ sessionID: session.id })

          const user = (yield* sessions.messages({ sessionID: session.id })).findLast(
            (m) => m.info.role === "user",
          )
          const text = user!.parts.flatMap((p) => (p.type === "text" ? [p.text] : [])).join("\n")
          expect(text).toContain('<system-reminder>\n<skill_content name="hinted-skill">')
          expect(text).toContain("HINTED-SKILL_BODY")
          expect(hintText(user!.parts)).toBeUndefined()
        }),
        { git: true, config: providerCfg },
      ),
    30_000,
  )
})
