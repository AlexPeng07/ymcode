import { TextAttributes } from "@opentui/core"
import { fileURLToPath } from "bun"
import { useTheme } from "../context/theme"
import { useLanguage } from "../context/language"
import { useDialog } from "@tui/ui/dialog"
import { useSync } from "@tui/context/sync"
import { useLocal } from "@tui/context/local"
import { useRoute } from "@tui/context/route"
import * as Model from "@tui/util/model"
import { Locale, Token } from "@/util"
import type { AssistantMessage } from "@ymcode/sdk/v2"
import { For, Match, Switch, Show, createMemo } from "solid-js"

export type DialogStatusProps = {}

export function DialogStatus() {
  const sync = useSync()
  const { theme } = useTheme()
  const dialog = useDialog()
  const local = useLocal()
  const route = useRoute()
  const { t } = useLanguage()

  const enabledFormatters = createMemo(() => sync.data.formatter.filter((f) => f.enabled))

  const context = createMemo(() => {
    const sessionID = route.data.type === "session" ? route.data.sessionID : undefined
    const last = sessionID
      ? (sync.data.message[sessionID]?.["main"] ?? []).findLast(
          (item): item is AssistantMessage => item.role === "assistant" && item.tokens.output > 0,
        )
      : undefined
    // Describe the model the tokens were actually spent on, so a mid-session model
    // switch cannot divide the old model's usage by the new model's trigger.
    const target = last ? { providerID: last.providerID, modelID: last.modelID } : local.model.current()
    if (!target) return
    const win = Model.contextWindow(sync.data.config, Model.get(sync.data.provider, target.providerID, target.modelID))
    if (!win) return
    const tokens = last
      ? last.tokens.input + last.tokens.output + last.tokens.reasoning + last.tokens.cache.read + last.tokens.cache.write
      : undefined
    return {
      model: `${target.providerID}/${target.modelID}`,
      window: Token.format(win.hard),
      budget: win.source === "config" ? Token.format(win.effective) : undefined,
      reserved: Token.format(win.effective - win.usable),
      compact: Token.format(win.usable),
      used: tokens ? `${Locale.number(tokens)} (${Math.round((tokens / win.usable) * 100)}%)` : undefined,
    }
  })

  const plugins = createMemo(() => {
    const list = sync.data.config.plugin ?? []
    const result = list.map((item) => {
      const value = typeof item === "string" ? item : item[0]
      if (value.startsWith("file://")) {
        const path = fileURLToPath(value)
        const parts = path.split("/")
        const filename = parts.pop() || path
        if (!filename.includes(".")) return { name: filename }
        const basename = filename.split(".")[0]
        if (basename === "index") {
          const dirname = parts.pop()
          const name = dirname || basename
          return { name }
        }
        return { name: basename }
      }
      const index = value.lastIndexOf("@")
      if (index <= 0) return { name: value, version: "latest" }
      const name = value.substring(0, index)
      const version = value.substring(index + 1)
      return { name, version }
    })
    return result.toSorted((a, b) => a.name.localeCompare(b.name))
  })

  return (
    <box paddingLeft={2} paddingRight={2} gap={1} paddingBottom={1}>
      <box flexDirection="row" justifyContent="space-between">
        <text fg={theme.text} attributes={TextAttributes.BOLD}>
          {t("tui.status.title")}
        </text>
        <text fg={theme.textMuted} onMouseUp={() => dialog.clear()}>
          esc
        </text>
      </box>
      <Show when={context()}>
        {(item) => (
          <box>
            <text fg={theme.text}>{t("tui.status.context")}</text>
            <text fg={theme.textMuted} wrapMode="word">
              {item().model}
            </text>
            <text fg={theme.textMuted}>
              {item().budget
                ? t("tui.status.context.line_budget", {
                    window: item().window,
                    budget: item().budget ?? "",
                    reserved: item().reserved,
                    compact: item().compact,
                  })
                : t("tui.status.context.line_model", {
                    window: item().window,
                    reserved: item().reserved,
                    compact: item().compact,
                  })}
            </text>
            <Show when={item().used}>
              {(used) => <text fg={theme.textMuted}>{t("tui.status.used", { value: used() })}</text>}
            </Show>
          </box>
        )}
      </Show>
      <Show
        when={Object.keys(sync.data.mcp).length > 0}
        fallback={<text fg={theme.text}>{t("tui.status.no_mcp")}</text>}
      >
        <box>
          <text fg={theme.text}>{t("tui.status.mcp_count", { value: Object.keys(sync.data.mcp).length })}</text>
          <For each={Object.entries(sync.data.mcp)}>
            {([key, item]) => (
              <box flexDirection="row" gap={1}>
                <text
                  flexShrink={0}
                  style={{
                    fg: (
                      {
                        connected: theme.success,
                        failed: theme.error,
                        pending: theme.warning,
                        disabled: theme.textMuted,
                        needs_auth: theme.warning,
                        needs_client_registration: theme.error,
                      } as Record<string, typeof theme.success>
                    )[item.status],
                  }}
                >
                  •
                </text>
                <text fg={theme.text} wrapMode="word">
                  <b>{key}</b>{" "}
                  <span style={{ fg: theme.textMuted }}>
                    <Switch fallback={item.status}>
                      <Match when={item.status === "connected"}>{t("tui.status.connected")}</Match>
                      <Match when={item.status === "failed" && item}>{(val) => val().error}</Match>
                      <Match when={(item.status as string) === "pending"}>{t("tui.status.pending_approval")}</Match>
                      <Match when={item.status === "disabled"}>{t("tui.status.disabled_config")}</Match>
                      <Match when={(item.status as string) === "needs_auth"}>
                        {t("tui.status.needs_auth", { value: key })}
                      </Match>
                      <Match when={(item.status as string) === "needs_client_registration" && item}>
                        {(val) => (val() as { error: string }).error}
                      </Match>
                    </Switch>
                  </span>
                </text>
              </box>
            )}
          </For>
        </box>
      </Show>
      {sync.data.lsp.length > 0 && (
        <box>
          <text fg={theme.text}>{t("tui.status.lsp_count", { value: sync.data.lsp.length })}</text>
          <For each={sync.data.lsp}>
            {(item) => (
              <box flexDirection="row" gap={1}>
                <text
                  flexShrink={0}
                  style={{
                    fg: {
                      connected: theme.success,
                      error: theme.error,
                    }[item.status],
                  }}
                >
                  •
                </text>
                <text fg={theme.text} wrapMode="word">
                  <b>{item.id}</b> <span style={{ fg: theme.textMuted }}>{item.root}</span>
                </text>
              </box>
            )}
          </For>
        </box>
      )}
      <Show
        when={enabledFormatters().length > 0}
        fallback={<text fg={theme.text}>{t("tui.status.no_formatters")}</text>}
      >
        <box>
          <text fg={theme.text}>{t("tui.status.formatter_count", { value: enabledFormatters().length })}</text>
          <For each={enabledFormatters()}>
            {(item) => (
              <box flexDirection="row" gap={1}>
                <text
                  flexShrink={0}
                  style={{
                    fg: theme.success,
                  }}
                >
                  •
                </text>
                <text wrapMode="word" fg={theme.text}>
                  <b>{item.name}</b>
                </text>
              </box>
            )}
          </For>
        </box>
      </Show>
      <Show when={plugins().length > 0} fallback={<text fg={theme.text}>{t("tui.status.no_plugins")}</text>}>
        <box>
          <text fg={theme.text}>{t("tui.status.plugin_count", { value: plugins().length })}</text>
          <For each={plugins()}>
            {(item) => (
              <box flexDirection="row" gap={1}>
                <text
                  flexShrink={0}
                  style={{
                    fg: theme.success,
                  }}
                >
                  •
                </text>
                <text wrapMode="word" fg={theme.text}>
                  <b>{item.name}</b>
                  {item.version && <span style={{ fg: theme.textMuted }}> @{item.version}</span>}
                </text>
              </box>
            )}
          </For>
        </box>
      </Show>
    </box>
  )
}
