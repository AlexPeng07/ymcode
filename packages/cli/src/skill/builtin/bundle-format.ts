// Bundle files are inlined as strings. Binary assets (fonts, PDFs, archives)
// are stored as a NUL-prefixed base64 marker so text files can stay plain.
export const BUNDLE_BINARY_PREFIX = "\u0000base64:"

const BINARY_EXTENSIONS = new Set([
  ".ttf",
  ".otf",
  ".woff",
  ".woff2",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".ico",
  ".pdf",
  ".zip",
  ".gz",
  ".tar",
  ".mp3",
  ".mp4",
  ".mov",
  ".wav",
  ".wasm",
])

export function isBinaryBundleFile(relPath: string, content: Buffer) {
  const dot = relPath.lastIndexOf(".")
  const ext = dot === -1 ? "" : relPath.slice(dot).toLowerCase()
  if (BINARY_EXTENSIONS.has(ext)) return true
  return content.includes(0)
}
