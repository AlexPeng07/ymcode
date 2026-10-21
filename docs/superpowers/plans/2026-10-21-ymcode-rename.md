# ymcode 全面改名与迁移 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 MiMo-Code 基线完整改名为 ymcode，并把本机已有 mimocode 配置/记忆/数据库无损迁移到 ymcode 目录。

**Architecture:** 先改包名与入口，再改运行时路径与环境变量，随后加一次性复制迁移与兼容回退，最后用品牌扫描脚本兜底。所有旧目录只复制不删除；外部 provider、上游归属、第三方品牌不改。

**Tech Stack:** Bun 1.3.14、TypeScript、Effect、yargs、SQLite（bun:sqlite）、`xdg-basedir`。

**Spec:** `docs/superpowers/specs/2026-10-21-ymcode-harness-design.md`

## Global Constraints

- Bun 固定 `1.3.14`；依赖安装用 `bun ci`，仅在包名改名后允许一次 `bun install` 更新 lockfile。
- 不改已发布的 `packages/cli/migration/*/migration.sql`。
- 第一方标识全部 ymcode；外部 Xiaomi MiMo provider/model、`opencode`/`.opencode`、`@opencode-*`、第三方品牌保留。
- 迁移只复制、不移动、不删除旧目录；新旧目录同时存在时不覆盖新目录。
- 代码注释英文；用户可见文案后续由汉化计划处理，本计划不改文案语言。
- 每个 Task 结束必须提交一次。

---

### Task 1: 基线门禁

**Files:** 无

**Interfaces:**
- Consumes: 无
- Produces: 可重复的基线通过/失败清单

- [ ] **Step 1: 安装依赖**

Run: `cd F:/AllProjects/ymcode && bun ci`
Expected: 退出码 0；`node_modules` 出现。

- [ ] **Step 2: 类型检查与测试**

Run: `bun run typecheck && bun test`
Expected: 全绿。若基线有失败，记录失败文件与原因，先修复基线再进入 Task 2。

- [ ] **Step 3: 记录基线**

在 `docs/PROGRESS.md` 追加：命令、通过/失败数量、耗时。

---

### Task 2: 包名、命令与入口改名

**Files:**
- Modify: `package.json`
- Modify: `packages/cli/package.json`
- Modify: `packages/plugin/package.json`
- Modify: `packages/sdk/package.json`
- Modify: `packages/shared/package.json`
- Rename: `packages/cli/mimo.js` → `packages/cli/ymcode.js`
- Modify: 所有 `@mimo-ai/*` 导入
- Modify: `bun.lock`（由 `bun install` 生成）

**Interfaces:**
- Consumes: Task 1
- Produces: `@ymcode/cli`、`@ymcode/plugin`、`@ymcode/sdk`、`@ymcode/shared`；`ymcode` 可执行入口

- [ ] **Step 1: 改包名**

```json
// 根 package.json
{ "name": "ymcode" }

// packages/cli/package.json
{
  "name": "@ymcode/cli",
  "bin": { "ymcode": "./ymcode.js" },
  "dependencies": {
    "@ymcode/plugin": "workspace:*",
    "@ymcode/sdk": "workspace:*",
    "@ymcode/shared": "workspace:*"
  }
}
```

其余 workspace 包按同规则改为 `@ymcode/*`。

- [ ] **Step 2: 改导入与入口**

Run:
```bash
cd F:/AllProjects/ymcode
git mv packages/cli/mimo.js packages/cli/ymcode.js
git grep -l '@mimo-ai/' -- ':!bun.lock' | xargs perl -pi -e 's/\@mimo-ai\//\@ymcode\//g'
```

- [ ] **Step 3: 更新 lockfile 并验证**

Run: `bun install`
Run: `bun run typecheck`
Expected: 通过；`bun.lock` 中出现 `@ymcode/*`，不再有 `@mimo-ai/*` workspace 条目。

- [ ] **Step 4: 提交**

```bash
git add package.json packages/*/package.json packages/cli/ymcode.js bun.lock
git commit -m "refactor: rename workspace packages and CLI to ymcode"
```

---

