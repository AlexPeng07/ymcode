import * as prompts from "@clack/prompts"
import { Effect } from "effect"
import path from "path"
import { cmd } from "./cmd"
import { AppRuntime } from "@/effect/app-runtime"
import { Auth } from "@/auth"
import { Config } from "@/config"
import { Global } from "@/global"
import { Instance } from "@/project/instance"
import { ModelsDev, Provider } from "@/provider"
import { PROVIDER_PRIORITY } from "@/util/provider-priority"

function credentialHint(provider: ModelsDev.Provider) {
  const detected = provider.env.find((name) => Boolean(process.env[name]))
  if (detected) return `检测到 ${detected}`
  if (provider.id === "opencode") return "Zen"
  if (provider.env.length === 0) return "本地服务，无需 API Key"
  return `需要 ${provider.env[0]}`
}

/** Models a setup wizard can reasonably offer: usable with tools, newest first. */
export function modelChoices(provider: ModelsDev.Provider) {
  const all = Object.values(provider.models)
  const usable = all.filter((model) => model.tool_call !== false && model.status !== "deprecated")
  return (usable.length > 0 ? usable : all).sort(
    (a, b) => (b.release_date ?? "").localeCompare(a.release_date ?? "") || a.id.localeCompare(b.id),
  )
}

/** Enabled providers with at least one selectable model, most common first. */
export function orderedProviders(
  catalog: Record<string, ModelsDev.Provider>,
  options: { disabled?: Iterable<string>; enabled?: Iterable<string> } = {},
) {
  const disabled = new Set(options.disabled ?? [])
  const enabled = options.enabled ? new Set(options.enabled) : undefined
  return Object.values(catalog)
    .filter((provider) => !disabled.has(provider.id))
    .filter((provider) => (enabled ? enabled.has(provider.id) : true))
    .filter((provider) => modelChoices(provider).length > 0)
    .sort(
      (a, b) =>
        (PROVIDER_PRIORITY[a.id] ?? 99) - (PROVIDER_PRIORITY[b.id] ?? 99) || a.name.localeCompare(b.name),
    )
}

function cancel() {
  prompts.cancel("已取消配置")
}

