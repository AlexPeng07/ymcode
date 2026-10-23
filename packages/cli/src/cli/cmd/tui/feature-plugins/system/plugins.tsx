import { Keybind } from "@/util"
import type { TuiPlugin, TuiPluginApi, TuiPluginModule, TuiPluginStatus } from "@ymcode/plugin/tui"
import { useKeyboard, useTerminalDimensions } from "@opentui/solid"
import { fileURLToPath } from "url"
import { DialogSelect, type DialogSelectOption } from "@tui/ui/dialog-select"
import { Show, createEffect, createMemo, createSignal } from "solid-js"
import { useLanguage } from "@tui/context/language"

const id = "internal:plugin-manager"
const key = Keybind.parse("space").at(0)
const add = Keybind.parse("shift+i").at(0)
const tab = Keybind.parse("tab").at(0)

type Translate = (key: string, params?: Record<string, string | number | boolean>) => string

function state(api: TuiPluginApi, item: TuiPluginStatus, t: Translate) {
  if (!item.enabled) {
    return <span style={{ fg: api.theme.current.textMuted }}>{t("tui.plugins.state.disabled")}</span>
  }

  return (
    <span style={{ fg: item.active ? api.theme.current.success : api.theme.current.error }}>
      {item.active ? t("tui.plugins.state.active") : t("tui.plugins.state.inactive")}
    </span>
  )
}

function source(spec: string) {
  if (!spec.startsWith("file://")) return
  return fileURLToPath(spec)
}

function meta(item: TuiPluginStatus, width: number, t: Translate) {
  if (item.source === "internal") {
    if (width >= 120) return t("tui.plugins.meta.builtin_plugin")
    return t("tui.plugins.meta.builtin")
  }
  const next = source(item.spec)
  if (next) return next
  return item.spec
}

function builtinKey(item: TuiPluginStatus) {
  if (item.source !== "internal") return undefined
  return item.id.startsWith("internal:") ? item.id.slice("internal:".length) : undefined
}

function title(item: TuiPluginStatus, t: Translate) {
  const key = builtinKey(item)
  if (!key) return item.id
  return t(`tui.plugins.builtin.${key}.name`) || item.id
}

function description(item: TuiPluginStatus, width: number, t: Translate) {
  const key = builtinKey(item)
  if (key) {
    const text = t(`tui.plugins.builtin.${key}.description`)
    if (text) return text
  }
  return meta(item, width, t)
}

function Install(props: { api: TuiPluginApi }) {
  const [global, setGlobal] = createSignal(false)
  const [busy, setBusy] = createSignal(false)
  const t = useLanguage().t

  useKeyboard((evt) => {
    if (evt.name !== "tab") return
    evt.preventDefault()
    evt.stopPropagation()
    if (busy()) return
    setGlobal((x) => !x)
  })

  return (
    <props.api.ui.DialogPrompt
      title={t("tui.plugins.install.title")}
      placeholder={t("tui.plugins.install.placeholder")}
      busy={busy()}
      busyText={t("tui.plugins.install.busy")}
      description={() => (
        <box flexDirection="row" gap={1}>
          <text fg={props.api.theme.current.textMuted}>{t("tui.plugins.install.scope")}</text>
          <text fg={busy() ? props.api.theme.current.textMuted : props.api.theme.current.text}>
            {global() ? t("tui.plugins.scope.global") : t("tui.plugins.scope.local")}
          </text>
          <Show when={!busy()}>
            <text fg={props.api.theme.current.textMuted}>
              {t("tui.plugins.install.toggle", { keybind: Keybind.toString(tab) })}
            </text>
          </Show>
        </box>
      )}
      onConfirm={(raw) => {
        if (busy()) return
        const mod = raw.trim()
        if (!mod) {
          props.api.ui.toast({
            variant: "error",
            message: t("tui.plugins.error.name_required"),
          })
          return
        }

        setBusy(true)
        void props.api.plugins
          .install(mod, { global: global() })
          .then((out) => {
            if (!out.ok) {
              props.api.ui.toast({
                variant: "error",
                message: out.message,
              })
              if (out.missing) {
                props.api.ui.toast({
                  variant: "info",
                  message: t("tui.plugins.error.registry"),
                })
              }
              show(props.api)
              return
            }

            props.api.ui.toast({
              variant: "success",
              message: t("tui.plugins.install.success", {
                mod,
                scope: global() ? t("tui.plugins.scope.global") : t("tui.plugins.scope.local"),
                dir: out.dir,
              }),
            })
            if (!out.tui) {
              props.api.ui.toast({
                variant: "info",
                message: t("tui.plugins.error.no_tui"),
              })
              show(props.api)
              return
            }

            return props.api.plugins.add(mod).then((ok) => {
              if (!ok) {
                props.api.ui.toast({
                  variant: "warning",
                  message: t("tui.plugins.error.load_failed"),
                })
                show(props.api)
                return
              }

              props.api.ui.toast({
                variant: "success",
                message: t("tui.plugins.loaded", { mod }),
              })
              show(props.api)
            })
          })
          .finally(() => {
            setBusy(false)
          })
      }}
      onCancel={() => {
        show(props.api)
      }}
    />
  )
}

