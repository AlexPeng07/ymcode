import os from "os"
import path from "path"
import z from "zod"
import { Duration, Effect, Layer, Context } from "effect"
import { NamedError } from "@ymcode/shared/util/error"
import type { Agent } from "@/agent/agent"
import { Bus } from "@/bus"
import { InstanceState } from "@/effect"
import { Flag } from "@/flag/flag"
import { Global } from "@/global"
import { Permission } from "@/permission"
import { AppFileSystem } from "@ymcode/shared/filesystem"
import { Config } from "../config"
import { ConfigMarkdown } from "../config"
import { Glob } from "@ymcode/shared/util/glob"
import { Log } from "../util"
import { Discovery } from "./discovery"
import { extractBuiltinBundle, OFFICIAL_SKILL_NAMES } from "./builtin/extract"

const log = Log.create({ service: "skill" })
// Scan order is load order: later roots win same-name collisions against earlier
// non-bundled skills. Open-standard .agents sits last among brand roots;
// .ymcode config dirs load after these.
const EXTERNAL_DIRS = [".claude", ".codex", ".opencode", ".agents"]
const EXTERNAL_SKILL_PATTERN = "skills/**/SKILL.md"
const YMCODE_SKILL_PATTERN = "{skill,skills}/**/SKILL.md"
const SKILL_PATTERN = "**/SKILL.md"
const BUILTIN_SKILL_PATTERN = "skills/*/SKILL.md"

// Brand roots opt in via YMCODE_ENABLE_*_SKILLS; .agents stays on unless
// YMCODE_DISABLE_AGENTS_SKILLS is set.
const externalSkillDirs = () =>
  EXTERNAL_DIRS.filter((dir) => {
    if (dir === ".agents") return !Flag.YMCODE_DISABLE_AGENTS_SKILLS
    if (dir === ".claude") return Flag.YMCODE_ENABLE_CLAUDE_CODE_SKILLS
    if (dir === ".codex") return Flag.YMCODE_ENABLE_CODEX_SKILLS
    if (dir === ".opencode") return Flag.YMCODE_ENABLE_OPENCODE_SKILLS
    return true
  })

export const Info = z.object({
  name: z.string(),
  description: z.string(),
  aliases: z.array(z.string()).optional(),
  location: z.string(),
  content: z.string(),
  // Model reachability, distinct from authorization. When true the model never
  // sees the skill (no system-prompt catalog entry, no skill tool description
  // entry, no skill_search hit) and the skill tool refuses to load it; a user
  // slash invocation still works. Authorization stays with permission.skill,
  // where `deny` means unusable by anyone.
  disable_model_invocation: z.boolean().optional(),
  bundled: z.boolean().optional(),
})
export type Info = z.infer<typeof Info>

// Kebab-case in frontmatter to match Claude Code and the agentskills.io open
// standard, so a skill folder stays portable in both directions.
const Frontmatter = Info.pick({ name: true, description: true, aliases: true }).extend({
  "disable-model-invocation": z.boolean().optional(),
})

export const InvalidError = NamedError.create(
  "SkillInvalidError",
  z.object({
    path: z.string(),
    message: z.string().optional(),
    issues: z.custom<z.core.$ZodIssue[]>().optional(),
  }),
)

export const NameMismatchError = NamedError.create(
  "SkillNameMismatchError",
  z.object({
    path: z.string(),
    expected: z.string(),
    actual: z.string(),
  }),
)

type State = {
  skills: Record<string, Info>
  dirs: Set<string>
}

type DiscoveryState = {
  matches: string[]
  dirs: string[]
  bundledRoots: string[]
}

type ScanState = {
  matches: Set<string>
  dirs: Set<string>
}

export interface Interface {
  readonly get: (name: string) => Effect.Effect<Info | undefined>
  readonly all: () => Effect.Effect<Info[]>
  readonly dirs: () => Effect.Effect<string[]>
  readonly available: (agent?: Agent.Info) => Effect.Effect<Info[]>
  readonly modelInvocable: (agent?: Agent.Info) => Effect.Effect<Info[]>
  readonly reload: () => Effect.Effect<void>
}

