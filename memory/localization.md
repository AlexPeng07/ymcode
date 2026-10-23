# 汉化架构与覆盖

## 现状

- UI 字典：`en.ts` 872 个 key，`zh.ts` 915 个 key（多出的主要是 `tui.skill.*` 描述/别名/场景说明）。
- 内置技能：39 个技能目录、85 个 `SKILL.md`。其中 70 个原有 `SKILL.md` 正文已翻译；
  新增的 15 个 Anthropic 官方技能保留英文正文，只中文化 frontmatter `description`
  和开头的中文简介/适用场景（`check-skills.ts` 用中文简介满足正文检查）。
- 二进制资源：`bundle.macro.ts` 以 NUL 前缀 + base64 内联 TTF/PDF/GZ 等文件，
  `extract.ts` 再解码写回；`canvas-design` 的 54 款字体、`theme-factory` 的 PDF
  和 `web-artifacts-builder` 的 tar.gz 都走这条路径。
- 提示词/工具描述：54 个 `.txt` 已翻译（agent prompt、command template、tool、session prompt）。
- 核心 TUI：权限对话框、会话视图、provider/status/skill/session/MCP 对话框、崩溃页已中文。
- CLI：`instinct`、`mcp`、`cli/error.ts` 已中文；顶层 `--help` 和部分子命令/选项仍有英文。

## i18n 机制

- 字典：`packages/cli/src/cli/cmd/tui/i18n/{en,zh}.ts`，`export const dict`。
- 上下文：`packages/cli/src/cli/cmd/tui/context/language.tsx`，组件里 `const { t } = useLanguage()`。
- 语言检测：`packages/cli/src/cli/cmd/tui/util/system-locale.ts`。
  - 先看 `YMCODE_LOCALE`（新增，`zh`/`en` 等），再按系统时区/`LANG`/`Intl` 自动检测。
  - zh-CN 默认中文；测试预加载设置 `YMCODE_LOCALE=en`，让既有英文断言稳定。
- 非组件 helper 不能直接调 hook；把 `t` 作为参数传入，或把文案移到渲染处。
- 技能选择器：`tui.skill.<name>.title` 中文名、`.when` 适用场景、`.description` 一句话说明、
  `.slash` 中文别名；`/skills` 弹窗用中文名作为标题，支持中文/拼音搜索，
  并在列表下方显示“适用 + 触发”说明（`DialogSelect` 的 `detail` 属性）。
- 插件面板：`tui.plugins.builtin.<id>.name/description` 为 13 个内置插件提供中文名和解释；
  `tui.plugins.*` 的其余文案此前缺失，已补齐。

## 内容规则

- 技能 frontmatter `name` 不变；`description` 中文化，可保留 ` | Trigger keywords: ...` 英文触发词。
- 技能正文翻译；代码围栏、行内代码、URL、命令、路径、API 名、YAML/JSON 字段、第三方品牌不变。
- 提示词：保留工具名、`§1..§11` 锚点、`## Rules`/`## Architecture decisions`/`## Discovered durable knowledge`、SQL、路径、`<CHECKPOINT_PATH>` 等标识。
- 代码标识符、内部 `Log.*`、协议字段保持英文；用户可见错误/toast 中文。
- 崩溃页（`error-component.tsx`）在 LanguageProvider 之外，直接写中文，不能调 `useLanguage()`。

## 门禁

```bash
bun run check:brand
bun run check:i18n
bun run check:skills
bun run check:prompts
```

- `script/check-brand.ts` + `script/brand-allowlist.json`：第一方旧品牌 token 扫描；允许清单包含迁移/归属/外部 provider/第三方/交接文档。
- `script/check-i18n.ts`：en/zh key 对齐、空值、39 个顶层技能的中文描述/名称/场景。
- `script/check-skills.ts`：85 个 `SKILL.md` 的 YAML name、代码围栏、行内代码、URL、中文正文/描述。代码比较会把 `mimo`/`opencode` 命令名规范化为 `ymcode`，允许品牌命令改写；`ymcode-docs/SKILL.md` 因删除旧 vendor schema URL 有显式代码差异允许项，正文与描述仍照常检查。
- `script/check-prompts.ts`：54 个 `.txt` 的代码围栏、行内代码、URL、受保护路径/锚点、中文正文。
- `script/i18n-audit.ts`：启发式扫描 UI 硬编码字符串，输出 `docs/verification/i18n-audit.txt`；有误报，只作线索。

## 如何新增一条 UI 文案

1. 在组件里 `const { t } = useLanguage()`。
2. 用 `t("tui.<area>.<name>")`，变量用 `{name}` 占位符。
3. 在 `en.ts` 和 `zh.ts` 末尾 `// ymcode UI localization` 下同时加 key。
4. 跑 `bun run check:i18n` 与 `bun run typecheck`。
5. 若测试断言英文，测试预加载已设 `YMCODE_LOCALE=en`；不要修改测试来适配中文。

## 剩余英文

- 顶层 CLI `--help` 的命令/选项描述（`cli/cmd/*.ts` 的 `describe`）。
- 部分 provider 错误、内部错误详情、插件 API 文案。
- `README_npm.md`、`CONTRIBUTING.md`、`SECURITY.md` 等上游文档。
- `docs/compose/spec/*` 历史设计文档。

这些不影响核心 TUI/技能/提示词使用；如果要“零英文”，按 `next-steps.md` 继续。
