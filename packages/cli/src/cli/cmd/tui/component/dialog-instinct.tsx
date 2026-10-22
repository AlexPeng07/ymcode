import { createMemo, createResource, createSignal, onMount, Show } from "solid-js"
import { TextAttributes } from "@opentui/core"
import { useKeyboard } from "@opentui/solid"
import { useDialog } from "@tui/ui/dialog"
import { DialogConfirm } from "@tui/ui/dialog-confirm"
import { DialogSelect, type DialogSelectOption } from "@tui/ui/dialog-select"
import { useSDK } from "@tui/context/sdk"
import { useToast } from "@tui/ui/toast"
import { useTheme } from "@tui/context/theme"
import { useLanguage } from "@tui/context/language"
import { Keybind } from "@/util"
import type { InstinctGetResponse, InstinctListResponse } from "@ymcode/sdk/v2"

type Scope = "project" | "global"
type Item = InstinctListResponse[number]

const PROMOTE = Keybind.parse("alt+p")[0]
const FORCE_PROMOTE = Keybind.parse("alt+f")[0]
const DEMOTE = Keybind.parse("alt+d")[0]
const DELETE = Keybind.parse("alt+x")[0]
const REVIEW = Keybind.parse("alt+r")[0]
const SCOPE = Keybind.parse("tab")[0]

function describeError(error: unknown) {
  if (typeof error === "object" && error && "message" in error && typeof error.message === "string") return error.message
  if (typeof error === "object" && error && "data" in error) return JSON.stringify(error.data)
  return JSON.stringify(error)
}

export function DialogInstinct(props: { initialScope?: Scope }) {
  const dialog = useDialog()
  const sdk = useSDK()
  const toast = useToast()
  const { theme } = useTheme()
  const t = useLanguage().t
  const [scope, setScope] = createSignal<Scope>(props.initialScope ?? "project")
  const [items, { refetch }] = createResource(scope, async (value) => {
    const result = await sdk.client.instinct.list({ scope: value })
    if (result.error) throw new Error(describeError(result.error))
    return result.data ?? []
  })
  onMount(() => dialog.setSize("large"))

  const statusLabel = (status: Item["status"]) => t(`tui.instinct.status.${status}`)
  const statusRank = { active: 0, candidate: 1, retired: 2 } as const

  const options = createMemo<DialogSelectOption<string>[]>(() =>
    [...(items() ?? [])]
      .sort((a, b) => statusRank[a.status] - statusRank[b.status] || b.confidence - a.confidence)
      .map((item) => ({
        title: item.description,
        value: item.id,
        category: statusLabel(item.status),
        description: `${item.confidence.toFixed(2)} · ${item.evidence.length} · ${item.source} · ${item.updated_at.slice(0, 10)}`,
        footer: item.id,
        gutter: (
          <text fg={item.status === "active" ? theme.success : item.status === "candidate" ? theme.warning : theme.textMuted}>
            {item.status === "active" ? "●" : item.status === "candidate" ? "○" : "·"}
          </text>
        ),
        onSelect: () => {
          dialog.replace(() => <DialogInstinctDetail scope={scope()} id={item.id} />)
        },
      })),
  )

  const hint = createMemo(() => {
    if (items.error) return describeError(items.error)
    if (options().length === 0) return t("tui.instinct.empty")
    return t("tui.instinct.hint")
  })

  async function promote(id: string, force: boolean) {
    const result = await sdk.client.instinct.promote({ id, scope: scope(), force })
    if (result.error) {
      toast.show({
        variant: "error",
        message: t("tui.instinct.toast.failed", { message: describeError(result.error) }),
      })
      return
    }
    toast.show({ variant: "info", message: t("tui.instinct.toast.promoted", { id }) })
  }

  async function demote(id: string) {
    const result = await sdk.client.instinct.demote({ id, scope: scope(), reason: "user correction" })
    if (result.error) {
      toast.show({
        variant: "error",
        message: t("tui.instinct.toast.failed", { message: describeError(result.error) }),
      })
      return
    }
    toast.show({ variant: "info", message: t("tui.instinct.toast.demoted", { id }) })
  }

  async function forget(id: string) {
    const result = await sdk.client.instinct.forget({ id, scope: scope() })
    if (result.error) {
      toast.show({
        variant: "error",
        message: t("tui.instinct.toast.failed", { message: describeError(result.error) }),
      })
      return
    }
    toast.show({ variant: "info", message: t("tui.instinct.toast.forgotten", { id }) })
  }

  async function review() {
    const result = await sdk.client.instinct.review({ scope: scope() })
    if (result.error) {
      toast.show({
        variant: "error",
        message: t("tui.instinct.toast.failed", { message: describeError(result.error) }),
      })
      return
    }
    toast.show({
      variant: "info",
      message: t("tui.instinct.toast.reviewed", {
        promoted: String(result.data?.promoted.length ?? 0),
        decayed: String(result.data?.decayed ?? 0),
      }),
    })
    await refetch()
  }

  async function confirmThen(message: string, action: () => Promise<void>) {
    const ok = await DialogConfirm.show(dialog, t("tui.instinct.title"), message)
    if (ok) await action()
    dialog.replace(() => <DialogInstinct initialScope={scope()} />)
  }

  return (
    <DialogSelect
      title={`${t("tui.instinct.title")} · ${t(`tui.instinct.scope.${scope()}`)}`}
      hint={hint()}
      options={options()}
      keybind={[
        {
          keybind: PROMOTE,
          title: t("tui.instinct.keybind.promote"),
          onTrigger: (option) => void promote(option.value, false).then(() => refetch()),
        },
        {
          keybind: FORCE_PROMOTE,
          title: t("tui.instinct.keybind.force"),
          onTrigger: (option) =>
            void confirmThen(t("tui.instinct.confirm.force"), () => promote(option.value, true)),
        },
        {
          keybind: DEMOTE,
          title: t("tui.instinct.keybind.demote"),
          onTrigger: (option) => void confirmThen(t("tui.instinct.confirm.demote"), () => demote(option.value)),
        },
        {
          keybind: DELETE,
          title: t("tui.instinct.keybind.delete"),
          onTrigger: (option) => void confirmThen(t("tui.instinct.confirm.forget"), () => forget(option.value)),
        },
        {
          keybind: REVIEW,
          title: t("tui.instinct.keybind.review"),
          side: "right",
          onTrigger: () => void review(),
        },
        {
          keybind: SCOPE,
          title: t("tui.instinct.keybind.scope"),
          side: "right",
          onTrigger: () => setScope((value) => (value === "project" ? "global" : "project")),
        },
      ]}
    />
  )
}