const add = Effect.fnUntraced(function* (state: State, match: string, bundledRoots: string[], bus: Bus.Interface) {
  const md = yield* Effect.tryPromise({
    try: () => ConfigMarkdown.parse(match),
    catch: (err) => err,
  }).pipe(
    Effect.catch(
      Effect.fnUntraced(function* (err) {
        const message = ConfigMarkdown.FrontmatterError.isInstance(err)
          ? err.data.message
          : `Failed to parse skill ${match}`
        const { Session } = yield* Effect.promise(() => import("@/session"))
        yield* bus.publish(Session.Event.Error, { error: new NamedError.Unknown({ message }).toObject() })
        log.error("failed to load skill", { skill: match, err })
        return undefined
      }),
    ),
  )

  if (!md) return

  const parsed = Frontmatter.safeParse(md.data)
  if (!parsed.success) {
    log.warn("skill frontmatter failed schema validation", {
      skill: match,
      issues: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
    })
    return
  }

  const isBundled = bundledRoots.some((root) => match.startsWith(root))
  const existing = state.skills[parsed.data.name]

  if (existing) {
    // User overrides always win: bundled must not overwrite non-bundled
    if (isBundled && !existing.bundled) return
    if (!isBundled && existing.bundled) {
      log.info("user skill overrides bundled", { name: parsed.data.name, location: match })
    } else {
      log.warn("duplicate skill name", {
        name: parsed.data.name,
        existing: existing.location,
        duplicate: match,
      })
    }
  }

  state.dirs.add(path.dirname(match))
  state.skills[parsed.data.name] = {
    name: parsed.data.name,
    description: parsed.data.description,
    aliases: parsed.data.aliases,
    location: match,
    content: md.content,
    disable_model_invocation: parsed.data["disable-model-invocation"],
    bundled: isBundled || undefined,
  }
})

const scan = Effect.fnUntraced(function* (
  state: ScanState,
  root: string,
  pattern: string,
  opts?: { dot?: boolean; scope?: string },
) {
  const matches = yield* Effect.tryPromise({
    try: () =>
      Glob.scan(pattern, {
        cwd: root,
        absolute: true,
        include: "file",
        symlink: true,
        dot: opts?.dot,
      }),
    catch: (error) => error,
  }).pipe(
    Effect.catch((error) => {
      if (!opts?.scope) return Effect.die(error)
      log.error(`failed to scan ${opts.scope} skills`, { dir: root, error })
      return Effect.succeed([] as string[])
    }),
  )

  for (const match of matches.toSorted()) {
    state.matches.add(match)
    state.dirs.add(path.dirname(match))
  }
})

const discoverStableSkills = Effect.fnUntraced(function* (
  fsys: AppFileSystem.Interface,
) {
  const state: ScanState = { matches: new Set(), dirs: new Set() }
  const bundledRoots: string[] = []

  // Extract builtin skills to disk first (user skills with same name override)
  if (!Flag.YMCODE_DISABLE_BUILTIN_SKILLS) {
    const builtinSkillRoot = yield* extractBuiltinBundle(fsys).pipe(
      Effect.catch(() => Effect.succeed(undefined)),
    )
    if (builtinSkillRoot && (yield* fsys.isDir(builtinSkillRoot))) {
      bundledRoots.push(builtinSkillRoot)
      yield* scan(state, builtinSkillRoot, BUILTIN_SKILL_PATTERN, { scope: "builtin" })
      if (Flag.YMCODE_DISABLE_OFFICIAL_SKILLS) {
        const skillsRoot = path.join(builtinSkillRoot, "skills")
        for (const name of OFFICIAL_SKILL_NAMES) {
          const prefix = path.join(skillsRoot, name) + path.sep
          for (const match of state.matches) {
            if (match.startsWith(prefix)) {
              state.matches.delete(match)
              state.dirs.delete(path.dirname(match))
            }
          }
        }
      }
    }
  }

  // Dotted path segments under skills/ are host-private (e.g. Codex .system)
  // and must not match.
  for (const dir of externalSkillDirs()) {
    const root = path.join(Global.Path.home, dir)
    if (!(yield* fsys.isDir(root))) continue
    yield* scan(state, root, EXTERNAL_SKILL_PATTERN, { scope: "global" })
  }

  return {
    matches: Array.from(state.matches),
    dirs: Array.from(state.dirs),
    bundledRoots,
  }
})

