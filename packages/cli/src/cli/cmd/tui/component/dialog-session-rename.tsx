import { DialogPrompt } from "@tui/ui/dialog-prompt"
import { useDialog } from "@tui/ui/dialog"
import { useSync } from "@tui/context/sync"
import { createSignal, onCleanup } from "solid-js"
import { useSDK } from "../context/sdk"
import { useToast } from "../ui/toast"
import { useTheme } from "../context/theme"
import { useLanguage } from "../context/language"
import { titleReadback, unchangedTitle } from "../util/session-title"

interface DialogSessionRenameProps {
  session: string
}

export function DialogSessionRename(props: DialogSessionRenameProps) {
  const sessionID = props.session
  const dialog = useDialog()
  const sync = useSync()
  const sdk = useSDK()
  const toast = useToast()
  const { theme } = useTheme()
  const { t } = useLanguage()
  // Capture the edit base once; incoming AI/SSE never changes this draft.
  const currentSession = sync.session.get(sessionID)
  const initial = currentSession && { title: currentSession.title, titleRevision: currentSession.titleRevision }
  const [revision, setRevision] = createSignal(initial?.titleRevision)
  const [busy, setBusy] = createSignal(false)
  const [message, setMessage] = createSignal("")
  let active = true
  let saved = false
  let attempted = false
  let conflicted = false
  let draft = initial?.title ?? ""
  onCleanup(() => {
    active = false
    if (!saved && (draft !== initial?.title || attempted || busy()))
      toast.show({
        variant: "warning",
        message: busy()
          ? t("tui.session.rename.toast.unconfirmed")
          : t("tui.session.rename.toast.not_saved"),
      })
  })

  async function save(value: string) {
    if (busy()) return
    if (unchangedTitle(value, initial?.title, conflicted)) {
      draft = initial?.title ?? ""
      dialog.clear()
      return
    }
    const title = Array.from(value.trim()).slice(0, 80).join("")
    if (!title) {
      setMessage(t("tui.session.rename.msg.empty"))
      return
    }
    if (revision() === undefined) {
      setMessage(t("tui.session.rename.msg.no_engine"))
      return
    }
    draft = value
    attempted = true
    setBusy(true)
    setMessage("")
    try {
      const response = await sdk.client.session.update(
        { sessionID: sessionID, title, expectedRevision: revision()! },
        { throwOnError: true, signal: AbortSignal.timeout(15000) },
      )
      if (!active) return
      if (!response.data || !sync.session.get(sessionID)) throw new Error("Session no longer available")
      sync.session.apply(response.data)
      saved = true
      toast.show({ variant: "success", message: t("tui.session.rename.toast.saved") })
      dialog.clear()
    } catch (error) {
      const rejectedConflict =
        typeof error === "object" && error !== null && "name" in error && error.name === "TitleConflictError"
      if (rejectedConflict) conflicted = true
      // A lost response may have committed. Never automatically resend it.
      try {
        const response = await sdk.client.session.get(
          { sessionID: sessionID },
          { throwOnError: true, signal: AbortSignal.timeout(15000) },
        )
        if (!active) return
        if (!response.data || !sync.session.get(sessionID)) throw new Error("Session no longer available")
        sync.session.apply(response.data)
        const current = sync.session.get(sessionID)!
        if (
          response.data.titleRevision === current.titleRevision &&
          (response.data.title !== current.title || response.data.titleSource !== current.titleSource)
        ) {
          setMessage(t("tui.session.rename.msg.conflict_titles"))
          return
        }
        const outcome = titleReadback(revision(), title, current, rejectedConflict)
        if (outcome === "saved") {
          saved = true
          toast.show({ variant: "success", message: t("tui.session.rename.toast.already_saved") })
          dialog.clear()
          return
        }
        const conflict = outcome === "conflict"
        if (conflict) conflicted = true
        setRevision(current.titleRevision)
        setMessage(
          conflict
            ? t("tui.session.rename.msg.conflict", { value: current.title })
            : t("tui.session.rename.msg.not_confirmed"),
        )
      } catch {
        if (active)
          setMessage(t("tui.session.rename.msg.unconfirmed_or_deleted"))
      }
    } finally {
      if (active) setBusy(false)
    }
  }

  return (
    <DialogPrompt
      title={t("tui.session.rename.title")}
      value={initial?.title}
      busy={busy()}
      busyText={t("tui.session.rename.busy")}
      description={() => <text fg={theme.textMuted}>{message()}</text>}
      onChange={(value) => {
        draft = value
      }}
      onConfirm={(value) => {
        void save(value)
      }}
      onCancel={() => dialog.clear()}
    />
  )
}
