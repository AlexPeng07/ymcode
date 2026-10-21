export function bridgeLegacyEnv(env: NodeJS.ProcessEnv = process.env): void {
  for (const key of Object.keys(env)) {
    if (!key.startsWith("MIMOCODE_")) continue
    const next = `YMCODE_${key.slice("MIMOCODE_".length)}`
    if (env[next] == null) env[next] = env[key]
  }
}
