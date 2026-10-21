import { NamedError } from "@ymcode/shared/util/error"
import { errorFormat } from "@/util/error"

interface ErrorLike {
  name?: string
  _tag?: string
  message?: string
  data?: Record<string, any>
}

function isTaggedError(error: unknown, tag: string): boolean {
  return (
    typeof error === "object" && error !== null && "_tag" in error && (error as Record<string, unknown>)._tag === tag
  )
}

export function FormatError(input: unknown) {
  // MCPFailed: { name: string }
  if (NamedError.hasName(input, "MCPFailed")) {
    return `MCP 服务器 "${(input as ErrorLike).data?.name}" 启动失败。注意，opencode 尚不支持 MCP 认证。`
  }

  // AccountServiceError, AccountTransportError: TaggedErrorClass
  if (isTaggedError(input, "AccountServiceError") || isTaggedError(input, "AccountTransportError")) {
    return (input as ErrorLike).message ?? ""
  }

  // ProviderModelNotFoundError: { providerID: string, modelID: string, suggestions?: string[] }
  if (NamedError.hasName(input, "ProviderModelNotFoundError")) {
    const data = (input as ErrorLike).data
    const suggestions: string[] = Array.isArray(data?.suggestions) ? data.suggestions : []
    return [
      `未找到模型: ${data?.providerID}/${data?.modelID}`,
      ...(suggestions.length ? ["您是不是想找: " + suggestions.join(", ")] : []),
      `可运行: \`ymcode models\` 列出可用模型`,
      `或检查配置（ymcode.json）中的 provider/model 名称`,
    ].join("\n")
  }

  // ProviderInitError: { providerID: string }
  if (NamedError.hasName(input, "ProviderInitError")) {
    return `提供方 "${(input as ErrorLike).data?.providerID}" 初始化失败。请检查凭据和配置。`
  }

  // ConfigJsonError: { path: string, message?: string }
  if (NamedError.hasName(input, "ConfigJsonError")) {
    const data = (input as ErrorLike).data
    return `配置文件 ${data?.path} 不是有效的 JSON(C)` + (data?.message ? `: ${data.message}` : "")
  }

  // ConfigDirectoryTypoError: { dir: string, path: string, suggestion: string }
  if (NamedError.hasName(input, "ConfigDirectoryTypoError")) {
    const data = (input as ErrorLike).data
    return `目录 "${data?.dir}"（位于 ${data?.path}）无效。请将该目录重命名为 "${data?.suggestion}" 或删除它。这是一个常见的拼写错误。`
  }

  // ConfigFrontmatterError: { message: string }
  if (NamedError.hasName(input, "ConfigFrontmatterError")) {
    return (input as ErrorLike).data?.message ?? ""
  }

  // ConfigInvalidError: { path?: string, message?: string, issues?: Array<{ message: string, path: string[] }> }
  if (NamedError.hasName(input, "ConfigInvalidError")) {
    const data = (input as ErrorLike).data
    const path = data?.path
    const message = data?.message
    const issues: Array<{ message: string; path: string[] }> = Array.isArray(data?.issues) ? data.issues : []
    return [
      `配置无效${path && path !== "config" ? `（位于 ${path}）` : ""}` + (message ? `: ${message}` : ""),
      ...issues.map((issue) => "↳ " + issue.message + " " + issue.path.join(".")),
    ].join("\n")
  }

  // UICancelledError: void (no data)
  if (NamedError.hasName(input, "UICancelledError")) {
    return ""
  }
}

export function FormatUnknownError(input: unknown): string {
  return errorFormat(input)
}
