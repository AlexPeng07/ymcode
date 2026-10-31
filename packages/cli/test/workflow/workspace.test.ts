import { describe, expect, test } from "bun:test"
import path from "path"
import { resolveInWorkspace, makeFileHooks } from "../../src/workflow/workspace"
import { tmpdir } from "../fixture/fixture"

describe("resolveInWorkspace", () => {
  // Join semantics are platform join: positive assertions compare against
  // path.resolve of the same inputs so the suite runs on every platform
  // (previously POSIX-only via literal /ws expectations).
  test("resolves a relative path inside the root", () => {
    expect(resolveInWorkspace("/ws", "a/b.txt")).toBe(path.resolve("/ws", "a/b.txt"))
  })

  test("allows the root itself and nested dirs", () => {
    expect(resolveInWorkspace("/ws", ".")).toBe(path.resolve("/ws", "."))
    expect(resolveInWorkspace("/ws", "deep/nested/x")).toBe(path.resolve("/ws", "deep/nested/x"))
  })

  test("rejects a parent-traversal escape", () => {
    expect(() => resolveInWorkspace("/ws", "../escape")).toThrow(/workspace/)
  })

  test("rejects an absolute path that escapes the root", () => {
    expect(() => resolveInWorkspace("/ws", "/etc/passwd")).toThrow(/workspace/)
  })
})

describe("makeFileHooks read/write/exists", () => {
  test("writeFile then readFile round-trips inside the workspace", async () => {
    await using root = await tmpdir()
    const hooks = makeFileHooks(root.path)
    await hooks.writeFile("out/data.tsv", "a\tb\n")
    expect(await hooks.readFile("out/data.tsv")).toBe("a\tb\n")
  })

  test("readFile of a missing file returns null (not throw)", async () => {
    await using root = await tmpdir()
    const hooks = makeFileHooks(root.path)
    expect(await hooks.readFile("nope.txt")).toBe(null)
  })

  test("exists reflects presence", async () => {
    await using root = await tmpdir()
    const hooks = makeFileHooks(root.path)
    expect(await hooks.exists("x")).toBe(false)
    await hooks.writeFile("x", "1")
    expect(await hooks.exists("x")).toBe(true)
  })

  test("writeFile escaping the workspace throws", async () => {
    await using root = await tmpdir()
    const hooks = makeFileHooks(root.path)
    await expect(hooks.writeFile("../escape", "x")).rejects.toThrow(/workspace/)
  })
})

describe("makeFileHooks glob", () => {
  test("returns workspace-relative matches, lexicographically sorted", async () => {
    await using root = await tmpdir()
    const hooks = makeFileHooks(root.path)
    await hooks.writeFile("src/c.zig", "")
    await hooks.writeFile("src/a.zig", "")
    await hooks.writeFile("src/b.zig", "")
    const r = await hooks.glob("src/*.zig")
    expect(r).toEqual(["src/a.zig", "src/b.zig", "src/c.zig"]) // sorted, relative
  })

  test("empty match set returns []", async () => {
    await using root = await tmpdir()
    const hooks = makeFileHooks(root.path)
    expect(await hooks.glob("nothing/*.x")).toEqual([])
  })

  test("glob cannot escape the workspace via .. or absolute patterns", async () => {
    await using root = await tmpdir()
    await using outside = await tmpdir()
    const hooks = makeFileHooks(root.path)
    // A file OUTSIDE the workspace root.
    const { writeFileSync } = await import("fs")
    writeFileSync(path.join(outside.path, "secret.txt"), "x")
    // A file INSIDE the workspace (the legitimate match).
    await hooks.writeFile("inside.txt", "y")
    // Parent-traversal and absolute patterns must NOT leak anything outside root.
    expect(await hooks.glob(`../${path.basename(outside.path)}/*`)).toEqual([])
    expect(await hooks.glob(`${outside.path}/*`)).toEqual([])
    expect(await hooks.glob("../*")).toEqual([])
    // A normal in-workspace glob still works.
    expect(await hooks.glob("*.txt")).toEqual(["inside.txt"])
  })
})
