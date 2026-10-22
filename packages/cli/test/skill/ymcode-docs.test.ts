import { describe, expect, test } from "bun:test"
import path from "path"
import { ConfigMarkdown } from "../../src/config"

const root = path.resolve(import.meta.dir, "../../src/skill/builtin/.bundle/ymcode-docs")

describe("ymcode-docs provider guidance", () => {
  test("routes provider requests to the dedicated reference", async () => {
    const skill = await Bun.file(path.join(root, "SKILL.md")).text()

    expect(skill).toContain("@reference/providers.md")
    expect(skill).toContain("绝不要递归搜索用户主目录")
    expect(skill).toContain("不要发明配置键、模型上限")
    expect(skill).toContain("research-experiment")
    expect(skill).not.toContain("SQLite FTS5 across sessions")
  })

  test("documents the implemented OpenAI-compatible adapter and safe merge rules", async () => {
    const providers = await Bun.file(path.join(root, "reference/providers.md")).text()

    expect(providers).toContain('"npm": "@ai-sdk/openai-compatible"')
    expect(providers).toContain("不要替换为 `@ai-sdk/compatible-openai`")
    expect(providers).toContain("若端点匹配但提供的凭据不同，除非用户明确想轮换现有提供方的 key，否则新建一个独立的提供方 ID")
    expect(providers).toContain("不要根据模型名猜测 `limit.context`、`limit.output`")
    expect(providers).toContain("ymcode models PROVIDER_ID")
  })

  test("documents native Anthropic Messages API configuration", async () => {
    const providers = await Bun.file(path.join(root, "reference/providers.md")).text()

    expect(providers).toContain('"npm": "@ai-sdk/anthropic"')
    expect(providers).toContain("因为适配器会追加 `/messages`")
    expect(providers).toContain("而不是依据模型名")
    expect(providers).toContain("即使上游模型 ID 含 `claude`")
    expect(providers).toContain("`x-api-key` 与 `anthropic-version`")
  })

  test("documents the effective global config precedence", async () => {
    const providers = await Bun.file(path.join(root, "reference/providers.md")).text()

    expect(providers).toContain("`config.json`、`ymcode.json`，然后是 `ymcode.jsonc`；后者胜出")
    expect(providers).toContain("若都不存在则创建 `ymcode.jsonc`")
  })

  test("keeps a newly configured API model in TUI recents without clobbering state", async () => {
    const skill = await Bun.file(path.join(root, "SKILL.md")).text()
    const config = await Bun.file(path.join(root, "reference/config.md")).text()
    const providers = await Bun.file(path.join(root, "reference/providers.md")).text()

    expect(skill).toContain("还要把确切的 `provider/model` 放到 TUI 最近模型状态的前端")
    expect(config).toContain("`model.json` 中的 TUI 最近/收藏模型")
    expect(providers).toContain("$YMCODE_HOME/state/model.json")
    expect(providers).toContain("若设置了 `XDG_STATE_HOME`，遵循它")
    expect(providers).toContain("保留每个顶层字段，尤其是 `favorite` 与 `variant`")
    expect(providers).toContain("移除其后任何 `providerID` 与 `modelID` 相同的条目")
    expect(providers).toContain("最多保留 10 条")
    expect(providers).toContain("只有在 `ymcode models PROVIDER_ID` 确认该确切模型已注册后，才写入最近状态")
    expect(providers).toContain("绝不要把 API key、base URL、显示名或拼接的 `provider/model` 字符串")
  })

  test("documents the checkpoint writer fork default", async () => {
    const config = await Bun.file(path.join(root, "reference/config.md")).text()

    expect(config).toContain("| `checkpoint.fork` | 把父前缀分叉进写入器会话以复用缓存（默认 true） |")
    expect(config).not.toContain("| `checkpoint.fork` | 把父前缀分叉进写入器会话以复用缓存（默认 false） |")
  })
})

describe("ymcode-docs TUI troubleshooting", () => {
  test("routes rendering issues to actionable terminal and SSH guidance", async () => {
    const skill = await ConfigMarkdown.parse(path.join(root, "SKILL.md"))
    const guide = await Bun.file(path.join(root, "reference/guide.md")).text()
    const commands = await Bun.file(path.join(root, "reference/commands.md")).text()

    expect(skill.data.description).toContain("终端兼容性、渲染异常、TUI 卡顿、SSH 或远程渲染")
    expect(skill.content).toContain("终端兼容性、TUI 渲染或卡顿")
    expect(guide).toContain("不支持内置的 Terminal.app")
    expect(guide).toContain("brew install --cask iterm2")
    expect(guide).toContain("ymcode serve --port 4096")
    expect(guide).toContain("ssh -N -L 4096:127.0.0.1:4096 user@remote-host")
    expect(guide).toContain("ymcode attach http://127.0.0.1:4096")
    expect(guide).toContain("按需在 Vivid 与 Minimal 视觉之间切换")
    expect(guide).toContain("`ctrl+p` 中的视觉模式选项")
    expect(guide).toContain("独立的动画覆盖开关")
    expect(guide).not.toContain("same persisted setting")
    expect(commands).toContain("见 @guide.md")
  })
})

/**
 * These docs are fed to the model AS INSTRUCTIONS, so a misclassification here
 * does not merely read wrong — it teaches the model that a valid config shape is
 * invalid. `mcp_sampling` is glob-keyed by MCP server name (the handler passes
 * `patterns: [server]`), and the page's own example uses the glob-map form, so
 * listing it as action-only contradicted the example two paragraphs below it.
 */
describe("ymcode-docs permission arity", () => {
  test("classifies mcp_sampling as glob-keyed, not action-only", async () => {
    const permissions = await Bun.file(path.join(root, "reference/permissions.md")).text()

    const globLine = permissions.split("\n").find((line) => line.startsWith("以 glob 为键"))
    const simpleLine = permissions.split("\n").find((line) => line.startsWith("仅用简单动作"))
    expect(globLine).toBeDefined()
    expect(simpleLine).toBeDefined()
    expect(globLine).toContain("`mcp_sampling`")
    expect(simpleLine).not.toContain("`mcp_sampling`")
    // The glob key is a server name, not a path or a command — say so, since the
    // section is otherwise about paths and commands.
    expect(permissions).toContain("但 `mcp_sampling` 例外，其键是 MCP 服务器名")
    // The example that the old classification contradicted must still be present.
    expect(permissions).toContain('"mcp_sampling": { "*": "ask", "mimo-cut": "allow" }')
  })

  test("states that a permission deny outranks mcp.<server>.sampling allow", async () => {
    const permissions = await Bun.file(path.join(root, "reference/permissions.md")).text()

    expect(permissions).toContain(
      '任一控制给出 `deny` 都胜出：`mcp.<name>.sampling: "allow"` **不会**覆盖 `permission.mcp_sampling` 对该服务器的拒绝。',
    )
  })
})
