/**
 * Root test isolation env (defense in depth).
 *
 * Force-assigns process env BEFORE any test/src import so xdg-basedir /
 * Flag.YMCODE_HOME / Flag.YMCODE_DB cannot bind to the developer's real
 * home or production ymcode.db. Mirrors packages/cli/test/preload.ts
 * isolation; that file remains the full fixture preload when suites run
 * from packages/cli.
 *
 * Force-assign (not setIfEmpty): HOME/XDG/YMCODE_* are often already set
 * in the parent shell and must not win over the disposable test home.
 */
import fs from "node:fs"
import os from "node:os"
import path from "node:path"

const root = fs.mkdtempSync(path.join(os.tmpdir(), "ymcode-root-test-"))
const home = path.join(root, "home")
fs.mkdirSync(home, { recursive: true })

// resolveymcodeHome prefers YMCODE_HOME over XDG — drop it explicitly.
delete process.env.YMCODE_HOME
process.env.YMCODE_DB = ":memory:"
process.env.XDG_DATA_HOME = path.join(root, "share")
process.env.XDG_CACHE_HOME = path.join(root, "cache")
process.env.XDG_CONFIG_HOME = path.join(root, "config")
process.env.XDG_STATE_HOME = path.join(root, "state")
// Production code reads HOME/USERPROFILE directly (Bun caches os.homedir()).
process.env.HOME = home
process.env.USERPROFILE = home
