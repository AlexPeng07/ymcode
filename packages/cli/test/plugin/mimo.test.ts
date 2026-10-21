import { describe, expect, test } from "bun:test"
import { MimoPlugin } from "../../src/plugin/mimo"
import type { PluginInput } from "@ymcode/plugin"

const fakeInput = {
  client: {},
  project: {},
  worktree: "",
  directory: "",
  experimental_workspace: { register() {} },
  serverUrl: new URL("http://localhost:4096"),
  $: undefined,
} as unknown as PluginInput

describe("MimoPlugin", () => {
  describe("config hook", () => {
    test("registers xiaomi provider placeholder", async () => {
      const hooks = await MimoPlugin(fakeInput)
      const cfg: any = {}
      await hooks.config!(cfg)
      // The plugin only registers the provider so it shows up before authentication.
      // name/api are left to the models.dev database (name: "Xiaomi").
      expect(cfg.provider.xiaomi).toBeDefined()
      expect(cfg.provider.xiaomi.name).toBeUndefined()
      expect(cfg.provider.xiaomi.api).toBeUndefined()
    })

    test("does not overwrite existing config", async () => {
      const hooks = await MimoPlugin(fakeInput)
      const cfg: any = { provider: { xiaomi: { name: "Custom", api: "https://custom.api" } } }
      await hooks.config!(cfg)
      expect(cfg.provider.xiaomi.name).toBe("Custom")
      expect(cfg.provider.xiaomi.api).toBe("https://custom.api")
    })
  })

  describe("chat.headers hook", () => {
    test("adds X-Mimo-Source header for mimo provider", async () => {
      const hooks = await MimoPlugin(fakeInput)
      const output = { headers: {} as Record<string, string> }
      await hooks["chat.headers"]!({ model: { providerID: "xiaomi" } } as any, output as any)
      expect(output.headers["X-Mimo-Source"]).toBe("ymcode-cli")
    })

    test("does not add header for other providers", async () => {
      const hooks = await MimoPlugin(fakeInput)
      const providers = ["anthropic", "openai", "google"]
      for (const providerID of providers) {
        const output = { headers: {} as Record<string, string> }
        await hooks["chat.headers"]!({ model: { providerID } } as any, output as any)
        expect(output.headers["X-Mimo-Source"]).toBeUndefined()
      }
    })
  })
})
