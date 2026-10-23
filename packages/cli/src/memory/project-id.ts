import { createHash } from "crypto"
import path from "path"
import { ProjectID } from "../project/schema"

/**
 * Project ID used for the memory tree.
 *
 * Git projects have a real ProjectID. Non-git projects deliberately keep
 * `ProjectID.global` for session/project identity, which would otherwise put
 * every unrelated directory into `memory/projects/global/MEMORY.md`. Derive a
 * stable per-directory ID instead so two non-git projects never share memory.
 *
 * The ID is a path hash rather than a random UUID: memory has no migration
 * mechanism for non-git projects, and a hash avoids writing metadata into the
 * user's directory just to open it.
 */
export function memoryProjectID(project: { id: string }, directory: string): ProjectID {
  if (project.id !== ProjectID.global) return ProjectID.make(project.id)
  const resolved = path.resolve(directory)
  const key = process.platform === "win32" ? resolved.toLowerCase() : resolved
  return ProjectID.make(`dir-${createHash("sha256").update(key).digest("hex").slice(0, 12)}`)
}