### Task 3: 运行时路径、环境变量与配置

**Files:**
- Modify: `packages/shared/src/global.ts`
- Modify: `packages/cli/src/global/index.ts`
- Modify: `packages/cli/src/storage/db.ts`
- Modify: `packages/cli/src/flag/flag.ts`
- Modify: `packages/cli/src/config/config.ts`
- Modify: `packages/cli/src/config/paths.ts`
- Modify: `packages/cli/src/index.ts`
- Create: `packages/cli/src/env/legacy.ts`
- Test: `packages/shared/test/global.test.ts`（若不存在则新建）
- Test: `packages/cli/test/memory/paths.test.ts`、`packages/cli/test/config/*`

**Interfaces:**
- Consumes: Task 2
- Produces: `resolveYmcodeHome(env)`、`YMCODE_*` 环境变量、`ymcode.db`、`ymcode.json(c)`、`.ymcode/`

- [ ] **Step 1: 写失败测试**

```ts
// packages/shared/test/global.test.ts
import { describe, expect, test } from "bun:test"
import { resolveYmcodeHome } from "../src/global"

describe("resolveYmcodeHome", () => {
  test("uses YMCODE_HOME when set", () => {
    const out = resolveYmcodeHome({ YMCODE_HOME: "/tmp/ymcode-home" } as NodeJS.ProcessEnv)
    expect(out.mode).toBe("ymcode_home")
    expect(out.data).toBe("/tmp/ymcode-home/data")
  })
})
```

- [ ] **Step 2: 运行并确认失败**

Run: `bun test packages/shared/test/global.test.ts`
Expected: 失败（`resolveYmcodeHome` 不存在）。

- [ ] **Step 3: 实现**

```ts
// packages/shared/src/global.ts
const APP = "ymcode"

export type ResolvedPaths = {
  mode: "ymcode_home" | "xdg"
  root?: string
  data: string
  cache: string
  config: string
  state: string
}

export function resolveYmcodeHome(env: NodeJS.ProcessEnv = process.env): ResolvedPaths {
  const home = env.YMCODE_HOME
  if (home) {
    if (!path.isAbsolute(home)) throw new Error(`YMCODE_HOME must be an absolute path, got: ${JSON.stringify(home)}`)
    return {
      mode: "ymcode_home",
      root: home,
      data: path.join(home, "data"),
      cache: path.join(home, "cache"),
      config: path.join(home, "config"),
      state: path.join(home, "state"),
    }
  }
  return {
    mode: "xdg",
    data: path.join(xdgData!, APP),
    cache: path.join(xdgCache!, APP),
    config: path.join(xdgConfig!, APP),
    state: path.join(xdgState!, APP),
  }
}
```

- [ ] **Step 4: 环境变量批量改名**

Run:
```bash
cd F:/AllProjects/ymcode
git grep -l 'MIMOCODE_' -- ':!packages/cli/src/env/legacy.ts' ':!script/brand-allowlist.json' \
  | xargs perl -pi -e 's/MIMOCODE_/YMCODE_/g'
```

`Flag.MIMOCODE_MIMO_ONLY` 改为 `Flag.YMCODE_ONLY`，环境变量名改为 `YMCODE_ONLY`。

- [ ] **Step 5: 加旧环境变量兼容桥**

```ts
// packages/cli/src/env/legacy.ts
export function bridgeLegacyEnv(env: NodeJS.ProcessEnv = process.env) {
  for (const key of Object.keys(env)) {
    if (!key.startsWith("MIMOCODE_")) continue
    const next = `YMCODE_${key.slice("MIMOCODE_".length)}`
    if (env[next] == null) env[next] = env[key]
  }
}
```

在 `packages/cli/src/index.ts`、`packages/cli/src/node.ts` 的最顶部加入副作用导入：

```ts
import "./env/legacy-boot"
```

（`legacy-boot.ts` 调用 `bridgeLegacyEnv()`；保证在 `flag.ts` 求值前执行。）

- [ ] **Step 6: 数据库与配置文件改名**

```ts
// packages/cli/src/storage/db.ts
return path.join(Global.Path.data, "ymcode.db")
return path.join(Global.Path.data, `ymcode-${safe}.db`)
```