function row(api: TuiPluginApi, item: TuiPluginStatus, width: number, t: Translate): DialogSelectOption<string> {
  return {
    title: title(item, t),
    value: item.id,
    category: item.source === "internal" ? t("tui.plugins.category.internal") : t("tui.plugins.category.external"),
    description: description(item, width, t),
    footer: state(api, item, t),
    disabled: item.id === id,
  }
}

function showInstall(api: TuiPluginApi) {
  api.ui.dialog.replace(() => <Install api={api} />)
}

function View(props: { api: TuiPluginApi }) {
  const size = useTerminalDimensions()
  const t = useLanguage().t
  const [list, setList] = createSignal(props.api.plugins.list())
  const [cur, setCur] = createSignal<string | undefined>()
  const [lock, setLock] = createSignal(false)

  createEffect(() => {
    const width = size().width
    if (width >= 128) {
      props.api.ui.dialog.setSize("xlarge")
      return
    }
    if (width >= 96) {
      props.api.ui.dialog.setSize("large")
      return
    }
    props.api.ui.dialog.setSize("medium")
  })

  const rows = createMemo(() =>
    [...list()]
      .sort((a, b) => {
        const x = a.source === "internal" ? 1 : 0
        const y = b.source === "internal" ? 1 : 0
        if (x !== y) return x - y
        return a.id.localeCompare(b.id)
      })
      .map((item) => row(props.api, item, size().width, t)),
  )

  const flip = (x: string) => {
    if (lock()) return
    const item = list().find((entry) => entry.id === x)
    if (!item) return
    setLock(true)
    const task = item.active ? props.api.plugins.deactivate(x) : props.api.plugins.activate(x)
    void task
      .then((ok) => {
        if (!ok) {
          props.api.ui.toast({
            variant: "error",
            message: t("tui.plugins.error.update_failed", { id: item.id }),
          })
        }
        setList(props.api.plugins.list())
      })
      .finally(() => {
        setLock(false)
      })
  }

  return (
    <DialogSelect
      title={t("tui.plugins.title")}
      options={rows()}
      current={cur()}
      onMove={(item) => setCur(item.value)}
      keybind={[
        {
          title: t("tui.plugins.keybind.toggle"),
          keybind: key,
          disabled: lock(),
          onTrigger: (item) => {
            setCur(item.value)
            flip(item.value)
          },
        },
        {
          title: t("tui.plugins.keybind.install"),
          keybind: add,
          disabled: lock(),
          onTrigger: () => {
            showInstall(props.api)
          },
        },
      ]}
      onSelect={(item) => {
        setCur(item.value)
        flip(item.value)
      }}
    />
  )
}

function show(api: TuiPluginApi) {
  api.ui.dialog.replace(() => <View api={api} />)
}

const tui: TuiPlugin = async (api) => {
  api.command.register(() => {
    const t = useLanguage().t
    return [
      {
        title: t("tui.command.plugins.list.title"),
        value: "plugins.list",
        keybind: "plugin_manager",
        category: "system",
        onSelect() {
          show(api)
        },
      },
      {
        title: t("tui.command.plugins.install.title"),
        value: "plugins.install",
        category: "system",
        onSelect() {
          showInstall(api)
        },
      },
    ]
  })
}

const plugin: TuiPluginModule & { id: string } = {
  id,
  tui,
}

export default plugin