const discoverSkills = Effect.fnUntraced(function* (
  config: Config.Interface,
  discovery: Discovery.Interface,
  fsys: AppFileSystem.Interface,
  stable: DiscoveryState,
  directory: string,
  worktree: string,
) {
  const state: ScanState = { matches: new Set(stable.matches), dirs: new Set(stable.dirs) }
  const bundledRoots = [...stable.bundledRoots]

  const upDirs = yield* fsys
    .up({ targets: externalSkillDirs(), start: directory, stop: worktree })
    .pipe(Effect.catch(() => Effect.succeed([] as string[])))

  for (const root of upDirs) {
    yield* scan(state, root, EXTERNAL_SKILL_PATTERN, { scope: "project" })
  }

  const configDirs = yield* config.directories()
  for (const dir of configDirs) {
    yield* scan(state, dir, YMCODE_SKILL_PATTERN)
  }

  const cfg = yield* config.get()
  for (const item of cfg.skills?.paths ?? []) {
    const expanded = item.startsWith("~/") ? path.join(os.homedir(), item.slice(2)) : item
    const dir = path.isAbsolute(expanded) ? expanded : path.join(directory, expanded)
    if (!(yield* fsys.isDir(dir))) {
      log.warn("skill path not found", { path: dir })
      continue
    }

    yield* scan(state, dir, SKILL_PATTERN)
  }

  for (const url of cfg.skills?.urls ?? []) {
    const pulledDirs = yield* discovery.pull(url)
    for (const dir of pulledDirs) {
      yield* scan(state, dir, SKILL_PATTERN)
    }
  }

  return {
    matches: Array.from(state.matches),
    dirs: Array.from(state.dirs),
    bundledRoots,
  }
})

const loadSkills = Effect.fnUntraced(function* (state: State, discovered: DiscoveryState, bus: Bus.Interface) {
  yield* Effect.forEach(discovered.matches, (match) => add(state, match, discovered.bundledRoots, bus), {
    concurrency: 1,
    discard: true,
  })

  log.info("init", { count: Object.keys(state.skills).length })
})

export class Service extends Context.Service<Service, Interface>()("@opencode/Skill") {}

export const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const discovery = yield* Discovery.Service
    const config = yield* Config.Service
    const bus = yield* Bus.Service
    const fsys = yield* AppFileSystem.Service
    const [cachedStable, invalidateStable] = yield* Effect.cachedInvalidateWithTTL(
      discoverStableSkills(fsys),
      Duration.infinity,
    )
    // A cancelled first scan must not become the process-wide snapshot.
    const stable = cachedStable.pipe(Effect.onInterrupt(() => invalidateStable))
    const discovered = yield* InstanceState.make(
      Effect.fn("Skill.discovery")(function* (ctx) {
        return yield* discoverSkills(config, discovery, fsys, yield* stable, ctx.directory, ctx.worktree)
      }),
    )
    const state = yield* InstanceState.make(
      Effect.fn("Skill.state")(function* (ctx) {
        const s: State = { skills: {}, dirs: new Set() }
        yield* loadSkills(s, yield* InstanceState.get(discovered), bus)
        return s
      }),
    )

    const get = Effect.fn("Skill.get")(function* (name: string) {
      const s = yield* InstanceState.get(state)
      return s.skills[name]
    })

    const all = Effect.fn("Skill.all")(function* () {
      const s = yield* InstanceState.get(state)
      return Object.values(s.skills)
    })

    const dirs = Effect.fn("Skill.dirs")(function* () {
      return (yield* InstanceState.get(discovered)).dirs
    })

    // Authorization only: `deny` means unusable by anyone, so this is also the
    // set a user slash invocation resolves against.
    const available = Effect.fn("Skill.available")(function* (agent?: Agent.Info) {
      const s = yield* InstanceState.get(state)
      let list: Info[] = Object.values(s.skills)

      list = list.toSorted((a, b) => a.name.localeCompare(b.name))
      if (!agent) return list
      return list.filter((skill) => Permission.evaluate("skill", skill.name, agent.permission).action !== "deny")
    })

    // Everything the model is allowed to see or act on. Anything the model can
    // reach must come from here, never from `available` or `all`.
    const modelInvocable = Effect.fn("Skill.modelInvocable")(function* (agent?: Agent.Info) {
      return (yield* available(agent)).filter((skill) => !skill.disable_model_invocation)
    })

    const reload = Effect.fn("Skill.reload")(function* () {
      yield* invalidateStable
      yield* InstanceState.invalidate(discovered)
      yield* InstanceState.invalidate(state)
    })

    return Service.of({ get, all, dirs, available, modelInvocable, reload })
  }),
)

