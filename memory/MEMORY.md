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
- 汉化：70 个内置技能、54 个提示词/工具描述、核心 TUI 与 CLI（instinct/mcp）中文。
- 门禁与 Windows 构建通过；隔离环境端到端验证通过。
- 默认主题为蓝色系；小米 OAuth 登录已移除，Xiaomi/MiMo 入口保留并统一走 API Key。
- CLI `--help` 已全量汉化；小米条款弹窗与 `auth whoami` 已移除。
- TUI 蓝色主题、登录对话框有自动化测试；observer 抽取路径有 scripted-LLM 集成测试。
- instincts：配置阈值统一、observer 状态原子写、`last_seen_at` 稳定策略、export/import。
- `bun run upstream:diff` 可查看上游差异。
- `ymcode doctor` 检查运行时/路径/配置/凭据/搜索/数据库并给出修复建议；`ymcode setup`
  完成服务商、API Key 与默认模型的首次配置，TUI 首次无凭据启动会自动弹出服务商选择。
- instincts TUI 面板：`/instincts` 列出候选/生效/退役规则，支持晋升、强制晋升、降级、
  删除、review 与项目/全局切换；数据经 `/instinct` HTTP 路由与重新生成的 SDK 读取。

未验证/未完成：

- `instinct-observer` 的真实 provider 抽取（需要隔离凭据；自动化测试使用 scripted SSE）。
- TUI 像素级人工视觉验收未做（自动化覆盖文本与主题色）。
- Windows plugin loader 测试按平台跳过（Bun 模块缓存锁目录 EBUSY，见 PROGRESS.md）。

## 一页约束

- Bun 固定 `1.3.14`；依赖用 `bun ci`，不要随意改 lockfile。
- 已发布的 `packages/cli/migration/*/migration.sql` 不再修改；新 schema 用新迁移目录。
- 第一方标识用 ymcode；Xiaomi MiMo provider/model、opencode 上游、`.opencode` 兼容根、第三方品牌保留。
- 代码标识符/内部日志英文；用户可见文案中文。
- 运行时数据目录：`~/.config/ymcode`、`~/.local/share/ymcode`、`~/.ymcode`；项目配置 `.ymcode/`。
- 首次启动自动迁移旧 mimocode 数据；只复制，不删除旧目录。

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
- [migration.md](migration.md)
- [verification.md](verification.md)
- [decisions.md](decisions.md)
- [brand-boundary.md](brand-boundary.md)
- [next-steps.md](next-steps.md)
- [handoff.json](handoff.json)
- [continue-prompt.md](continue-prompt.md)