export const SetupCommand = cmd({
  command: "setup",
  describe: "首次运行配置向导：选择服务商、填写 API Key、设置默认模型",
  builder: (yargs) =>
    yargs
      .option("provider", {
        describe: "服务商 ID 或名称（跳过服务商选择）",
        type: "string",
      })
      .option("model", {
        describe: "默认模型 ID（跳过模型选择）",
        type: "string",
      })
      .option("api-key", {
        describe: "API Key（跳过输入，适合脚本）",
        type: "string",
      })
      .option("force", {
        describe: "已有配置时仍然重新运行向导",
        type: "boolean",
        default: false,
      }),
  async handler(args) {
    prompts.intro("ymcode 初始化")

    const state = await Instance.provide({
      directory: process.cwd(),
      async fn() {
        return AppRuntime.runPromise(
          Effect.gen(function* () {
            const config = yield* (yield* Config.Service).get()
            const credentials = yield* (yield* Auth.Service).all()
            const loaded = yield* (yield* Provider.Service).list()
            return {
              config,
              credentials: Object.keys(credentials),
              providers: Object.keys(loaded),
            }
          }),
        )
      },
    })

    const catalog = await ModelsDev.get()
    const envProviders = Object.values(catalog)
      .filter((provider) => provider.env.some((name) => Boolean(process.env[name])))
      .map((provider) => provider.id)

    const slash = state.config.model?.indexOf("/") ?? -1
    const configuredProvider = slash > 0 ? state.config.model!.slice(0, slash) : undefined
    if (state.config.model && !args.force && configuredProvider && state.providers.includes(configuredProvider)) {
      prompts.log.success(`已配置默认模型 ${state.config.model}`)
      prompts.log.info(`可用凭据：${[...new Set([...state.credentials, ...envProviders])].join("、")}`)
      prompts.outro("如需重新配置，运行 ymcode setup --force")
      return
    }

    const providers = orderedProviders(catalog, {
      disabled: state.config.disabled_providers,
      enabled: state.config.enabled_providers,
    })
    if (providers.length === 0) {
      prompts.log.error("没有可用的服务商，请检查网络或模型目录缓存")
      prompts.outro("配置未完成")
      process.exitCode = 1
      return
    }

    let provider: ModelsDev.Provider | undefined
    if (args.provider) {
      const needle = args.provider.toLowerCase()
      provider =
        providers.find((item) => item.id === args.provider) ??
        providers.find((item) => item.name.toLowerCase() === needle) ??
        providers.find((item) => item.id.toLowerCase() === needle)
      if (!provider) {
        prompts.log.error(`未知服务商「${args.provider}」，可用 ymcode providers list 查看`)
        prompts.outro("配置未完成")
        process.exitCode = 1
        return
      }
    } else {
      if (!process.stdin.isTTY) {
        prompts.log.error("非交互环境请用 --provider 指定服务商")
        prompts.outro("配置未完成")
        process.exitCode = 1
        return
      }
      const choice = await prompts.autocomplete({
        message: "选择服务商",
        maxItems: 10,
        options: providers.map((item) => ({
          value: item.id,
          label: item.name,
          hint: credentialHint(item),
        })),
      })
      if (prompts.isCancel(choice)) return cancel()
      provider = providers.find((item) => item.id === (choice as string))!
    }

    const selected = provider

    const detectedEnv = selected.env.find((name) => Boolean(process.env[name]))
    const stored = state.credentials.includes(selected.id)
    let key: string | undefined = args.apiKey?.trim() || undefined
    let viaEnv = false

    if (!key && detectedEnv && process.stdin.isTTY) {
      const reuse = await prompts.confirm({
        message: `检测到 ${detectedEnv}，使用该环境变量？`,
        initialValue: true,
      })
      if (prompts.isCancel(reuse)) return cancel()
      if (reuse) viaEnv = true
    } else if (!key && detectedEnv) {
      viaEnv = true
    }

    if (!key && !viaEnv && !stored && selected.env.length > 0) {
      if (!process.stdin.isTTY) {
        prompts.log.error(`非交互环境请用 --api-key 提供 ${selected.name} 的 API Key`)
        prompts.outro("配置未完成")
        process.exitCode = 1
        return
      }
      const value = await prompts.password({
        message: `输入 ${selected.name} 的 API Key`,
        validate: (input) => (input && input.trim().length > 0 ? undefined : "不能为空"),
      })
      if (prompts.isCancel(value)) return cancel()
      key = value.trim()
    }

    const models = modelChoices(selected)
    let modelID: string
    if (args.model) {
      if (!models.some((model) => model.id === args.model)) {
        prompts.log.error(`服务商「${selected.id}」中没有模型「${args.model}」`)
        prompts.log.info(`可选：${models.map((model) => model.id).join("、")}`)
        prompts.outro("配置未完成")
        process.exitCode = 1
        return
      }
      modelID = args.model
    } else if (models.length === 1 || !process.stdin.isTTY) {
      modelID = models[0].id
    } else {
      const choice = await prompts.autocomplete({
        message: `选择 ${selected.name} 的默认模型`,
        maxItems: 10,
        options: models.map((model) => ({
          value: model.id,
          label: model.name || model.id,
          hint: `${model.id} · 上下文 ${Math.round(model.limit.context / 1000)}K`,
        })),
      })
      if (prompts.isCancel(choice)) return cancel()
      modelID = choice as string
    }

    const spinner = prompts.spinner()
    spinner.start("写入配置")
    try {
      if (key) {
        await AppRuntime.runPromise(
          Effect.gen(function* () {
            yield* (yield* Auth.Service).set(selected.id, { type: "api", key })
          }),
        )
      }
      await Instance.provide({
        directory: process.cwd(),
        async fn() {
          await AppRuntime.runPromise(
            Effect.gen(function* () {
              yield* (yield* Config.Service).updateGlobal({ model: `${selected.id}/${modelID}` })
            }),
          )
        },
      })
      // A fresh instance proves the provider now loads with the written key and
      // that the model survives config merging; it does not call the provider.
      await Instance.disposeDirectory(process.cwd())
      const verify = await Instance.provide({
        directory: process.cwd(),
        async fn() {
          return AppRuntime.runPromise(
            Effect.gen(function* () {
              const config = yield* (yield* Config.Service).get()
              const loaded = yield* (yield* Provider.Service).list()
              const entry = loaded[selected.id as keyof typeof loaded]
              return {
                loaded: Boolean(entry),
                model: Boolean(entry?.models[modelID]),
                effective: config.model,
              }
            }),
          )
        },
      })
      spinner.stop(verify.loaded && verify.model ? "配置已写入并验证" : "配置已写入")
      const target = `${selected.id}/${modelID}`
      if (!verify.loaded) {
        prompts.log.warn(`provider「${selected.id}」未加载，运行 ymcode doctor 查看原因`)
      } else if (!verify.model) {
        prompts.log.warn(`模型「${modelID}」未出现在 provider 中，运行 ymcode doctor 复核`)
      } else if (verify.effective !== target) {
        prompts.log.warn(`当前生效模型是 ${verify.effective}，可能被项目配置覆盖`)
      }
    } catch (error) {
      spinner.stop("写入失败", 1)
      prompts.log.error(String(error))
      prompts.outro("配置未完成")
      process.exitCode = 1
      return
    }

    prompts.log.success(`服务商：${selected.name} (${selected.id})`)
    prompts.log.success(`默认模型：${selected.id}/${modelID}`)
    if (key) prompts.log.info(`API Key 已保存到 ${path.join(Global.Path.data, "auth.json")}`)
    else if (viaEnv) prompts.log.info(`使用环境变量 ${detectedEnv}`)
    else if (stored) prompts.log.info(`使用已保存的 ${selected.id} 凭据`)
    prompts.outro("运行 ymcode 开始使用；如遇问题运行 ymcode doctor")
  },
})
