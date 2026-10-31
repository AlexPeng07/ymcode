import path from "path"
import * as Process from "./process"

// PowerShell single-quote literals escape `'` by doubling it, so raw paths
// containing a quote would otherwise break out of the command string.
const psQuote = (value: string) => value.replaceAll("'", "''")

// Entry names that escape the destination directory: `..` segments (either
// separator), drive-absolute (`C:`) and root-absolute (`/`, `\`) paths.
const TRAVERSAL_PATTERN = `(^|[\\\\/])\\.\\.([\\\\/]|$)|^[A-Za-z]:|^[\\\\/]`

export async function extractZip(zipPath: string, destDir: string) {
  if (process.platform === "win32") {
    const winZipPath = path.resolve(zipPath)
    const winDestDir = path.resolve(destDir)
    // $global:ProgressPreference suppresses PowerShell's blue progress bar popup.
    // Entries are scanned through .NET's own zip reader before extraction, so a
    // crafted archive fails closed instead of writing outside the destination.
    const cmd = [
      `$global:ProgressPreference = 'SilentlyContinue'`,
      `Add-Type -AssemblyName System.IO.Compression.FileSystem`,
      `$zip = [System.IO.Compression.ZipFile]::OpenRead('${psQuote(winZipPath)}')`,
      `try {`,
      `  $bad = @($zip.Entries | Where-Object { $_.FullName -match '${TRAVERSAL_PATTERN}' })`,
      `  if ($bad.Count -gt 0) { throw ('zip entry escapes destination: ' + $bad[0].FullName) }`,
      `} finally { $zip.Dispose() }`,
      `Expand-Archive -Path '${psQuote(winZipPath)}' -DestinationPath '${psQuote(winDestDir)}' -Force`,
    ].join("; ")
    await Process.run(["powershell", "-NoProfile", "-NonInteractive", "-Command", cmd])
    return
  }

  await Process.run(["unzip", "-o", "-q", zipPath, "-d", destDir])
}