`config/config.ts` 中 `mimocode.json(c)` 全部改为 `ymcode.json(c)`；项目配置发现优先 `.ymcode`，再回退 `.mimocode`（回退逻辑放 `config/paths.ts`）。

- [ ] **Step 7: 运行测试**

Run: `bun test packages/shared/test/global.test.ts packages/cli/test/memory/paths.test.ts`
Expected: 通过。

- [ ] **Step 8: 提交**

```bash
git add packages/shared/src/global.ts packages/cli/src packages/cli/test
git commit -m "refactor: rename runtime paths and env vars to ymcode"
```

---

### Task 4: 安装、卸载与品牌入口

**Files:**
- Modify: `packages/cli/src/installation/index.ts`
- Modify: `packages/cli/src/cli/cmd/uninstall.ts`
- Modify: `packages/cli/src/index.ts`（`scriptName`、logo、进程环境）
- Modify: `packages/cli/src/cli/ui.ts`（logo/名称）
- Modify: `packages/cli/src/cli/error.ts`
- Modify: `.github/workflows/*`、`script/*`
- Modify: `README.md`、`README.zh.md`、`AGENTS.md`

**Interfaces:**
- Consumes: Task 3
- Produces: 安装目录 `~/.ymcode`、PATH 标记 `# ymcode`、二进制 `ymcode`

- [ ] **Step 1: 改入口与安装路径**

- `scriptName("ymcode")`、`process.env.YMCODE = "1"`、`YMCODE_PID`。
- `PACKAGE_NAME = "@ymcode/cli"`。
- 安装目录 `.mimocode` → `.ymcode`，二进制 `mimo.exe` → `ymcode.exe`，PATH 注释 `# ymcode`。
- 卸载逻辑同时识别旧 `.mimocode` 安装并只提示、不自动删除。

- [ ] **Step 2: 改 CI/脚本**

Run:
```bash
git grep -lE 'mimocode|MiMoCode|mimo\.exe|\bmimo\b' -- .github script | xargs perl -pi -e '
  s/MiMoCode/ymcode/g; s/mimocode/ymcode/g; s/mimo\.exe/ymcode.exe/g;
  s/\bmimo\b/ymcode/g;
'
```

人工复核 `script/release.ts`、`script/sync-registry.ts`、`.github/workflows/*`，外部 URL/第三方名称不得改。

- [ ] **Step 3: 更新 README/AGENTS**

- 主 README 改为 ymcode 中文说明：安装、构建、记忆、instincts、汉化、上游归属。
- `AGENTS.md` 改为 ymcode 项目约定；保留上游署名链接。
- 新增 `NOTICE` 与 `UPSTREAM.md`。

- [ ] **Step 4: 提交**

```bash
git add packages/cli/src/installation packages/cli/src/cli .github script README.md README.zh.md AGENTS.md NOTICE UPSTREAM.md
git commit -m "refactor: rename install/uninstall and docs to ymcode"
```

---

### Task 5: mimocode → ymcode 数据迁移

**Files:**
- Create: `packages/cli/src/installation/migrate.ts`
- Modify: `packages/cli/src/global/index.ts`
- Create: `packages/cli/src/cli/cmd/migrate.ts`
- Modify: `packages/cli/src/index.ts`
- Test: `packages/cli/test/installation/migrate.test.ts`

**Interfaces:**
- Consumes: Task 3
- Produces: `migrateFromMimocode({ dryRun? }) => Promise<MigrationResult>`

- [ ] **Step 1: 写失败测试**

