declare global {
  const YMCODE_VERSION: string
  const YMCODE_CHANNEL: string
}

export const InstallationVersion = typeof YMCODE_VERSION === "string" ? YMCODE_VERSION : "local"
export const InstallationChannel = typeof YMCODE_CHANNEL === "string" ? YMCODE_CHANNEL : "local"
export const InstallationLocal = InstallationChannel === "local"
