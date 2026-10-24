import { Cause, Effect, Exit } from "effect"
import { EOL } from "os"
import fs from "fs/promises"
import path from "path"
import { cmd } from "./cmd"
import { UI } from "../ui"
import { Global } from "../../global"
import { Flag } from "../../flag/flag"
import { InstallationVersion } from "../../installation/version"
import { Instance } from "../../project/instance"
import { AppRuntime } from "@/effect/app-runtime"
import { Config } from "@/config"
import { Provider } from "@/provider"
import { ModelsDev } from "@/provider"

type Status = "ok" | "warn" | "error" | "info"

type Check = {
  section: string
  name: string
  status: Status
  detail?: string
  fix?: string
}

function printable(value: string) {
  return value.replace(/\r?\n/g, " ").trim()
}

function semver(value: string) {
  const match = value.match(/(\d+)\.(\d+)\.(\d+)/)
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : undefined
}

function atLeast(value: string, major: number, minor = 0, patch = 0) {
  const parts = semver(value)
  if (!parts) return false
  if (parts[0] !== major) return parts[0] > major
  if (parts[1] !== minor) return parts[1] > minor
  return parts[2] >= patch
}

async function exists(target: string) {
  return fs
    .stat(target)
    .then(() => true)
    .catch(() => false)
}

async function writable(dir: string) {
  const probe = path.join(dir, `.ymcode-doctor-${process.pid}.tmp`)
  try {
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(probe, "")
    await fs.rm(probe, { force: true })
    return true
  } catch {
    return false
  }
}

/** Every directory from `start` up to the filesystem root. */
function up(start: string) {
  const out: string[] = []
  let current = path.resolve(start)
  for (;;) {
    out.push(current)
    const parent = path.dirname(current)
    if (parent === current) break
    current = parent
  }
  return out
}

async function configCandidates(directory: string) {
  const found: { file: string }[] = []
  for (const dir of up(directory)) {
    for (const name of ["ymcode.jsonc", "ymcode.json"]) {
      const file = path.join(dir, ".ymcode", name)
      if (await exists(file)) found.push({ file })
    }
  }
  for (const name of ["ymcode.jsonc", "ymcode.json", "config.json"]) {
    const file = path.join(Global.Path.config, name)
    if (await exists(file)) found.push({ file })
  }
  return found
}

