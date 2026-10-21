import type { Hooks, PluginInput } from "@ymcode/plugin"

export async function MimoPlugin(_input: PluginInput): Promise<Hooks> {
  return {
    config: async (input) => {
      input.provider ??= {}
      // Register xiaomi as a config provider so it shows up before authentication.
      // name/api are intentionally left to the models.dev database (name: "Xiaomi",
      // api: https://api.xiaomimimo.com/v1) — hardcoding "MiMo" here collided with
      // the free "mimo" provider's display name and confused users.
      input.provider.xiaomi ??= {}
      // Both "opencode" and "opencode-go" stay enabled. The opencode custom
      // loader strips the free/public tier (and hides paid models until the
      // user authenticates). "opencode-go" has no free models and no custom
      // loader, so it only loads once a subscription key/auth is present.
    },
    "chat.headers": async (input, output) => {
      if (input.model.providerID !== "xiaomi") return
      output.headers["X-Mimo-Source"] = "ymcode-cli"
    },
  }
}

export async function AnthropicProxyPlugin(_input: PluginInput): Promise<Hooks> {
  return {
    auth: {
      provider: "anthropic",
      async loader(_getAuth, provider) {
        if (!provider?.options?.baseURL) return {}
        return {
          async fetch(url: any, init: any) {
            if (init?.headers && typeof init.headers === "object" && !Array.isArray(init.headers)) {
              delete init.headers["anthropic-beta"]
            }
            const res = await fetch(url, init)
            if (!res.body || !res.headers.get("content-type")?.includes("text/event-stream")) return res
            const reader = res.body.getReader()
            const decoder = new TextDecoder()
            let done = false
            let buffer = ""
            const body = new ReadableStream<Uint8Array>({
              async pull(ctrl) {
                if (done) { ctrl.close(); return }
                const chunk = await reader.read()
                if (chunk.done) { ctrl.close(); return }
                ctrl.enqueue(chunk.value)
                buffer += decoder.decode(chunk.value, { stream: true })
                if (buffer.includes("\nevent: message_stop\n") || buffer.includes("\ndata: {\"type\":\"message_stop\"}")) {
                  done = true
                  void reader.cancel()
                  ctrl.close()
                }
                if (buffer.length > 512) buffer = buffer.slice(-256)
              },
              cancel() { reader.cancel() },
            })
            return new Response(body, { headers: res.headers, status: res.status })
          },
        }
      },
      methods: [],
    },
  }
}
