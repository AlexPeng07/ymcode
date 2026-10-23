import { createMemo, createSignal, onMount } from "solid-js"
import { useDialog } from "@tui/ui/dialog"
import { DialogSelect } from "@tui/ui/dialog-select"
import { useSDK } from "../context/sdk"
import { useSync } from "@tui/context/sync"
import { useRoute } from "@tui/context/route"
import { useToast } from "../ui/toast"
import { isDirectoryDeniedError } from "@/server/routes/instance/access"
import { useLanguage } from "@tui/context/language"
import path from "path"

const CREATE_SENTINEL = "__create_worktree__"

export function DialogWorktree() {
  const dialog = useDialog()
  const sdk = useSDK()
  const sync = useSync()
  const route = useRoute()
  const toast = useToast()
  const t = useLanguage().t
  const [worktrees, setWorktrees] = createSignal<string[]>()
  const [busy, setBusy] = createSignal<string>()

  onMount(async () => {
    dialog.setSize("medium")
    const result = await sdk.client.worktree.list().catch(() => undefined)
    setWorktrees(result?.data ?? [])
  })

  const options = createMemo(() => {
    const b = busy()
    if (b) {
      return [{ title: b, value: "__busy__" }]
    }

    const list = worktrees()
    if (!list) {
      return [{ title: t("tui.dialog.worktree.loading"), value: "__loading__" }]
    }

    const items = list.map((dir) => ({
      title: path.basename(dir),
      value: dir,
      description: dir,
    }))

    return [
      ...items,
      {
        title: t("tui.dialog.worktree.create"),
        value: CREATE_SENTINEL,
        description: undefined as string | undefined,
      },
    ]
  })

  async function switchTo(directory: string) {
    setBusy(t("tui.dialog.worktree.switching"))
    const previous = sdk.directory
    await sdk.client.instance.dispose().catch(() => {})
    sdk.switchDirectory(directory)
    // The server rejects any directory outside its cwd (instance middleware 403).
    // That used to propagate out of bootstrap into the TUI's fatal-exit path and
    // kill the whole session; treat it as a recoverable error: point the SDK back
    // at the directory that was working, re-sync, and tell the user which path was
    // refused and why.
    const failure = await sync.bootstrap().then(
      () => undefined,
      (e) => e,
    )
    if (failure) {
      if (previous) sdk.switchDirectory(previous)
      await sync.bootstrap({ fatal: false }).catch(() => {})
      setBusy(undefined)
      dialog.clear()
      toast.show({
        message: isDirectoryDeniedError(failure)
          ? t("tui.dialog.worktree.outside", { directory })
          : t("tui.dialog.worktree.switch_failed", { name: path.basename(directory) }),
        variant: "error",
      })
      return
    }
    route.navigate({ type: "home" })
    dialog.clear()
    toast.show({
      message: t("tui.dialog.worktree.switched", { name: path.basename(directory) }),
      variant: "success",
    })
  }

  async function create() {
    setBusy(t("tui.dialog.worktree.creating"))
    const result = await sdk.client.worktree.create().catch(() => undefined)
    if (!result?.data) {
      toast.show({ message: t("tui.dialog.worktree.create_failed"), variant: "error" })
      setBusy(undefined)
      return
    }
    await switchTo(result.data.directory)
  }

  return (
    <DialogSelect
      title={t("tui.dialog.worktree.title")}
      options={options()}
      skipFilter={true}
      onSelect={(option) => {
        if (option.value === "__busy__" || option.value === "__loading__") return
        if (option.value === CREATE_SENTINEL) {
          void create()
          return
        }
        void switchTo(option.value)
      }}
    />
  )
}
