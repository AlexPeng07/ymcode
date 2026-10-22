import type { Argv, InferredOptionTypes } from "yargs"
import { Config } from "../config"
import { AppRuntime } from "@/effect/app-runtime"

const options = {
  port: {
    type: "number" as const,
    describe: "监听端口（0 表示由系统分配临时端口；需要固定 URL 时请显式指定端口）",
    default: 0,
  },
  hostname: {
    type: "string" as const,
    describe: "监听主机名",
    default: "127.0.0.1",
  },
  mdns: {
    type: "boolean" as const,
    describe: "启用 mDNS 服务发现（默认将主机名设为 0.0.0.0）",
    default: false,
  },
  "mdns-domain": {
    type: "string" as const,
    describe: "mDNS 服务的自定义域名（默认：ymcode.local）",
    default: "ymcode.local",
  },
  cors: {
    type: "string" as const,
    array: true,
    describe: "额外允许的 CORS 域名",
    default: [] as string[],
  },
  "no-auth": {
    type: "boolean" as const,
    describe: "允许在非回环地址上无认证启动（危险）",
    default: false,
  },
}

export type NetworkOptions = InferredOptionTypes<typeof options>

export function withNetworkOptions<T>(yargs: Argv<T>) {
  return yargs.options(options)
}
export async function resolveNetworkOptions(args: NetworkOptions) {
  const config = await AppRuntime.runPromise(Config.Service.use((cfg) => cfg.getGlobal()))
  return resolveNetworkOptionsNoConfig(args, config)
}

export function resolveNetworkOptionsNoConfig(args: NetworkOptions, config?: Config.Info) {
  const portExplicitlySet = process.argv.includes("--port")
  const hostnameExplicitlySet = process.argv.includes("--hostname")
  const mdnsExplicitlySet = process.argv.includes("--mdns")
  const mdnsDomainExplicitlySet = process.argv.includes("--mdns-domain")
  const mdns = mdnsExplicitlySet ? args.mdns : (config?.server?.mdns ?? args.mdns)
  const mdnsDomain = mdnsDomainExplicitlySet ? args["mdns-domain"] : (config?.server?.mdnsDomain ?? args["mdns-domain"])
  const port = portExplicitlySet ? args.port : (config?.server?.port ?? args.port)
  const hostname = hostnameExplicitlySet
    ? args.hostname
    : mdns && !config?.server?.hostname
      ? "0.0.0.0"
      : (config?.server?.hostname ?? args.hostname)
  const configCors = config?.server?.cors ?? []
  const argsCors = Array.isArray(args.cors) ? args.cors : args.cors ? [args.cors] : []
  const cors = [...configCors, ...argsCors]
  const noAuth = args["no-auth"]

  return { hostname, port, mdns, mdnsDomain, cors, noAuth }
}