export function DialogInstinctDetail(props: { scope: Scope; id: string }) {
  const dialog = useDialog()
  const sdk = useSDK()
  const { theme } = useTheme()
  const t = useLanguage().t
  const [item] = createResource(async () => {
    const result = await sdk.client.instinct.get({ id: props.id, scope: props.scope })
    if (result.error) throw new Error(describeError(result.error))
    return result.data
  })

  useKeyboard((evt) => {
    if (evt.name === "escape" || evt.name === "return") dialog.clear()
  })

  return (
    <box paddingLeft={2} paddingRight={2} gap={1}>
      <box flexDirection="row" justifyContent="space-between">
        <text attributes={TextAttributes.BOLD} fg={theme.text}>
          {item()?.info.description ?? props.id}
        </text>
        <text fg={theme.textMuted} onMouseUp={() => dialog.clear()}>
          esc
        </text>
      </box>
      <Show when={item()}>
        {(entry) => (
          <>
            <text fg={theme.textMuted}>
              {`${t(`tui.instinct.status.${entry().info.status}`)} · ${entry().info.confidence.toFixed(2)} · ${
                entry().info.source
              } · ${entry().info.id}`}
            </text>
            <text fg={theme.textMuted}>
              {`${t("tui.instinct.detail.evidence")}: ${entry()
                .info.evidence.map((evidence) => `${evidence.date} ${evidence.session}`)
                .join("  ")}`}
            </text>
            <Show when={(entry().info.contradictions ?? 0) > 0}>
              <text fg={theme.warning}>{`contradictions: ${entry().info.contradictions ?? 0}`}</text>
            </Show>
            <scrollbox maxHeight={14} scrollbarOptions={{ visible: false }}>
              <text fg={theme.text}>{entry().body || entry().info.description}</text>
            </scrollbox>
          </>
        )}
      </Show>
    </box>
  )
}
