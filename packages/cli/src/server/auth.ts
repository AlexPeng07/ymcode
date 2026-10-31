import { Flag } from "@/flag/flag"

export function serverAuthHeader(credentials?: { password?: string; username?: string }): string | undefined {
  const password = credentials?.password ?? Flag.YMCODE_SERVER_PASSWORD
  if (!password) return undefined
  const username = credentials?.username ?? Flag.YMCODE_SERVER_USERNAME ?? "ymcode"
  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`
}