```ts
// packages/cli/test/installation/migrate.test.ts
import { describe, expect, test } from "bun:test"
import fs from "fs/promises"
import path from "path"
import os from "os"
import { migrateFromMimocode } from "../../src/installation/migrate"

describe("migrateFromMimocode", () => {
  test("copies config, data and db without deleting source", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ymcode-migrate-"))
    const oldConfig = path.join(root, "old", "config")
    const newConfig = path.join(root, "new", "config")
    await fs.mkdir(oldConfig, { recursive: true })
    await fs.writeFile(path.join(oldConfig, "mimocode.json"), "{}")

    const result = await migrateFromMimocode({ home: root, dryRun: false, overrides: { config: [oldConfig, newConfig] } })

    expect(result.copied).toContain(oldConfig)
    expect(await fs.readFile(path.join(newConfig, "ymcode.json"), "utf8")).toBe("{}")
    expect(await fs.readFile(path.join(oldConfig, "mimocode.json"), "utf8")).toBe("{}")
  })
})
```

- [ ] **Step 2: 运行并确认失败**

Run: `bun test packages/cli/test/installation/migrate.test.ts`
Expected: 失败（模块不存在）。

- [ ] **Step 3: 实现迁移**

```ts
// packages/cli/src/installation/migrate.ts
import fs from "fs/promises"
import path from "path"
import os from "os"
import { xdgConfig, xdgData, xdgState, xdgCache } from "xdg-basedir"

export type MigrationResult = { copied: string[]; skipped: string[]; dbRenamed: string[] }

type Options = {
  home?: string
  dryRun?: boolean
  overrides?: Partial<Record<"config" | "data" | "state" | "cache" | "home", [string, string]>>
}

export async function migrateFromMimocode(opts: Options = {}): Promise<MigrationResult> {
  const home = opts.home ?? process.env.HOME ?? process.env.USERPROFILE ?? os.homedir()
  const pairs = {
    config: opts.overrides?.config ?? [path.join(xdgConfig!, "mimocode"), path.join(xdgConfig!, "ymcode")],
    data: opts.overrides?.data ?? [path.join(xdgData!, "mimocode"), path.join(xdgData!, "ymcode")],
    state: opts.overrides?.state ?? [path.join(xdgState!, "mimocode"), path.join(xdgState!, "ymcode")],
    cache: opts.overrides?.cache ?? [path.join(xdgCache!, "mimocode"), path.join(xdgCache!, "ymcode")],
    home: opts.overrides?.home ?? [path.join(home, ".mimocode"), path.join(home, ".ymcode")],
  }
  const result: MigrationResult = { copied: [], skipped: [], dbRenamed: [] }
  for (const [from, to] of Object.values(pairs)) {
    const exists = await fs.stat(from).then(() => true).catch(() => false)
    if (!exists) { result.skipped.push(from); continue }
    const targetExists = await fs.stat(to).then(() => true).catch(() => false)
    if (targetExists) { result.skipped.push(to); continue }
    if (!opts.dryRun) await fs.cp(from, to, { recursive: true, errorOnExist: false })
    result.copied.push(from)
  }
  if (!opts.dryRun) {
    for (const [fromDir, toDir] of [pairs.data, pairs.config]) {
      for (const [oldName, newName] of [
        ["mimocode.db", "ymcode.db"],
        ["mimocode.db-wal", "ymcode.db-wal"],
        ["mimocode.db-shm", "ymcode.db-shm"],
        ["mimocode.json", "ymcode.json"],
        ["mimocode.jsonc", "ymcode.jsonc"],
      ]) {
        const from = path.join(toDir, oldName)
        const to = path.join(toDir, newName)
        if (await fs.stat(from).then(() => true).catch(() => false)) {
          await fs.rename(from, to)
          result.dbRenamed.push(to)
        }
      }
    }
    await fs.writeFile(path.join(pairs.data[1], ".migrated-from-mimocode"), new Date().toISOString())
  }
  return result
}
```

- [ ] **Step 4: 启动时执行迁移**

在 `packages/cli/src/global/index.ts` 的 `fs.mkdir` 之前：

```ts
import { migrateFromMimocode } from "@/installation/migrate"
await migrateFromMimocode().catch((error) => Log.Default.warn("migration failed", { error: String(error) }))
```

迁移失败不得阻止启动。

- [ ] **Step 5: 加 CLI 命令**

