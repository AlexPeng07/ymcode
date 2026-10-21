# 关键决策（ADR 风格）

## D1：基于 MiMo-Code，而不是从 opencode 裸起点

**Context**：需求要 ECC 式记忆 + 汉化，非大改。

**Decision**：以 MiMo-Code 为基线。它已有 `MEMORY.md`、checkpoint、notes、FTS5、dream、distill，且 CLI/TUI 已有部分中文。

**Consequence**：少写记忆基础设施；但继承了一个与 upstream opencode 分叉较大的代码库，后续同步要人工 diff。

## D2：独立新仓库，不自动合并上游

**Context**：用户要“自己的 harness”，全面改名。

**Decision**：新 git 历史，保留 `_upstream_mimo/` 只读快照；不自动 merge upstream。

**Consequence**：改名/汉化自由；上游安全/功能更新需要人工移植。

## D3：CLI/TUI，不做桌面端

**Context**：opencode 是 server + client；桌面端是额外 Electron 客户端。

**Decision**：只做 CLI/TUI。桌面端不解决记忆/汉化，反而增加打包、签名、自动更新和第二套 UI 字符串。

**Consequence**：个人使用足够；要给别人用/图形 diff 时再考虑薄客户端。

## D4：第一方全面改名，外部名称保留

**Context**：用户要求“全面把名字改为 ymcode”。

**Decision**：`ymcode`、`@ymcode/*`、`.ymcode`、`YMCODE_*`、`ymcode.db`、`ymcode.json(c)` 全改；Xiaomi MiMo provider/model、opencode 上游、`.opencode` 兼容根、第三方品牌保留。

**Consequence**：`check-brand` 必须有允许清单；迁移/归属/外部 provider 文件会出现旧名。

## D5：移除 `$schema` 自动注入，保留注释

**Context**：原实现把 schema 指向 `mimo.xiaomi.com`，改名为 ymcode 后是死链；直接删 JSON 属性会丢注释。

**Decision**：不再自动注入；旧 `opencode.ai`/`mimo.xiaomi.com` schema 行用保留注释的方式删除。自定义 schema 不动。

**Consequence**：编辑器不再自动获得 schema 提示；换来不写死外部 URL、不破坏 JSONC 注释。

## D6：instincts 用 Markdown + 现有 FTS，不新增表

**Context**：需求要 ECC 式层级，但“非大改”。

**Decision**：`instincts/<id>.md` + `INSTINCTS.md` 索引；复用 `memory_fts`，新增 `instinct` 类型。

**Consequence**：文件可读可 git；没有 SQL schema 迁移；检索依赖 FTS reconcile。

## D7：observer 只捕获候选，晋升是确定性代码

**Context**：LLM 容易过度晋升/写错规则。

**Decision**：独立 `instinct-observer` 只写 candidate；晋升/降级/衰减由 service 代码判定，阈值可配置。

**Consequence**：规则层更稳；observer 多一次 LLM 调用，需节流。

## D8：测试强制英文 locale

**Context**：系统时区 zh-CN 让 TUI 测试输出中文，现有断言是英文；生产需要中文默认。

**Decision**：`detectSystemLocale` 支持 `YMCODE_LOCALE` 覆盖；测试预加载设 `en`；生产不设则自动 zh。

**Consequence**：测试稳定；新增生产环境变量 `YMCODE_LOCALE`。

## D9：崩溃页直接中文，不用 `t()`

**Context**：`ErrorComponent` 在 `LanguageProvider` 之外，调 `useLanguage()` 会在崩溃页再次崩溃。

**Decision**：崩溃页文案直接写中文；移除指向 opencode issue 的外链，改为复制错误信息。

**Consequence**：崩溃页始终中文；失去 GitHub issue 预填链接。

## D10：离线构建用本地模型快照

**Context**：本机访问 `models.dev` 超时，`build:local` 失败。

**Decision**：从已生成的 `src/provider/models-snapshot.js` 提取 JSON，设 `MODELS_DEV_API_JSON`，并 `--skip-install` 构建。

**Consequence**：本机可重复构建；模型目录是快照，不自动更新。网络恢复后可正常 `build:local`。
