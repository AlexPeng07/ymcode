/** @jsxImportSource @opentui/solid */
import { beforeAll, expect, test } from "bun:test"
import path from "path"
import { testRender } from "@opentui/solid"
import { Global } from "../../../src/global"
import { DialogMimoLogin } from "../../../src/cli/cmd/tui/component/dialog-mimo-login"
import { ArgsProvider } from "../../../src/cli/cmd/tui/context/args"
import { ExitProvider } from "../../../src/cli/cmd/tui/context/exit"
import { ProjectProvider } from "../../../src/cli/cmd/tui/context/project"
import { SDKProvider } from "../../../src/cli/cmd/tui/context/sdk"
import { SyncProvider } from "../../../src/cli/cmd/tui/context/sync"
import { KVProvider } from "../../../src/cli/cmd/tui/context/kv"
import { TuiConfigProvider } from "../../../src/cli/cmd/tui/context/tui-config"
import { ThemeProvider } from "../../../src/cli/cmd/tui/context/theme"
import { LanguageProvider } from "../../../src/cli/cmd/tui/context/language"
import { LocalProvider } from "../../../src/cli/cmd/tui/context/local"
import { KeybindProvider } from "../../../src/cli/cmd/tui/context/keybind"
import { ToastProvider } from "../../../src/cli/cmd/tui/ui/toast"
import { DialogProvider } from "../../../src/cli/cmd/tui/ui/dialog"

beforeAll(async () => {
  const file = Bun.file(path.join(Global.Path.state, "kv.json"))
  if (!(await file.exists())) await Bun.write(file, "{}")
})

const PROVIDERS = [
  {
    id: "xiaomi",
    name: "Xiaomi",
    source: "config",
    env: [],
    options: {},
    models: {
      "mimo-v2.6-pro": {
        id: "mimo-v2.6-pro",
        providerID: "xiaomi",
        name: "MiMo v2.6 Pro",
        release_date: "2025-01-01",
        attachment: false,
        reasoning: false,
        temperature: false,
        tool_call: true,
        limit: { context: 100000, output: 10000 },
        cost: { input: 0, output: 0 },
        options: {},
      },
    },
  },
]

function fetcher(input: Request) {
  const url = new URL(input.url)
  const ok = (body: unknown) => Response.json(body)
  if (url.pathname === "/path") return ok({ home: "/home", state: "/state", config: "/config", worktree: "", directory: "/tmp/login" })
  if (url.pathname === "/project/current") return ok({ id: "p" })
  if (url.pathname === "/config/providers") return ok({ providers: PROVIDERS, default: {} })
  if (url.pathname === "/provider") return ok({ all: PROVIDERS, default: {}, connected: [], authenticated: [] })
  if (url.pathname === "/provider/auth") return ok({})
  if (url.pathname === "/experimental/console") {
    return ok({ consoleManagedProviders: [], switchableOrgCount: 0 })
  }
  if (["/session", "/agent", "/command", "/vcs", "/experimental/workspace", "/experimental/workspace/status"].includes(url.pathname)) {
    return ok([])
  }
  return ok({})
}

async function waitFor(predicate: () => boolean | Promise<boolean>) {
  const deadline = Date.now() + 5000
  while (!(await predicate())) {
    if (Date.now() >= deadline) throw new Error("login dialog did not reach the expected state")
    await Bun.sleep(10)
  }
}

test("keeps the Xiaomi entry without the removed OAuth flow", async () => {
  const app = await testRender(
    () => (
      <SDKProvider url="http://test" directory="/tmp/login" fetch={fetcher as unknown as typeof fetch} events={{ subscribe: async () => () => {} }}>
        <ProjectProvider>
          <ArgsProvider>
            <ExitProvider>
              <SyncProvider>
                <KVProvider>
                  <TuiConfigProvider config={{ keybinds: { app_exit: "ctrl+c" } }}>
                    <ThemeProvider mode="dark">
                      <LanguageProvider>
                        <ToastProvider>
                          <LocalProvider>
                            <DialogProvider>
                              <KeybindProvider>
                                <DialogMimoLogin />
                              </KeybindProvider>
                            </DialogProvider>
                          </LocalProvider>
                        </ToastProvider>
                      </LanguageProvider>
                    </ThemeProvider>
                  </TuiConfigProvider>
                </KVProvider>
              </SyncProvider>
            </ExitProvider>
          </ArgsProvider>
        </ProjectProvider>
      </SDKProvider>
    ),
    { width: 100, height: 30 },
  )

  try {
    await waitFor(async () => {
      await app.renderOnce()
      return app.captureCharFrame().includes("Xiaomi")
    })
    const frame = app.captureCharFrame()
    expect(frame).toContain("Xiaomi")
    expect(frame).not.toContain("MiMo Login")
    expect(frame).not.toContain("Paste Code")
    expect(frame).not.toContain("Waiting for browser authorization")
  } finally {
    app.renderer.destroy()
  }
})
