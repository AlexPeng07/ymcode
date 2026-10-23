# ymcode 交接索引

## 这是什么

ymcode 是一个个人自用的 AI 编程 harness，基于 MiMo-Code（上游 commit `88673c4`，MIT）改造，保留 opencode 的 server/TUI 架构，新增 ECC 风格的 instincts 记忆层，并完成核心界面、内置技能与提示词汉化。

- 仓库：`F:\AllProjects\ymcode`
- 上游基线：MiMo-Code `88673c41732fcd57bf46abe485b547c00ba78221`（2026-10-21）
- 代码 HEAD（交接时）：`3dbd34b`；最终二进制由 `6de24e8` 构建
- 二进制：`packages/cli/dist/ymcode-windows-x64/bin/ymcode.exe`
- 设计规格：`docs/superpowers/specs/2026-10-21-ymcode-harness-design.md`
- 执行计划：`docs/superpowers/plans/2026-10-21-ymcode-*.md`
- 项目进度：`docs/PROGRESS.md`
- 用户文档：`README.md`

## 当前状态

已可用：

- 独立新仓库、全面改名 ymcode、旧数据复制迁移。
- instincts：文件格式、service、FTS 类型、工具、CLI、`/instinct`、observer、注入、dream review。
- 汉化：90 个内置 `SKILL.md`（70 个正文汉化 + 15 个 Anthropic 官方技能汉化介绍 + 5 个中文自研技能）、
  54 个提示词/工具描述、核心 TUI 与 CLI（instinct/mcp）中文。
- 技能中心：`/skills` 用中文名展示，支持中文/拼音搜索，选中时显示适用场景与触发方式；
  插件面板补齐 13 个内置插件的中文名、功能解释与全部 `tui.plugins.*` 文案。
- Anthropic 官方技能：新增 algorithmic-art、canvas-design、claude-api、mcp-builder、
  webapp-testing 等 15 个；4 个文档技能沿用已有的 `docx/pdf/pptx/xlsx-official`，
  Anthropic 版 skill-creator 以 `skill-creator-official` 与现有中文版并存。
  技能包已支持 TTF/PDF/GZ 二进制资源。
- 中文自研技能：`chinese-writing`、`chinese-office-format`、`debugging`、
  `code-review-cn`、`git-workflow`，共 44 个技能目录。
- 门禁与 Windows 构建通过；隔离环境端到端验证通过。
- 默认主题为蓝色系；小米 OAuth 登录已移除，Xiaomi/MiMo 入口保留并统一走 API Key。
- CLI `--help` 已全量汉化；小米条款弹窗与 `auth whoami` 已移除。
- TUI 蓝色主题、服务商选择对话框有自动化测试；observer 抽取路径有 scripted-LLM 集成测试。
- instincts：配置阈值统一、observer 状态原子写、`last_seen_at` 稳定策略、export/import。
- `bun run upstream:diff` 可查看上游差异。
- `ymcode doctor` 检查运行时/路径/配置/凭据/搜索/数据库并给出修复建议；`ymcode setup`
  完成服务商、API Key 与默认模型的首次配置，TUI 首次无凭据启动会自动弹出服务商选择。
- instincts TUI 面板：`/instincts` 列出候选/生效/退役规则，支持晋升、强制晋升、降级、
  删除、review 与项目/全局切换；数据经 `/instinct` HTTP 路由与重新生成的 SDK 读取。
- 快捷记忆：会话中 `/remember <规则>` 写入带会话证据的候选；`POST /instinct` 同时支持脚本调用。
- 发布通道：安装脚本、npm launcher 与 `ymcode upgrade` 默认从 GitHub Releases 取二进制；
  FDS/npm 发布步骤由 `YMCODE_PUBLISH_FDS` / `YMCODE_PUBLISH_NPM` 仓库变量控制。
  仓库已公开，匿名安装可用；受限网络可配置 `YMCODE_RELEASE_BASE` 镜像。
