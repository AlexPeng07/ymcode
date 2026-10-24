import { Config } from "effect"

function truthy(key: string) {
  const value = process.env[key]?.toLowerCase()
  return value === "true" || value === "1"
}

function falsy(key: string) {
  const value = process.env[key]?.toLowerCase()
  return value === "false" || value === "0"
}

function number(key: string) {
  const value = process.env[key]
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined
}

function nonNegativeNumber(key: string) {
  const value = process.env[key]
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined
}

// A fraction in (0, 1], written either as a decimal ("0.85") or a percentage
// ("85%"). Values outside the range — and anything unparseable — yield undefined
// so the caller keeps its own default.
function ratio(key: string) {
  const value = process.env[key]?.trim()
  if (!value) return undefined
  const parsed = value.endsWith("%") ? Number(value.slice(0, -1)) / 100 : Number(value)
  return Number.isFinite(parsed) && parsed > 0 && parsed <= 1 ? parsed : undefined
}

const YMCODE_EXPERIMENTAL = truthy("YMCODE_EXPERIMENTAL")

// Defaults to false. When enabled, ymcode runs in pure-mimo mode:
//   — does NOT inherit Claude Code prompt files (CLAUDE.md, ~/.claude/CLAUDE.md)
//   — does NOT pick up provider API keys from environment variables
// Set YMCODE_ONLY=true to disable .claude inheritance and env-based
// provider auto-detection.
const YMCODE_ONLY = truthy("YMCODE_ONLY")
const YMCODE_DISABLE_CLAUDE_CODE_ENV = truthy("YMCODE_DISABLE_CLAUDE_CODE")
const YMCODE_DISABLE_CLAUDE_CODE = YMCODE_ONLY || YMCODE_DISABLE_CLAUDE_CODE_ENV

// External skill roots:
//   .agents                       default on  — YMCODE_DISABLE_AGENTS_SKILLS
//   .claude / .codex / .opencode  default off — YMCODE_ENABLE_*_SKILLS
const copy = process.env["YMCODE_EXPERIMENTAL_DISABLE_COPY_ON_SELECT"]

/**
 * Password for a listener nobody asked for, held in memory only.
 *
 * Opening a socket makes every instance route reachable by any process running as
 * this user — `/file` reads and writes the project, `/pty` and `/bash-interactive`
 * run commands. The token-authenticated `/v1` routes are carved out of basic auth on
 * purpose (see `server/middleware.ts`), so generating this closes everything else
 * without closing the surface the listener exists for.
 */
let generatedServerPassword: string | undefined

/**
 * Generate the password for an implicit listener, once.
 *
 * Idempotent: a second listener in the same process must not invalidate the
 * credential the first one is already authenticating against. A user-supplied
 * password always wins, and in that case nothing is generated at all — the operator
 * has already said what auth should be.
 */
export function generateServerPassword() {
  if (process.env["YMCODE_SERVER_PASSWORD"]) return
  generatedServerPassword ??= Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64url")
}

/**
 * Disarm the generated password once its listener is gone.
 *
 * A credential outliving the socket it was minted for is state with no owner: nothing can
 * present it any more, but every in-process request still has to satisfy it. Clearing it
 * belongs with `stop()` for the same reason unpublishing the address does.
 */
export function clearGeneratedServerPassword() {
  generatedServerPassword = undefined
}

