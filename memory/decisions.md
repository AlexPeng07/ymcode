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

## D11：非 Git 项目用目录哈希隔离记忆

**Context**：`ProjectID.global` 是 Git 项目的默认值，所有非 Git 目录会共用
`projects/global/MEMORY.md`，不同项目的记忆互相污染。

**Decision**：新增 `memoryProjectID(project, directory)`；Git 项目原样使用 `project.id`，
非 Git 项目用规范化绝对路径的 `sha256` 前 12 位生成 `dir-<hash>`。所有写记忆/检索的调用点
（checkpoint、llm、prompt、external-directory、instinct、server 路由）统一走该 helper。

**Consequence**：不同非 Git 目录记忆互相隔离；Windows 路径大小写先归一化再哈希。
运行时目录变化不影响 Git 项目。

## D12：技能目录用紧凑 name+description，不注入 location

**Context**：44 个内置技能的系统提示目录约 20.9K 字符，其中 `<location>` 文件 URL 占
约 4.8K；`skill` 工具本身按名称加载正文，模型不需要目录里的路径。

**Decision**：`Skill.fmt` 只输出 `## Available Skills` + 每行 `- **name**: description`，
删除 verbose XML 包装与 `<location>`；同步更新 skill 工具参数描述、子代理提示词中的
目录说明与测试断言。

**Consequence**：目录体积降到约 14.4K 字符（-31%，约 1.8K tokens）；模型仍能按名称调用。
若未来需要模型直接读取技能文件路径，再评估恢复 location。

## D13：i18n 门禁扫描静态 t() 引用

**Context**：`check:i18n` 只比较 en/zh key 对齐，无法发现“组件里 `t("key")` 但 key 从未加入
词典”的情况；`i18n.translator` 对缺失 key 返回 `undefined`，界面会静默空白。
v0.2.3 的汉化轮就遗漏了 prompt composer 与 workflow view 共 23 个 key。

**Decision**：`script/check-i18n.ts` 增加 `packages/cli/src/cli/cmd/tui` 下静态
`t("...")`/`t('...')` 引用扫描；引用不在 en 字典中即门禁失败。

**Consequence**：覆盖 162 个文件、731 处引用；动态拼接的 key 仍无法覆盖，新增文案时优先写
静态 key。