export const defaultLayer = layer.pipe(
  Layer.provide(Discovery.defaultLayer),
  Layer.provide(Config.defaultLayer),
  Layer.provide(Bus.layer),
  Layer.provide(AppFileSystem.defaultLayer),
)

export function fmt(list: Info[]) {
  if (list.length === 0) return "No skills are currently available."

  // Compact name+description entries keep the fixed catalog small. The skill
  // tool loads content by name, so catalog locations would only add tokens.
  // The trigger-keyword segment is matching input for the hint path, not
  // prose the model needs — strip it from the catalog (29% of description
  // bytes across the bundled skills).
  return [
    "## Available Skills",
    ...list
      .toSorted((a, b) => a.name.localeCompare(b.name))
      .map((skill) => `- **${skill.name}**: ${stripTriggerSegment(skill.description)}`),
  ].join("\n")
}

// --- Turn-local trigger hints -------------------------------------------------
//
// Descriptions may embed a "| Trigger keywords: a, b, c" segment. The catalog
// carries it to every turn already; the hint path reuses the same data to point
// at matching skills turn-locally, so no separate metadata source is needed.

const TRIGGER_SEGMENT_RE = /\|\s*Trigger keywords:\s*([^|]+)/i

export function stripTriggerSegment(description: string): string {
  return description.split(/\|\s*Trigger keywords:/i)[0].trim()
}

export function parseTriggerPhrases(skill: Pick<Info, "name" | "description">): string[] {
  const phrases = [skill.name.toLowerCase()]
  const segment = skill.description.match(TRIGGER_SEGMENT_RE)?.[1]
  if (segment) {
    for (const raw of segment.split(/[,，、]/)) {
      const phrase = raw.trim().toLowerCase().replace(/[.。;；]$/, "")
      // Single characters and sentence-length phrases are noise in both
      // directions: the former matches everything, the latter never matches.
      if (phrase.length >= 2 && phrase.length <= 40) phrases.push(phrase)
    }
  }
  return [...new Set(phrases)]
}

const CJK_RE = /[\u3000-\u9fff\uff00-\uffef]/

function phraseInText(phrase: string, haystack: string): boolean {
  // CJK phrases match by substring; Latin phrases need word boundaries so
  // "git" does not hit "github" and "review" does not hit "reviewer".
  if (CJK_RE.test(phrase)) return haystack.includes(phrase)
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  return new RegExp(`(^|[^a-z0-9])${escaped}(?![a-z0-9])`).test(haystack)
}

export function matchTriggeredSkills(
  text: string,
  skills: Array<Pick<Info, "name" | "description">>,
  limit = 3,
): Array<Pick<Info, "name" | "description">> {
  const haystack = text.toLowerCase()
  const scored: Array<{ skill: Pick<Info, "name" | "description">; score: number }> = []
  for (const skill of skills) {
    let score = 0
    for (const phrase of parseTriggerPhrases(skill)) {
      if (phraseInText(phrase, haystack)) score++
    }
    if (score > 0) scored.push({ skill, score })
  }
  return scored
    .toSorted((a, b) => b.score - a.score || a.skill.name.localeCompare(b.skill.name))
    .slice(0, limit)
    .map((entry) => entry.skill)
}

// Hint lines show the description without the trigger segment; the phrases are
// matching input, not something the model needs to read again.
export function hintDescription(skill: Pick<Info, "description">): string {
  const body = stripTriggerSegment(skill.description)
  return body.length > 160 ? body.slice(0, 157) + "..." : body
}

export * as Skill from "."