function nearestModel(model: string, available: string[]) {
  const needle = model.toLowerCase()
  const scored = available
    .map((id) => {
      const lower = id.toLowerCase()
      let score = 0
      if (lower === needle) score = 100
      else if (lower.startsWith(needle) || needle.startsWith(lower)) score = 60
      else if (lower.includes(needle) || needle.includes(lower)) score = 40
      else {
        const shared = [...new Set(needle.split(/[-_.]/))].filter((part) => part && lower.includes(part)).length
        score = shared * 10
      }
      return { id, score }
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
  return scored.slice(0, 3).map((entry) => entry.id)
}

const credentialEnv = [
  "ANTHROPIC_API_KEY",
  "OPENAI_API_KEY",
  "DEEPSEEK_API_KEY",
  "GEMINI_API_KEY",
  "GOOGLE_GENERATIVE_AI_API_KEY",
  "XAI_API_KEY",
  "OPENROUTER_API_KEY",
  "ZAI_API_KEY",
  "XIAOMI_API_KEY",
]

export const DoctorCommand = cmd({
  command: "doctor",
  describe: "检查运行环境、配置与凭据并给出修复建议",
  builder: (yargs) =>
    yargs
      .option("json", {
        describe: "以 JSON 输出检查结果（便于提交问题报告）",
        type: "boolean",
        default: false,
      })
      .option("network", {
        describe: "额外检查 models.dev 与 github.com 的连通性",
        type: "boolean",
        default: false,
      }),
  handler: async (args) => {
    const checks: Check[] = []
    const add = (check: Check) => checks.push(check)

    // --- runtime -----------------------------------------------------------
    add({
      section: "运行时",
      name: `ymcode ${InstallationVersion}`,
      status: "ok",
      detail: `${process.platform}-${process.arch}`,
    })

    const bun = process.versions.bun
    if (bun) {
      add({
        section: "运行时",
        name: `bun ${bun}`,
        status: atLeast(bun, 1, 3, 0) ? "ok" : "warn",
        detail: atLeast(bun, 1, 3, 0) ? undefined : "源码运行需要 bun >= 1.3.0",
        fix: atLeast(bun, 1, 3, 0) ? undefined : "bun upgrade",
      })
    } else {
      add({ section: "运行时", name: "独立二进制", status: "ok", detail: "未使用 bun 运行时" })
    }

    const nodePath = Bun.which("node")
    if (!nodePath) {
      add({
        section: "运行时",
        name: "node 未安装",
        status: "info",
        detail: "可选：部分插件宿主与 node:sqlite 相关能力需要 Node",
      })
    } else {
      const version = new TextDecoder()
        .decode(Bun.spawnSync([nodePath, "--version"]).stdout ?? new Uint8Array())
        .trim()
      const ok = atLeast(version, 24)
      add({
        section: "运行时",
        name: `node ${version || "unknown"}`,
        status: ok ? "ok" : "warn",
        detail: ok ? undefined : "node:sqlite 相关功能需要 Node >= 24",
        fix: ok ? undefined : "升级 Node 到 24 或更高版本",
      })
    }

    // --- paths -------------------------------------------------------------
    const home = Flag.YMCODE_HOME
    if (!home) {
      add({ section: "路径", name: "YMCODE_HOME 未设置", status: "ok", detail: "使用系统默认目录" })
    } else if (!path.isAbsolute(home)) {
      add({
        section: "路径",
        name: `YMCODE_HOME=${home}`,
        status: "error",
        detail: "必须是绝对路径",
        fix: "设置一个绝对路径，例如 YMCODE_HOME=/home/<user>/.ymcode",
      })
    } else {
      add({ section: "路径", name: `YMCODE_HOME=${home}`, status: "ok" })
    }

    for (const [label, dir] of [
      ["数据", Global.Path.data],
      ["配置", Global.Path.config],
      ["状态", Global.Path.state],
      ["缓存", Global.Path.cache],
    ] as const) {
      const ok = await writable(dir)
      add({
        section: "路径",
        name: `${label}目录 ${dir}`,
        status: ok ? "ok" : "error",
        detail: ok ? undefined : "不可写",
        fix: ok ? undefined : `检查该目录的权限或磁盘空间`,
      })
    }

    // --- config ------------------------------------------------------------
    const files = await configCandidates(process.cwd())
    if (files.length === 0) {
      add({
        section: "配置",
        name: "未发现配置文件",
        status: "info",
        detail: "将使用内置默认值",
        fix: "创建 .ymcode/ymcode.jsonc 或运行 ymcode models 前先配置 provider",
      })
    } else {
      for (const entry of files) {
        add({
          section: "配置",
          name: entry.file,
          status: "ok",
        })
      }
    }

    // Load through the real config service so parse/schema errors surface with
    // the same wording the runtime would use. Dies are inspected via Exit.
    let model: string | undefined
    // Survives the config block's early returns — the credential probe below
    // needs provider endpoints even when the model config is empty.
    let providersSnapshot: Record<string, unknown> = {}
    await Instance.provide({
      directory: process.cwd(),
      async fn() {
        const exit = await AppRuntime.runPromise(
          Effect.gen(function* () {
            const cfg = yield* (yield* Config.Service).get()
            const providers = yield* (yield* Provider.Service).list()
            return { cfg, providers }
          }).pipe(Effect.exit),
        )
        if (Exit.isSuccess(exit)) providersSnapshot = exit.value.providers as Record<string, unknown>
        if (Exit.isFailure(exit)) {
          add({
            section: "配置",
            name: "配置解析失败",
            status: "error",
            detail: printable(Cause.pretty(exit.cause)).slice(0, 500),
            fix: "按上面的路径修复 JSON/JSONC 语法或字段类型后重试",
          })
          return
        }
        const { cfg, providers } = exit.value
        if (!cfg.model) {
          add({
            section: "配置",
            name: "未设置默认模型",
            status: "warn",
            detail: "config.model 为空",
            fix: "在配置中设置 model（例如 deepseek/deepseek-flash），或在 TUI 中用 /models 选择",
          })
          return
        }
        model = cfg.model
        const slash = model.indexOf("/")
        const providerID = slash === -1 ? model : model.slice(0, slash)
        const modelID = slash === -1 ? "" : model.slice(slash + 1)
        if (slash === -1) {
          add({
            section: "配置",
            name: `默认模型 ${model}`,
            status: "error",
            detail: "缺少 provider/model 中的斜杠分隔",
            fix: `改用 ${model}/<model-id> 形式`,
          })
          return
        }
        const provider = providers[providerID as keyof typeof providers]
        if (!provider) {
          // The provider may exist in the models catalog but be unloaded because
          // no credential is configured — that is a setup problem, not a typo.
          const catalog = await ModelsDev.get()
          const known = Object.prototype.hasOwnProperty.call(catalog, providerID)
          add({
            section: "配置",
            name: `默认模型 ${model}`,
            status: "error",
            detail: known
              ? `provider「${providerID}」已存在于模型目录，但当前未加载（缺少凭据）`
              : `未找到 provider「${providerID}」`,
            fix: known
              ? `为该 provider 配置 API key（TUI 中 /connect，或设置对应 *_API_KEY 环境变量）`
              : "运行 ymcode models 查看已注册的 provider",
          })
          return
        }
        const available = Object.keys(provider.models)
        if (!available.includes(modelID)) {
          const near = nearestModel(modelID, available)
          add({
            section: "配置",
            name: `默认模型 ${model}`,
            status: "error",
            detail: `provider「${providerID}」中没有模型「${modelID}」`,
            fix: near.length
              ? `可能是模型改名，试试：${near.map((id) => `${providerID}/${id}`).join("、")}`
              : `运行 ymcode models ${providerID} 查看可用模型`,
          })
          return
        }
        add({ section: "配置", name: `默认模型 ${model}`, status: "ok", detail: `${available.length} 个模型可用` })
      },
    })

    // --- credentials -------------------------------------------------------
    const authFile = path.join(Global.Path.data, "auth.json")
    let authProviders: string[] = []
    let authEntries: Record<string, { type?: string; key?: string }> = {}
    if (await exists(authFile)) {
      const text = await fs.readFile(authFile, "utf8").catch(() => "")
      try {
        const parsed = JSON.parse(text) as Record<string, unknown>
        authProviders = Object.keys(parsed)
        authEntries = parsed as typeof authEntries
      } catch {
        add({
          section: "凭据",
          name: `auth.json 无法解析`,
          status: "error",
          detail: authFile,
          fix: "修复 JSON 语法，或删除该文件后用 /connect 重新登录",
        })
      }
    }
    if (authProviders.length) {
      add({
        section: "凭据",
        name: `已登录 provider：${authProviders.join("、")}`,
        status: "ok",
        detail: authFile,
      })
      // Presence is not validity: a rotated/expired key only surfaces as a
      // mid-run provider error. Probe each stored key with a cheap
      // authenticated GET {baseURL}/models so doctor can say which key is
      // actually dead. Never prints key material.
      await Promise.all(
        authProviders.map(async (providerID) => {
          const entry = authEntries[providerID]
          if (!entry?.key) return
          const info = providersSnapshot[providerID] as
            | { options?: Record<string, unknown>; models?: Record<string, { api?: { url?: string } }> }
            | undefined
          const first = info && Object.values(info.models ?? {})[0]
          const baseURL =
            ((info?.options?.["baseURL"] as string | undefined) || first?.api?.url || "").replace(/\/+$/, "")
          if (!baseURL) return
          const url = `${baseURL}/models`
          try {
            const res = await fetch(url, {
              headers: { Authorization: `Bearer ${entry.key}` },
              signal: AbortSignal.timeout(6000),
            })
            if (res.ok) {
              add({
                section: "凭据",
                name: `provider「${providerID}」key 联网验证通过`,
                status: "ok",
                detail: url,
              })
            } else if (res.status === 401 || res.status === 403) {
              add({
                section: "凭据",
                name: `provider「${providerID}」的 API key 已失效`,
                status: "error",
                detail: `服务端返回 HTTP ${res.status}（key 可能已过期或被轮换）`,
                fix: "运行 ymcode setup 重新配置该 provider 的 API key，或编辑 auth.json 对应条目后重试",
              })
            } else {
              add({
                section: "凭据",
                name: `provider「${providerID}」key 验证返回 HTTP ${res.status}`,
                status: "warn",
                detail: `${url}（无法据此判定 key 有效性）`,
              })
            }
          } catch (error) {
            const reason = error instanceof Error ? error.message : String(error)
            add({
              section: "凭据",
              name: `provider「${providerID}」key 无法联网验证`,
              status: "warn",
              detail: `${url}（${reason.slice(0, 120)}）`,
            })
          }
        }),
      )
    }
    const envKeys = credentialEnv.filter((key) => !!process.env[key])
    if (envKeys.length) {
      add({ section: "凭据", name: `环境变量：${envKeys.join("、")}`, status: "ok" })
    }
    if (authProviders.length === 0 && envKeys.length === 0) {
      add({
        section: "凭据",
        name: "未发现任何 provider 凭据",
        status: "warn",
        detail: "auth.json 与常见 *_API_KEY 均为空",
        fix: "运行 ymcode 后在 TUI 中 /connect，或设置对应 provider 的 API key 环境变量",
      })
    }

    // --- ripgrep -----------------------------------------------------------
    const rg = Bun.which(process.platform === "win32" ? "rg.exe" : "rg")
    const bundled = path.join(Global.Path.bin, process.platform === "win32" ? "rg.exe" : "rg")
    if (rg) {
      add({ section: "搜索", name: `ripgrep ${rg}`, status: "ok", detail: "来自 PATH" })
    } else if (await exists(bundled)) {
      add({ section: "搜索", name: `ripgrep ${bundled}`, status: "ok", detail: "由 ymcode 自动下载" })
    } else {
      add({
        section: "搜索",
        name: "未找到 ripgrep（rg）",
        status: "warn",
        detail: "grep/glob 工具会退化或失败",
        fix:
          process.platform === "win32"
            ? "winget install BurntSushi.ripgrep.MSVC"
            : process.platform === "darwin"
              ? "brew install ripgrep"
              : "dnf install ripgrep / apt install ripgrep（或让 ymcode 首次搜索时自动下载，需要能访问 github.com）",
      })
    }

    // --- database ----------------------------------------------------------
    const db = path.join(Global.Path.data, "ymcode.db")
    if (await exists(db)) {
      const stat = await fs.stat(db)
      add({
        section: "数据",
        name: `会话数据库 ${(stat.size / 1024 / 1024).toFixed(1)} MB`,
        status: "ok",
        detail: db,
      })
    } else {
      add({
        section: "数据",
        name: "会话数据库尚未创建",
        status: "info",
        detail: "首次运行时会自动创建",
      })
    }

    // --- optional network --------------------------------------------------
    if (args.network) {
      const probe = async (url: string) => {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 5000)
        try {
          const response = await fetch(url, { method: "HEAD", signal: controller.signal })
          return { ok: response.ok || response.status < 500, status: String(response.status) }
        } catch (error) {
          return { ok: false, status: String(error) }
        } finally {
          clearTimeout(timer)
        }
      }
      const models = await probe("https://models.dev/api.json")
      add({
        section: "网络",
        name: "models.dev",
        status: models.ok ? "ok" : "warn",
        detail: models.status,
        fix: models.ok ? undefined : "模型目录只能在本地快照上工作；如需刷新请检查代理/DNS",
      })
      const github = await probe("https://github.com")
      add({
        section: "网络",
        name: "github.com",
        status: github.ok ? "ok" : "warn",
        detail: github.status,
        fix: github.ok ? undefined : "rg 自动下载不可用；请手动安装 ripgrep",
      })
    }

    // --- output ------------------------------------------------------------
    const errors = checks.filter((check) => check.status === "error").length
    const warnings = checks.filter((check) => check.status === "warn").length

    if (args.json) {
      process.stdout.write(
        JSON.stringify({ version: InstallationVersion, ok: errors === 0, errors, warnings, checks }, null, 2) + EOL,
      )
    } else {
      const icon: Record<Status, string> = {
        ok: `${UI.Style.TEXT_SUCCESS}✓${UI.Style.TEXT_NORMAL}`,
        warn: `${UI.Style.TEXT_WARNING}!${UI.Style.TEXT_NORMAL}`,
        error: `${UI.Style.TEXT_DANGER}✗${UI.Style.TEXT_NORMAL}`,
        info: `${UI.Style.TEXT_DIM}·${UI.Style.TEXT_NORMAL}`,
      }
      let section = ""
      for (const check of checks) {
        if (check.section !== section) {
          section = check.section
          process.stdout.write(EOL + UI.Style.TEXT_NORMAL_BOLD + section + UI.Style.TEXT_NORMAL + EOL)
        }
        process.stdout.write(`  ${icon[check.status]} ${check.name}${EOL}`)
        if (check.detail) process.stdout.write(`    ${UI.Style.TEXT_DIM}${check.detail}${UI.Style.TEXT_NORMAL}${EOL}`)
        if (check.fix) process.stdout.write(`    ${UI.Style.TEXT_DIM}修复：${check.fix}${UI.Style.TEXT_NORMAL}${EOL}`)
      }
      process.stdout.write(EOL)
      const summary =
        errors === 0
          ? `${UI.Style.TEXT_SUCCESS}没有发现阻塞性问题${UI.Style.TEXT_NORMAL}` +
            (warnings ? `，${warnings} 项建议处理` : "")
          : `${UI.Style.TEXT_DANGER}${errors} 个问题需要修复${UI.Style.TEXT_NORMAL}` +
            (warnings ? `，另有 ${warnings} 项建议` : "")
      process.stdout.write(summary + EOL)
      if (!model && errors === 0) {
        process.stdout.write(
          `${UI.Style.TEXT_DIM}下一步：配置模型后运行 ymcode models 验证，再直接运行 ymcode 进入 TUI${UI.Style.TEXT_NORMAL}${EOL}`,
        )
      }
    }

    if (errors > 0) process.exitCode = 1
  },
})
