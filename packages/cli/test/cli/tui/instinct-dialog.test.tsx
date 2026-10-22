/** @jsxImportSource @opentui/solid */
import { beforeAll, expect, test } from "bun:test"
import path from "path"
import { testRender } from "@opentui/solid"
import { Global } from "../../../src/global"
import { DialogInstinct } from "../../../src/cli/cmd/tui/component/dialog-instinct"
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

const ITEMS = [
  {
    id: "ins_aaaaaaaa",
    description: "Prefer explicit errors",
    status: "active",
    confidence: 0.92,
    evidence: [{ session: "ses_test", date: "2026-10-23" }],
    source: "correction",
    created_at: "2026-10-01T00:00:00.000Z",
    updated_at: "2026-10-23T00:00:00.000Z",
    last_seen_at: "2026-10-23T00:00:00.000Z",
    contradictions: 0,
  },
  {
    id: "ins_bbbbbbbb",
    description: "Batch small writes",
    status: "candidate",
    confidence: 0.55,
    evidence: [{ session: "ses_test", date: "2026-10-22" }],
    source: "repetition",
    created_at: "2026-10-02T00:00:00.000Z",
    updated_at: "2026-10-22T00:00:00.000Z",
    last_seen_at: "2026-10-22T00:00:00.000Z",
    contradictions: 1,
  },
]

function fetcher(input: Request) {
  const url = new URL(input.url)
  const ok = (body: unknown) => Response.json(body)
  if (url.pathname === "/instinct") return ok(ITEMS)
  if (url.pathname === "/path") return ok({ home: "/home", state: "/state", config: "/config", worktree: "", directory: "/tmp/instinct" })
  if (url.pathname === "/project/current") return ok({ id: "p" })
  if (url.pathname === "/config/providers") return ok({ providers: [], default: {} })
  if (url.pathname === "/provider") return ok({ all: [], default: {}, connected: [], authenticated: [] })
  if (url.pathname === "/provider/auth") return ok({})
  if (url.pathname === "/experimental/console") return ok({ consoleManagedProviders: [], switchableOrgCount: 0 })
  return ok([])
}

async function waitFor(predicate: () => boolean | Promise<boolean>) {
  const deadline = Date.now() + 5000
  while (!(await predicate())) {
    if (Date.now() >= deadline) throw new Error("instinct dialog did not reach the expected state")
    await Bun.sleep(10)
  }
}

test("renders active and candidate instinct rules", async () => {
  const app = await testRender(
    () => (
      <SDKProvider
        url="http://test"
        directory="/tmp/instinct"
        fetch={fetcher as unknown as typeof fetch}
        events={{ subscribe: async () => () => {} }}
      >
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
                                <DialogInstinct />
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
      return app.captureCharFrame().includes("Prefer explicit errors")
    })
    const frame = app.captureCharFrame()
    expect(frame).toContain("Prefer explicit errors")
    expect(frame).toContain("Batch small writes")
    expect(frame).toContain("Active")
    expect(frame).toContain("Candidate")
    expect(frame).toContain("Instincts · Project")
    expect(frame).toContain("ins_aaaaaaaa")
  } finally {
    app.renderer.destroy()
  }
})
