import type { useSDK } from "@tui/context/sdk"
import { DialogPrompt } from "@tui/ui/dialog-prompt"
import type { DialogContext } from "@tui/ui/dialog"
import type { ToastContext } from "@tui/ui/toast"

function describeError(error: unknown) {
  if (typeof error === "object" && error && "message" in error && typeof error.message === "string") return error.message
  if (typeof error === "object" && error && "data" in error) return JSON.stringify(error.data)
  return JSON.stringify(error)
}

export async function remember(input: {
  dialog: DialogContext
  sdk: ReturnType<typeof useSDK>
  toast: ToastContext
  t: (key: string, params?: Record<string, string | number | boolean>) => string
  sessionID?: string
  text?: string
}) {
  const { dialog, sdk, toast, t } = input
  if (!input.sessionID) {
    toast.show({ variant: "warning", message: t("tui.remember.no_session") })
    return
  }

  let text = input.text?.trim()
  if (!text) {
    const value = await DialogPrompt.show(dialog, t("tui.remember.title"), {
      placeholder: t("tui.remember.placeholder"),
    })
    dialog.clear()
    if (!value) return
    text = value.trim()
  }
  if (!text) return
  if (text.length > 200) {
    toast.show({ variant: "warning", message: t("tui.remember.too_long") })
    return
  }

  const result = await sdk.client.instinct.create({
    scope: "project",
    description: text,
    body: text,
    session: input.sessionID,
  })
  if (result.error) {
    toast.show({
      variant: "error",
      message: t("tui.remember.failed", { message: describeError(result.error) }),
    })
    return
  }
  toast.show({ variant: "info", message: t("tui.remember.saved", { id: result.data?.id ?? "" }) })
}