export const Flag = {
  OTEL_EXPORTER_OTLP_ENDPOINT: process.env["OTEL_EXPORTER_OTLP_ENDPOINT"],
  OTEL_EXPORTER_OTLP_HEADERS: process.env["OTEL_EXPORTER_OTLP_HEADERS"],

  YMCODE_AUTO_SHARE: truthy("YMCODE_AUTO_SHARE"),
  YMCODE_AUTO_HEAP_SNAPSHOT: truthy("YMCODE_AUTO_HEAP_SNAPSHOT"),
  YMCODE_GIT_BASH_PATH: process.env["YMCODE_GIT_BASH_PATH"],
  YMCODE_CONFIG: process.env["YMCODE_CONFIG"],
  YMCODE_CONFIG_CONTENT: process.env["YMCODE_CONFIG_CONTENT"],

  YMCODE_DISABLE_AUTOUPDATE: truthy("YMCODE_DISABLE_AUTOUPDATE"),

  // Defaults to false (rotation enabled). When enabled, the active log file is
  // never archived to <name>.log.<stamp> on hitting MAX_FILE_SIZE — it grows in
  // place. Useful when an external tool tails/manages the single log file.
  YMCODE_DISABLE_LOG_ROTATION: truthy("YMCODE_DISABLE_LOG_ROTATION"),

  // Defaults to true (analytics enabled). Set YMCODE_ENABLE_ANALYSIS=false
  // to opt out of POSTing model_call/tool_call/agent_request metrics.
  YMCODE_ENABLE_ANALYSIS: !falsy("YMCODE_ENABLE_ANALYSIS"),
  YMCODE_ALWAYS_NOTIFY_UPDATE: truthy("YMCODE_ALWAYS_NOTIFY_UPDATE"),
  YMCODE_DISABLE_PRUNE: truthy("YMCODE_DISABLE_PRUNE"),
  YMCODE_DISABLE_TERMINAL_TITLE: truthy("YMCODE_DISABLE_TERMINAL_TITLE"),
  YMCODE_SHOW_TTFD: truthy("YMCODE_SHOW_TTFD"),
  YMCODE_PERMISSION: process.env["YMCODE_PERMISSION"],

  // Defaults to false. When false, the bash tool intercepts irreversible
  // deletion commands (rm, rmdir, unlink, shred, del, erase, rd, remove-item,
  // and git destructive subcommands like reset --hard / clean -f / branch -D /
  // worktree remove / push --force / stash drop|clear / tag -d) and forces an
  // extra permission prompt with permission="bash_delete" — separate from the
  // normal bash-permission ask so it can't be silently pre-approved by a broad
  // `bash: allow` rule. Set YMCODE_AUTO_APPROVE_DELETE=true to trust the
  // model with deletes and skip the second confirmation.
  // Read lazily (getter, not an eagerly-evaluated literal) so an embedder can
  // flip it at runtime: the desktop app runs the server in-process, so its
  // approval mode — switchable mid-session, like the TUI's /skip-permissions —
  // has no process boundary at which to re-read env. A literal would freeze
  // this at module-evaluation time and make every later write a no-op.
  get YMCODE_AUTO_APPROVE_DELETE() {
    return truthy("YMCODE_AUTO_APPROVE_DELETE")
  },
  // Set by the TUI's --dangerously-skip-permissions flag. When truthy, an
  // allow-all base ruleset is injected UNDER the user's config permission so
  // every tool auto-approves unless the user explicitly denied it.
  YMCODE_DANGEROUSLY_SKIP_PERMISSIONS: truthy("YMCODE_DANGEROUSLY_SKIP_PERMISSIONS"),
  YMCODE_DISABLE_DEFAULT_PLUGINS: truthy("YMCODE_DISABLE_DEFAULT_PLUGINS"),
  YMCODE_DISABLE_LSP_DOWNLOAD: truthy("YMCODE_DISABLE_LSP_DOWNLOAD"),
  YMCODE_ENABLE_EXPERIMENTAL_MODELS: truthy("YMCODE_ENABLE_EXPERIMENTAL_MODELS"),
  // Defaults to false. When enabled, checkpoint writers, checkpoint-based
  // context rebuilds, and checkpoint copy in the system prompt and tool
  // schemas are disabled; context overflow falls back to compaction.
  // Read lazily so tests and in-process embedders can toggle it at runtime.
  get YMCODE_DISABLE_CHECKPOINT() {
    return truthy("YMCODE_DISABLE_CHECKPOINT")
  },
  // Defaults to protection on. Opt out to continue a batch after tool failure.
  get YMCODE_DISABLE_FAIL_CASCADE() {
    return truthy("YMCODE_DISABLE_FAIL_CASCADE")
  },
  YMCODE_DISABLE_AUTOCOMPACT: truthy("YMCODE_DISABLE_AUTOCOMPACT"),
  // Default compaction trigger, used when `compaction.max_context` is not set in
  // config. Same grammar as that config field: an absolute token count
  // ("300000"), a shorthand ("300K", "1M"), or a percentage of the model window
  // ("50%"). Clamped to the model window — it can only lower the trigger, never
  // raise it. An explicit `compaction.max_context` in config overrides this.
  // Pairs with YMCODE_DISABLE_CHECKPOINT: on the checkpoint-off fallback path
  // this is how the compaction threshold is tuned via env alone. Read lazily so
  // tests and in-process embedders can toggle it at runtime.
  get YMCODE_COMPACTION_MAX_CONTEXT() {
    return process.env["YMCODE_COMPACTION_MAX_CONTEXT"]
  },
  // Fraction of the working window at which compaction fires; the remaining
  // headroom is what the summary generation gets to write into. Accepts a decimal
  // ("0.85") or a percentage ("85%"); anything unparseable or outside (0, 1] is
  // ignored and the 0.9 default stands. Applies on top of whatever window
  // `compaction.max_context` / YMCODE_COMPACTION_MAX_CONTEXT resolved to, so
  // the two compose rather than override each other. Read lazily so tests and
  // in-process embedders can toggle it at runtime.
  get YMCODE_COMPACTION_TRIGGER_RATIO() {
    return ratio("YMCODE_COMPACTION_TRIGGER_RATIO") ?? 0.9
  },
  YMCODE_DISABLE_MODELS_FETCH: truthy("YMCODE_DISABLE_MODELS_FETCH"),
  // Defaults to automatic model inference. Explicit true forces every model to
  // use the GPT system prompt and Codex toolset; explicit false forces even GPT
  // models to use the default prompt and toolset.
  get YMCODE_CODEX_MODE() {
    if (truthy("YMCODE_CODEX_MODE")) return true
    if (falsy("YMCODE_CODEX_MODE")) return false
    return undefined
  },
  YMCODE_DISABLE_MOUSE: truthy("YMCODE_DISABLE_MOUSE"),
  YMCODE_OUTPUT_LENGTH_CONTINUATION_LIMIT: number("YMCODE_OUTPUT_LENGTH_CONTINUATION_LIMIT") ?? 3,
  YMCODE_TEXT_TOOL_CALL_RETRY_LIMIT: number("YMCODE_TEXT_TOOL_CALL_RETRY_LIMIT") ?? 2,
  // Defaults to false. When enabled, unsigned historical reasoning sent through
  // the Anthropic Messages format receives an empty placeholder signature so it
  // follows the same native thinking-block serialization path as signed content.
  get YMCODE_FORCE_ANTHROPIC_REASONING_CONTENT() {
    return truthy("YMCODE_FORCE_ANTHROPIC_REASONING_CONTENT")
  },

  // Consecutive-block repetition detection for streamed reasoning + text.
  // A block of at least N tokens repeating REPEAT_THRESHOLD times consecutively
  // within the last WINDOW_TOKENS tokens triggers recovery (remind → replan → terminate).
  YMCODE_TEXT_NGRAM_N: number("YMCODE_TEXT_NGRAM_N") ?? 4,
  YMCODE_TEXT_REPEAT_THRESHOLD: number("YMCODE_TEXT_REPEAT_THRESHOLD") ?? 20,
  YMCODE_TEXT_WINDOW_TOKENS: number("YMCODE_TEXT_WINDOW_TOKENS") ?? 500,

  // Caps applied to image attachments before a prompt is sent.
  // YMCODE_MAX_PROMPT_IMAGES (default undefined = no count limit) bounds how
  // many images may be sent per request (oldest excess images are dropped).
  // YMCODE_MAX_PROMPT_IMAGE_SIZE overrides the default per-image byte cap
  // (DEFAULT_MAX_IMAGE_BYTES ~4.5 MB, kept under the provider 5 MB hard limit);
  // oversized images are recompressed under the cap, or stripped to a text
  // placeholder when they can't be compressed. Values must be positive integers.
  YMCODE_MAX_PROMPT_IMAGES: number("YMCODE_MAX_PROMPT_IMAGES"),
  YMCODE_MAX_PROMPT_IMAGE_SIZE: number("YMCODE_MAX_PROMPT_IMAGE_SIZE"),
  // Upper bound, in bytes, on a single inline attachment (image, PDF, audio,
  // MCP blob). Enforced where the attachment is produced — the read tool, user
  // prompt attachments, and MCP result normalization — with the size taken
  // from stat or the base64 length so an under-limit payload costs nothing
  // extra. Over the limit, an image is read and recompressed to fit; anything
  // that still cannot fit (PDFs, audio, video, undecodable images) is replaced
  // by a notice, so nothing oversized ever becomes a stored part. Defaults to
  // 50 MB. Provider limits are lower (the Claude API takes 10 MB per image,
  // Bedrock and Vertex 5 MB) and are still enforced at send time by the
  // YMCODE_MAX_PROMPT_IMAGE_SIZE / provider cap in provider/transform.ts.
  // Read lazily so tests can flip it at runtime.
  get YMCODE_MAX_ATTACHMENT_SIZE() {
    return number("YMCODE_MAX_ATTACHMENT_SIZE") ?? 50 * 1024 * 1024
  },
  // Ceiling, in bytes, above which an oversized image is refused outright
  // instead of being read and recompressed. Defaults to 150 MB: compressImage
  // already refuses anything over MAX_DECODE_IMAGE_PIXELS (64 MP), and a PNG
  // that decodes within that budget is at most ~150-200 MB on disk, so a
  // larger file would only be read into memory to fail the pixel guard.
  // Read lazily so tests can flip it at runtime.
  get YMCODE_MAX_ATTACHMENT_SOURCE_SIZE() {
    return number("YMCODE_MAX_ATTACHMENT_SOURCE_SIZE") ?? 150 * 1024 * 1024
  },
  YMCODE_ONLY,
  YMCODE_DISABLE_PROVIDER_ENV: YMCODE_ONLY || truthy("YMCODE_DISABLE_PROVIDER_ENV"),
  YMCODE_DISABLE_CLAUDE_CODE,
  get YMCODE_DISABLE_CLAUDE_CODE_MCP() {
    // MCP compatibility stays on in mimo-only mode so users can reuse Claude Code
    // MCP servers without inheriting prompts or provider env keys.
    return YMCODE_DISABLE_CLAUDE_CODE_ENV || truthy("YMCODE_DISABLE_CLAUDE_CODE_MCP")
  },
  YMCODE_DISABLE_CLAUDE_CODE_PROMPT: YMCODE_DISABLE_CLAUDE_CODE || truthy("YMCODE_DISABLE_CLAUDE_CODE_PROMPT"),
  // Defaults to false (enabled): markdown commands under ~/.claude/commands and
  // {project}/.claude/commands load as slash commands. Independent of the
  // mimo-only master switch. Set YMCODE_DISABLE_CLAUDE_CODE_COMMANDS=true to disable.
  YMCODE_DISABLE_CLAUDE_CODE_COMMANDS: truthy("YMCODE_DISABLE_CLAUDE_CODE_COMMANDS"),
  // Defaults to false. Set to true or 1 to import Claude Code sessions on startup.
  YMCODE_ENABLE_CLAUDE_IMPORT: truthy("YMCODE_ENABLE_CLAUDE_IMPORT"),
  // External skill-root switches. Read lazily so tests can flip env.
  get YMCODE_DISABLE_AGENTS_SKILLS() {
    return truthy("YMCODE_DISABLE_AGENTS_SKILLS")
  },
  get YMCODE_ENABLE_CLAUDE_CODE_SKILLS() {
    return truthy("YMCODE_ENABLE_CLAUDE_CODE_SKILLS")
  },
  get YMCODE_ENABLE_CODEX_SKILLS() {
    return truthy("YMCODE_ENABLE_CODEX_SKILLS")
  },
  get YMCODE_ENABLE_OPENCODE_SKILLS() {
    return truthy("YMCODE_ENABLE_OPENCODE_SKILLS")
  },

  // Skill-search ranking and loading policy. Exact mentions stay above BM25;
  // the BM25/coverage blend has a 0.90 ceiling, and near-max results auto-load.
  YMCODE_SKILL_SEARCH_EXACT_SCORE: 1,
  YMCODE_SKILL_SEARCH_BM25_K1: 1.5,
  YMCODE_SKILL_SEARCH_BM25_LENGTH_NORMALIZATION: 0.75,
  YMCODE_SKILL_SEARCH_BM25_IDF_SMOOTHING: 0.5,
  YMCODE_SKILL_SEARCH_BM25_SCORE_WEIGHT: 0.55,
  YMCODE_SKILL_SEARCH_QUERY_COVERAGE_WEIGHT: 0.35,
  YMCODE_SKILL_SEARCH_AUTO_LOAD_THRESHOLD: 0.85,
  YMCODE_SKILL_SEARCH_SCORE_PRECISION: 4,
  YMCODE_SKILL_SEARCH_MAX_RESULTS: 3,
  YMCODE_SKILL_SEARCH_STEM_MIN_LENGTH: 3,
  YMCODE_SKILL_SEARCH_FILE_SAMPLE_LIMIT: 10,

  // Defaults to false. When enabled, skill-source commands appear in the `/`
  // autocomplete dropdown alongside user commands and MCP prompts. Skills are
  // surfaced in `/` completion by default; set YMCODE_DISABLE_SLASH_SKILLS=1
  // to hide them and fall back to the `/skills` picker + model-driven
  // invocation only.
  YMCODE_DISABLE_SLASH_SKILLS: truthy("YMCODE_DISABLE_SLASH_SKILLS"),
  YMCODE_FAKE_VCS: process.env["YMCODE_FAKE_VCS"],

  // When enabled, skips all git subprocess calls during project discovery
  // (which git, rev-parse --git-common-dir, rev-parse --show-toplevel) and
  // branch detection. The project is treated as a non-git directory rooted at
  // the working directory. Use to avoid touching git in restricted/sandboxed
  // environments or where git startup probing is undesirable.
  YMCODE_DISABLE_GIT: truthy("YMCODE_DISABLE_GIT"),

  /**
   * The password every non-`/v1` route is authenticated against.
   *
   * A getter rather than a snapshot, because a listener the user did not ask for
   * generates one at bind time (see `generateServerPassword`). The generated value
   * is deliberately NOT written to `process.env`: every child we spawn inherits the
   * environment, and a subprocess is supposed to hold a scoped task token, never the
   * credential that opens the whole instance API.
   */
  get YMCODE_SERVER_PASSWORD() {
    return process.env["YMCODE_SERVER_PASSWORD"] || generatedServerPassword
  },
  /**
   * Did the OPERATOR configure auth, as opposed to us generating a password for a
   * listener we opened on our own initiative?
   *
   * The difference is load-bearing for `InstanceMiddleware`: a user-secured server is
   * allowed to serve directories outside its cwd (the desktop engine does exactly
   * that), while an implicit listener must stay pinned to one project no matter what
   * credential guards it.
   */
  get YMCODE_SERVER_PASSWORD_SUPPLIED() {
    return Boolean(process.env["YMCODE_SERVER_PASSWORD"])
  },
  YMCODE_SERVER_USERNAME: process.env["YMCODE_SERVER_USERNAME"],
  YMCODE_ENABLE_QUESTION_TOOL: truthy("YMCODE_ENABLE_QUESTION_TOOL"),

  // Defaults to false. Set YMCODE_ENABLE_TRY_BEST_HANDOFF=true (or 1) to
  // enable try-best loop detection, automatic turn pausing, and handoff UI.
  YMCODE_ENABLE_TRY_BEST_HANDOFF: truthy("YMCODE_ENABLE_TRY_BEST_HANDOFF"),

  // Defaults to true: the runtime-derived environment block (working
  // directory, platform, shell, git status/branch/commits) is appended to the
  // model's system prompt for every provider. Disable with
  // YMCODE_DISABLE_DYNAMIC_SYSTEM_PROMPT=true (or, for compatibility,
  // YMCODE_ENABLE_DYNAMIC_SYSTEM_PROMPT=false/0). Instruction files
  // (AGENTS.md / CLAUDE.md) are appended regardless — suppress the whole
  // block with YMCODE_DISABLE_INSTRUCTIONS, or individual sources with
  // YMCODE_DISABLE_PROJECT_CONFIG / YMCODE_DISABLE_CLAUDE_CODE_PROMPT.
  get YMCODE_ENABLE_DYNAMIC_SYSTEM_PROMPT() {
    if (truthy("YMCODE_DISABLE_DYNAMIC_SYSTEM_PROMPT")) return false
    if (process.env["YMCODE_ENABLE_DYNAMIC_SYSTEM_PROMPT"] !== undefined) {
      return truthy("YMCODE_ENABLE_DYNAMIC_SYSTEM_PROMPT")
    }
    return true
  },

  // Defaults to false (enabled): instruction-file content (AGENTS.md / CLAUDE.md)
  // is appended to the model's system prompt. Set YMCODE_DISABLE_INSTRUCTIONS=true
  // to drop the whole instruction block regardless of which files resolve.
  get YMCODE_DISABLE_INSTRUCTIONS() {
    return truthy("YMCODE_DISABLE_INSTRUCTIONS")
  },

  // Defaults to false. The edit tool does pure exact-string matching with
  // explicit error signals. Set YMCODE_ENABLE_FUZZY_EDIT=true to opt into the
  // legacy multi-stage fuzzy fallback chain (line-trimmed / block-anchor /
  // whitespace-normalized / indentation-flexible / etc.) when old_string fails
  // to match exactly.
  YMCODE_ENABLE_FUZZY_EDIT: truthy("YMCODE_ENABLE_FUZZY_EDIT"),

  // Experimental
  YMCODE_EXPERIMENTAL,
  YMCODE_EXPERIMENTAL_FILEWATCHER: Config.boolean("YMCODE_EXPERIMENTAL_FILEWATCHER").pipe(
    Config.withDefault(false),
  ),
  YMCODE_EXPERIMENTAL_DISABLE_FILEWATCHER: Config.boolean("YMCODE_EXPERIMENTAL_DISABLE_FILEWATCHER").pipe(
    Config.withDefault(false),
  ),
  YMCODE_EXPERIMENTAL_ICON_DISCOVERY: YMCODE_EXPERIMENTAL || truthy("YMCODE_EXPERIMENTAL_ICON_DISCOVERY"),
  YMCODE_EXPERIMENTAL_DISABLE_COPY_ON_SELECT:
    copy === undefined ? process.platform === "win32" : truthy("YMCODE_EXPERIMENTAL_DISABLE_COPY_ON_SELECT"),
  YMCODE_ENABLE_EXA: truthy("YMCODE_ENABLE_EXA") || YMCODE_EXPERIMENTAL || truthy("YMCODE_EXPERIMENTAL_EXA"),
  YMCODE_EXPERIMENTAL_BASH_DEFAULT_TIMEOUT_MS: number("YMCODE_EXPERIMENTAL_BASH_DEFAULT_TIMEOUT_MS"),
  // Token-efficient post-cleanse: strip ANSI / fold \r progress bars / redact
  // secrets / elide super-long lines from bash tool output before it is
  // returned to the model. Only applies when the output fits inline — if the
  // output spills to a truncation file, cleaning is skipped so the on-disk
  // archive stays raw. Off by default. Set to 1/true to opt in.
  YMCODE_EXPERIMENTAL_TOKEN_EFFICIENCY: truthy("YMCODE_EXPERIMENTAL_TOKEN_EFFICIENCY"),
  // Tunables for the token-efficient post-cleanse pipeline (see
  // src/tool/bash_token_efficient_pipeline.ts). Positive integers only;
  // unset / non-positive values fall back to the documented defaults.
  //   MAX_LINE_CHARS   threshold above which a single line is elided  (default 500)
  //   LINE_HEAD_KEEP   chars kept from the head of an elided line     (default 160)
  //   NEVER_WORSE_MARGIN  bytes the cleaned output must beat the raw  (default 0)
  YMCODE_EXPERIMENTAL_TOKEN_EFFICIENCY_MAX_LINE_CHARS: number("YMCODE_EXPERIMENTAL_TOKEN_EFFICIENCY_MAX_LINE_CHARS") ?? 500,
  YMCODE_EXPERIMENTAL_TOKEN_EFFICIENCY_LINE_HEAD_KEEP: number("YMCODE_EXPERIMENTAL_TOKEN_EFFICIENCY_LINE_HEAD_KEEP") ?? 160,
  YMCODE_EXPERIMENTAL_TOKEN_EFFICIENCY_NEVER_WORSE_MARGIN: number("YMCODE_EXPERIMENTAL_TOKEN_EFFICIENCY_NEVER_WORSE_MARGIN") ?? 0,
  // Heuristic (shape-based) filter pipeline for bash output. Runs AFTER the
  // common pipeline, only when the common pipeline is enabled AND this flag is
  // explicitly opted in. Each shape (gitdiff / pytest / npm / make /
  // stacktrace / tsc / kubectl / json / md / gostest) recognises a command
  // pattern or body fingerprint and rewrites the body to strip predictable
  // noise. Off by default. Set to 1/true to opt in.
  YMCODE_EXPERIMENTAL_TOKEN_EFFICIENCY_HEURISTIC: truthy("YMCODE_EXPERIMENTAL_TOKEN_EFFICIENCY_HEURISTIC"),
  YMCODE_EXPERIMENTAL_OUTPUT_TOKEN_MAX: number("YMCODE_EXPERIMENTAL_OUTPUT_TOKEN_MAX"),
  YMCODE_EXPERIMENTAL_OXFMT: YMCODE_EXPERIMENTAL || truthy("YMCODE_EXPERIMENTAL_OXFMT"),
  YMCODE_EXPERIMENTAL_LSP_TY: truthy("YMCODE_EXPERIMENTAL_LSP_TY"),
  YMCODE_EXPERIMENTAL_LSP_TOOL: YMCODE_EXPERIMENTAL || truthy("YMCODE_EXPERIMENTAL_LSP_TOOL"),
  // Defaults to OFF: exec (tool_script orchestration) is registered only for
  // GPT-toolset models. Opt in here to expose it to every model.
  YMCODE_ENABLE_EXEC_TOOL: truthy("YMCODE_ENABLE_EXEC_TOOL"),
  // MCP tool lazy-loading: `true` (default) always defers MCP tool schemas
  // behind mcp_tool_search, `auto` defers once they exceed 10% of the context
  // window, `auto:N` uses N%, `false` never defers. Codex-mode models always defer.
  get YMCODE_MCP_TOOL_SEARCH() {
    return process.env["YMCODE_MCP_TOOL_SEARCH"]
  },
  // Defaults to OFF (opt-in): dynamic workflows and built-in workflows.
  // Enable with YMCODE_EXPERIMENTAL_WORKFLOW_TOOL=true (or the umbrella
  // YMCODE_EXPERIMENTAL flag).
  YMCODE_EXPERIMENTAL_WORKFLOW_TOOL:
    YMCODE_EXPERIMENTAL || truthy("YMCODE_EXPERIMENTAL_WORKFLOW_TOOL"),
  // Defaults to true: cron + self-paced loop scheduling are on by default.
  // Set YMCODE_EXPERIMENTAL_CRON=false to opt out. Runtime kill switch is
  // YMCODE_DISABLE_CRON (checked live every tick).
  YMCODE_EXPERIMENTAL_CRON: !falsy("YMCODE_EXPERIMENTAL_CRON"),
  // Keepalive contract for self-paced loops (spec [S8]). Budget = how many
  // "forget" turns the model gets before the loop is declared model_stopped;
  // delay seconds = the auto-arm horizon used for the keepalive fire. Budget
  // accepts 0 (end immediately on the first turn without a re-arm) for tests
  // and aggressive policies. Both are getters so tests can flip the env var
  // between cases without restarting the process.
  get YMCODE_LOOP_KEEPALIVE_BUDGET() {
    return nonNegativeNumber("YMCODE_LOOP_KEEPALIVE_BUDGET") ?? 1
  },
  get YMCODE_LOOP_KEEPALIVE_DELAY_S() {
    return number("YMCODE_LOOP_KEEPALIVE_DELAY_S") ?? 1200
  },
  YMCODE_EXPERIMENTAL_MARKDOWN: !falsy("YMCODE_EXPERIMENTAL_MARKDOWN"),
  YMCODE_MODELS_URL: process.env["YMCODE_MODELS_URL"],
  YMCODE_MODELS_PATH: process.env["YMCODE_MODELS_PATH"],
  YMCODE_DISABLE_EMBEDDED_WEB_UI: truthy("YMCODE_DISABLE_EMBEDDED_WEB_UI"),
  YMCODE_DB: process.env["YMCODE_DB"],

  // Defaults to true — all channels share a single ymcode.db. The per-channel
  // DB isolation (ymcode-{channel}.db) is unnecessary for ymcode since we
  // don't ship multiple release channels yet. Use YMCODE_HOME to isolate dev
  // environments instead. Set YMCODE_DISABLE_CHANNEL_DB=false to restore
  // per-channel isolation.
  YMCODE_DISABLE_CHANNEL_DB: !falsy("YMCODE_DISABLE_CHANNEL_DB"),
  YMCODE_SKIP_MIGRATIONS: truthy("YMCODE_SKIP_MIGRATIONS"),
  YMCODE_STRICT_CONFIG_DEPS: truthy("YMCODE_STRICT_CONFIG_DEPS"),

  YMCODE_WORKSPACE_ID: process.env["YMCODE_WORKSPACE_ID"],
  YMCODE_EXPERIMENTAL_HTTPAPI: truthy("YMCODE_EXPERIMENTAL_HTTPAPI"),
  YMCODE_EXPERIMENTAL_WORKSPACES: YMCODE_EXPERIMENTAL || truthy("YMCODE_EXPERIMENTAL_WORKSPACES"),

  // Evaluated at access time (not module load) because tests, the CLI, and
  // external tooling set these env vars at runtime.

  // Disables user-facing builtin skills shipped with the binary (e.g.
  // ymcode-docs).
  get YMCODE_DISABLE_BUILTIN_SKILLS() {
    return truthy("YMCODE_DISABLE_BUILTIN_SKILLS")
  },
  // Disables the built-in official skills (docx, pdf, pptx, xlsx,
  // html-to-video-pipeline) while keeping the rest of the builtin bundle
  // available. Defaults to false (all skills are extracted and loaded). Set
  // YMCODE_DISABLE_OFFICIAL_SKILLS=true to skip them.
  get YMCODE_DISABLE_OFFICIAL_SKILLS() {
    return truthy("YMCODE_DISABLE_OFFICIAL_SKILLS")
  },
  get YMCODE_DISABLE_PROJECT_CONFIG() {
    return truthy("YMCODE_DISABLE_PROJECT_CONFIG")
  },
  get YMCODE_TUI_CONFIG() {
    return process.env["YMCODE_TUI_CONFIG"]
  },
  get YMCODE_CONFIG_DIR() {
    return process.env["YMCODE_CONFIG_DIR"]
  },
  get YMCODE_HOME() {
    return process.env["YMCODE_HOME"]
  },
  get YMCODE_PURE() {
    return truthy("YMCODE_PURE")
  },
  // Loads only external plugins, file hooks and TUI plugins provided by
  // YMCODE_CONFIG_DIR. Always on for the Node build, which cannot serve the
  // plugin SDK to user code.
  get YMCODE_ONLY_CONFIG_DIR_PLUGINS() {
    return truthy("YMCODE_ONLY_CONFIG_DIR_PLUGINS")
  },
  get YMCODE_PLUGIN_META_FILE() {
    return process.env["YMCODE_PLUGIN_META_FILE"]
  },
  get YMCODE_CLIENT() {
    return process.env["YMCODE_CLIENT"] ?? "cli"
  },
}