```ts
// packages/cli/src/cli/cmd/migrate.ts
import { cmd } from "./cmd"
import { migrateFromMimocode } from "../../installation/migrate"

export const MigrateCommand = cmd({
  command: "migrate",
  describe: "copy legacy mimocode config, memory and database into ymcode (never deletes source)",
  builder: (yargs) => yargs.option("dry-run", { type: "boolean", default: false }),
  async handler(args) {
    const result = await migrateFromMimocode({ dryRun: args.dryRun })
    console.log(JSON.stringify(result, null, 2))
  },
})
```

在 `src/index.ts` 注册 `.command(MigrateCommand)`。

- [ ] **Step 6: 运行测试**

Run: `bun test packages/cli/test/installation/migrate.test.ts`
Expected: 通过；旧目录仍存在。

- [ ] **Step 7: 提交**

```bash
git add packages/cli/src/installation/migrate.ts packages/cli/src/global/index.ts packages/cli/src/cli/cmd/migrate.ts packages/cli/src/index.ts packages/cli/test/installation/migrate.test.ts
git commit -m "feat: migrate legacy mimocode data to ymcode"
```

---

### Task 6: 品牌扫描与收尾

**Files:**
- Create: `script/check-brand.ts`
- Create: `script/brand-allowlist.json`
- Modify: `package.json`（add `check:brand`）
- Modify: 所有残留第一方旧品牌

**Interfaces:**
- Consumes: Task 5
- Produces: `bun run check:brand` 可失败/通过的品牌门禁

- [ ] **Step 1: 写扫描脚本**

```ts
// script/check-brand.ts
import { $ } from "bun"
import fs from "fs/promises"

const allow = JSON.parse(await Bun.file("script/brand-allowlist.json").text()) as { path: string; reason: string }[]
const allowPaths = new Set(allow.map((x) => x.path))
const patterns = [
  /@mimo-ai\//g,
  /\bMIMOCODE_[A-Z0-9_]+\b/g,
  /\bmimocode\b/gi,
  /\bMiMoCode\b|\bMiMo Code\b/g,
  /\bmimo\.js\b/g,
]
const files = (await $`git ls-files`.text()).trim().split("\n")
let bad = 0
for (const file of files) {
  if (allowPaths.has(file)) continue
  if (!/\.(ts|tsx|js|json|jsonc|md|txt|yml|yaml|sh)$/.test(file)) continue
  const text = await fs.readFile(file, "utf8").catch(() => "")
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      console.error(`${file}: ${match[0]}`)
      bad++
    }
  }
}
if (bad > 0) process.exit(1)
```

- [ ] **Step 2: 生成允许清单**

```json
[
  { "path": "NOTICE", "reason": "upstream attribution" },
  { "path": "UPSTREAM.md", "reason": "upstream attribution and sync instructions" },
  { "path": "packages/cli/src/env/legacy.ts", "reason": "legacy env compatibility" },
  { "path": "packages/cli/src/installation/migrate.ts", "reason": "legacy data migration" },
  { "path": "packages/cli/src/provider/transform.ts", "reason": "external Xiaomi MiMo provider/model IDs" }
]
```

按实际命中补充，每条必须写原因；不允许整目录通配。

- [ ] **Step 3: 跑扫描并修复**

Run: `bun run check:brand`
Expected: 0 命中。对每条残留人工判断：第一方改 ymcode；外部 provider/上游/第三方加入允许清单。

- [ ] **Step 4: 全量门禁**

Run: `bun run typecheck && bun test && bun run --cwd packages/cli build:local`
Expected: 全绿；构建产物名为 `ymcode`。

- [ ] **Step 5: 冒烟**

Run: `./packages/cli/dist/<platform>/ymcode --version`（按实际产物路径）
Run: `./packages/cli/dist/<platform>/ymcode db path`
Expected: 版本正常；路径指向 `.../ymcode/ymcode.db`。

- [ ] **Step 6: 提交**

```bash
git add script package.json
git commit -m "chore: enforce ymcode branding with automated check"
```

---

## Self-Review

- 覆盖 spec 3.1–3.5：仓库、映射、外部名保留、迁移、品牌验证。
- 未覆盖：汉化与 instincts（各自独立计划）。
- 类型一致性：`resolveYmcodeHome`、`migrateFromMimocode` 在测试与实现中同名。