- **v0.2.0 已发布**（2026-10-23）：仓库已公开，12 个平台 asset 上传到 GitHub Releases；
  Windows 安装脚本实测下载并运行 `ymcode --version` 返回 `0.2.0`。Actions 额度未恢复，
  本次为 C: 盘本机构建 + `gh release create` 手动发布。
- **v0.2.1 已发布**（2026-10-23，Actions 自动发布）：仓库公开后 Actions 恢复可用，
  `release.yml` 在 tag 上跑完门禁、测试、macOS 构建并自动上传 12 个 asset。
  本版包含 4 项修正：无凭据时不再默认 Xiaomi 模型、侧栏品牌改为 ymcode、
  删除不可用的 `/login` 与 MiMo 登录对话框、默认主题与 logo/agent 强调色统一为蓝色。
- **v0.2.2 / v0.2.3 / v0.2.4 已发布**（2026-10-23，Actions 自动发布）：
  v0.2.2 彻底移除 mimocode 兼容层；v0.2.3 新增 15 个 Anthropic 官方技能、
  技能中心与插件面板汉化、补齐斜杠命令描述，并支持 TTF/PDF/GZ 二进制技能资源；
  v0.2.4 新增中文写作、中文办公排版、系统化调试、代码审查、Git 工作流 5 个技能，
  内置技能达到 44 个。三次发布均为 12 个平台 asset。
- **与 mimocode 彻底解耦**：不再启动时迁移旧数据，不提供 `ymcode migrate`，
  不桥接 `MIMOCODE_*` 环境变量，也不回退读取 `.mimocode` 项目配置；内置文档技能
  已把 CLI 名称统一为 `ymcode`。运行时只认 ymcode 自己的目录。

未验证/未完成：

- `instinct-observer` 的真实 provider 抽取（需要隔离凭据；自动化测试使用 scripted SSE）。
- TUI 像素级人工视觉验收未做（自动化覆盖文本与主题色）。
- Windows plugin loader 测试按平台跳过（Bun 模块缓存锁目录 EBUSY，见 PROGRESS.md）。

## 一页约束

- Bun 固定 `1.3.14`；依赖用 `bun ci`，不要随意改 lockfile。
- 已发布的 `packages/cli/migration/*/migration.sql` 不再修改；新 schema 用新迁移目录。
- 第一方标识用 ymcode；Xiaomi MiMo provider/model、opencode 上游、`.opencode` 兼容根、第三方品牌保留。
- 代码标识符/内部日志英文；用户可见文案中文。
- 运行时数据目录完全独立：只使用 `~/.config/ymcode`、`~/.local/share/ymcode`、`~/.ymcode`，不读取或迁移旧 mimocode 内容；项目配置 `.ymcode/`。

## 快速开始

```bash
cd F:/AllProjects/ymcode
bun ci
bun run typecheck
bun run --cwd packages/cli build:local

# 离线构建（models.dev 不可达时）
cd packages/cli
MODELS_DEV_API_JSON=F:/AllProjects/ymcode/.scratch/ymcode-models.json \
  bun run script/build.ts --single --skip-install
```

运行：

```bash
packages/cli/dist/ymcode-windows-x64/bin/ymcode.exe
YMCODE_HOME=/tmp/example packages/cli/dist/ymcode-windows-x64/bin/ymcode.exe instinct list
```

## 下一步

优先做真实 provider 下的 observer 冒烟，再补 CLI help 与 Windows 测试清理。详见 [next-steps.md](next-steps.md)。

## 主题文件

- [context.md](context.md)
- [architecture.md](architecture.md)
- [instincts.md](instincts.md)
- [localization.md](localization.md)
- [build.md](build.md)
- [verification.md](verification.md)
- [decisions.md](decisions.md)
- [brand-boundary.md](brand-boundary.md)
- [next-steps.md](next-steps.md)
- [handoff.json](handoff.json)
- [continue-prompt.md](continue-prompt.md)
